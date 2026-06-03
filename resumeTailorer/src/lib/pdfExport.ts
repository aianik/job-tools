import { jsPDF } from 'jspdf'
import type { ResumeData, PdfFont, PdfSize } from '../types'

export type PdfOptions = { font: PdfFont; size: PdfSize }

// ── WOFF → TTF conversion ─────────────────────────────────────────────────────
// WOFF is just zlib-compressed TTF tables wrapped in a small header.
// We strip the wrapper and decompress each table to get raw TTF bytes.

async function zlibDecompress(data: Uint8Array): Promise<Uint8Array> {
  const cs = new DecompressionStream('deflate')
  // Start draining the readable BEFORE writing — prevents deadlock when
  // the output buffer fills up mid-write on large font tables.
  const collected = new Response(cs.readable).arrayBuffer()
  const writer = cs.writable.getWriter()
  await writer.write(data as unknown as Uint8Array<ArrayBuffer>)
  await writer.close()
  return new Uint8Array(await collected)
}

async function woffToTtf(woffBuf: ArrayBuffer): Promise<ArrayBuffer> {
  const v = new DataView(woffBuf)
  const flavor    = v.getUint32(4, false)
  const numTables = v.getUint16(12, false)

  type Entry = { tag: string; offset: number; compLen: number; origLen: number; checksum: number }
  const entries: Entry[] = []
  for (let i = 0; i < numTables; i++) {
    const b = 44 + i * 20
    entries.push({
      tag:      String.fromCharCode(v.getUint8(b), v.getUint8(b+1), v.getUint8(b+2), v.getUint8(b+3)),
      offset:   v.getUint32(b + 4, false),
      compLen:  v.getUint32(b + 8, false),
      origLen:  v.getUint32(b + 12, false),
      checksum: v.getUint32(b + 16, false),
    })
  }

  // Decompress each table
  const tables: Uint8Array[] = await Promise.all(entries.map(e => {
    const raw = new Uint8Array(woffBuf, e.offset, e.compLen)
    return e.compLen < e.origLen ? zlibDecompress(raw) : Promise.resolve(new Uint8Array(raw))
  }))

  // TTF header constants
  const n           = numTables
  const maxPow2     = Math.floor(Math.log2(n))
  const searchRange = Math.pow(2, maxPow2) * 16
  const TTF_HEAD    = 12 + n * 16  // offset table + table directory

  // Calculate table offsets (4-byte aligned)
  const offsets: number[] = []
  let cur = TTF_HEAD
  for (const t of tables) {
    if (cur % 4) cur += 4 - (cur % 4)
    offsets.push(cur)
    cur += t.length
    if (cur % 4) cur += 4 - (cur % 4)
  }

  const out    = new Uint8Array(cur)
  const outView = new DataView(out.buffer)

  // Write TTF offset table
  outView.setUint32(0,  flavor, false)
  outView.setUint16(4,  n, false)
  outView.setUint16(6,  searchRange, false)
  outView.setUint16(8,  maxPow2, false)
  outView.setUint16(10, n * 16 - searchRange, false)

  // Write table directory
  for (let i = 0; i < n; i++) {
    const b = 12 + i * 16
    for (let j = 0; j < 4; j++) out[b + j] = entries[i].tag.charCodeAt(j)
    outView.setUint32(b + 4,  entries[i].checksum, false)
    outView.setUint32(b + 8,  offsets[i], false)
    outView.setUint32(b + 12, tables[i].length, false)
  }

  // Write table data
  for (let i = 0; i < n; i++) out.set(tables[i], offsets[i])

  return out.buffer
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  const CHUNK = 8192
  let bin = ''
  for (let i = 0; i < bytes.length; i += CHUNK)
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  return btoa(bin)
}

// ── Font loading ──────────────────────────────────────────────────────────────
const fontCache = new Map<string, string>()

const FONT_FILES = [
  'CrimsonPro-Regular.woff',
  'CrimsonPro-Bold.woff',
  'CrimsonPro-Italic.woff',
  'CrimsonPro-BoldItalic.woff',
] as const

async function loadFont(filename: string): Promise<string> {
  if (fontCache.has(filename)) return fontCache.get(filename)!
  const url = `${import.meta.env.BASE_URL}fonts/${filename}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not load font ${filename} (${res.status})`)
  const buf    = await res.arrayBuffer()
  const ttfBuf = await woffToTtf(buf)
  const b64    = toBase64(ttfBuf)
  fontCache.set(filename, b64)
  return b64
}

// Call this right after a resume is generated so fonts are warm by export time.
export async function preloadFonts(): Promise<void> {
  await Promise.all(FONT_FILES.map(f => loadFont(f)))
}

async function registerCrimsonPro(doc: jsPDF) {
  const F = 'CrimsonPro'
  const [reg, bold, ital, boldItal] = await Promise.all([
    loadFont('CrimsonPro-Regular.woff'),
    loadFont('CrimsonPro-Bold.woff'),
    loadFont('CrimsonPro-Italic.woff'),
    loadFont('CrimsonPro-BoldItalic.woff'),
  ])
  doc.addFileToVFS('CP-Regular.ttf',    reg);      doc.addFont('CP-Regular.ttf',    F, 'normal')
  doc.addFileToVFS('CP-Bold.ttf',       bold);     doc.addFont('CP-Bold.ttf',       F, 'bold')
  doc.addFileToVFS('CP-Italic.ttf',     ital);     doc.addFont('CP-Italic.ttf',     F, 'italic')
  doc.addFileToVFS('CP-BoldItalic.ttf', boldItal); doc.addFont('CP-BoldItalic.ttf', F, 'bolditalic')
}

const FONT_NAME: Record<PdfFont, string> = {
  crimsonpro: 'CrimsonPro',
  times:      'times',
  helvetica:  'helvetica',
}

const SIZE_SCALE: Record<PdfSize, number> = {
  compact:  10 / 11,
  regular:  1,
  spacious: 12 / 11,
}

// ── Layout helpers ────────────────────────────────────────────────────────────
const PAGE_W = 216
const PAGE_H = 279
const M      = 20
const CW     = PAGE_W - M * 2
const BOTTOM = PAGE_H - M
const BASE_LH = 5.8

// Helpers are created as closures inside exportResumePdf to capture font/lh.

// ── Main export ───────────────────────────────────────────────────────────────
export async function exportResumePdf(
  resume: ResumeData,
  filename = 'resume.pdf',
  opts: PdfOptions = { font: 'crimsonpro', size: 'regular' }
) {
  const font = FONT_NAME[opts.font]
  const sc   = SIZE_SCALE[opts.size]
  const lh   = BASE_LH * sc
  const s    = (size: number) => size * sc  // scale a font size

  const doc = new jsPDF({ unit: 'mm', format: 'letter' })
  if (opts.font === 'crimsonpro') await registerCrimsonPro(doc)

  // Closures capturing font + lh
  const S = (style: string, size: number) => { doc.setFont(font, style); doc.setFontSize(s(size)) }
  const cp = (y: number, need = lh) => { if (y + need > BOTTOM) { doc.addPage(); return M } return y }
  const wt = (text: string, x: number, y: number, maxW: number) => {
    for (const ln of doc.splitTextToSize(text, maxW) as string[]) {
      y = cp(y); doc.text(ln, x, y); y += lh
    }
    return y
  }
  const rule = (y: number) => {
    doc.setDrawColor(210, 205, 200); doc.setLineWidth(0.12)
    doc.line(M, y, PAGE_W - M, y)
  }
  const secHead = (title: string, y: number) => {
    y = cp(y, lh * 3); S('bold', 10.5)
    doc.text(title.toUpperCase(), M, y)
    y += 2.8; rule(y)
    return y + 5.5
  }

  let y = M

  // Header
  S('bold', 20)
  const { header } = resume
  doc.text(header.name, PAGE_W / 2, y, { align: 'center' })
  y += 7.5

  const contactItems = [
    { label: header.phone,                        href: null },
    { label: header.email,                        href: header.email    ? `mailto:${header.email}` : null },
    { label: header.linkedin ? 'LinkedIn' : null, href: header.linkedin || null },
    { label: header.website  ? 'Website'  : null, href: header.website  || null },
    { label: header.location,                     href: null },
    { label: header.github   ? 'GitHub'   : null, href: header.github   || null },
  ].filter(i => i.label) as { label: string; href: string | null }[]

  S('normal', 10.5)
  const SEP  = '  ·  '
  const sepW = doc.getTextWidth(SEP)
  const totalW = contactItems.reduce((acc, it, i) =>
    acc + doc.getTextWidth(it.label) + (i < contactItems.length - 1 ? sepW : 0), 0)
  let cx = (PAGE_W - totalW) / 2
  const LINK_H = 3.8

  for (let i = 0; i < contactItems.length; i++) {
    const { label, href } = contactItems[i]
    const w = doc.getTextWidth(label)
    if (href) {
      doc.setTextColor(30, 80, 155)
      doc.text(label, cx, y)
      doc.link(cx, y - LINK_H, w, LINK_H, { url: href })
      doc.setTextColor(0, 0, 0)
    } else {
      doc.text(label, cx, y)
    }
    cx += w
    if (i < contactItems.length - 1) { doc.text(SEP, cx, y); cx += sepW }
  }
  y += 7

  // Summary
  if (resume.summary) {
    y = secHead('Summary', y)
    S('normal', 11); y = wt(resume.summary, M, y, CW); y += 3
  }

  for (const section of resume.sections) {
    y = secHead(section.title, y)

    if (section.type === 'experience') {
      for (const item of section.items) {
        y = cp(y, lh * 2)
        S('bold', 11.5); doc.text(item.role, M, y)
        S('normal', 10.5); doc.text(item.dates, PAGE_W - M, y, { align: 'right' })
        y += lh - 0.5
        y = cp(y); S('italic', 11); doc.text(`${item.company}, ${item.location}`, M, y)
        y += lh
        S('normal', 11)
        for (const b of item.bullets) { y = cp(y); doc.text('•', M + 1.5, y); y = wt(b, M + 5, y, CW - 5) }
        y += 2
      }

    } else if (section.type === 'education') {
      for (const item of section.items) {
        y = cp(y, lh * 2)
        S('bold', 11.5); doc.text(item.institution, M, y)
        S('normal', 10.5); doc.text(item.dates, PAGE_W - M, y, { align: 'right' })
        y += lh - 0.5
        y = cp(y); S('italic', 11); doc.text(`${item.degree}, ${item.location}`, M, y)
        y += lh
        if (item.notes?.length) {
          S('normal', 11)
          for (const n of item.notes) { y = cp(y); doc.text('•', M + 1.5, y); y = wt(n, M + 5, y, CW - 5) }
        }
        y += 2
      }

    } else if (section.type === 'skills') {
      for (const cat of section.categories) {
        y = cp(y)
        S('bold', 11); doc.text(`${cat.label}: `, M, y)
        const lw = doc.getTextWidth(`${cat.label}: `)
        S('normal', 11)
        const all   = cat.items.join(', ')
        const first = (doc.splitTextToSize(all, CW - lw) as string[])[0]
        doc.text(first, M + lw, y); y += lh
        const rest = all.slice(first.length).replace(/^[,\s]+/, '')
        if (rest) y = wt(rest, M, y, CW)
      }

    } else if (section.type === 'projects') {
      for (const item of section.items) {
        y = cp(y, lh * 2)
        S('bold', 11.5)
        const ns = item.tech ? `${item.name}  |  ` : item.name
        doc.text(ns, M, y)
        if (item.tech) { S('italic', 11.5); doc.text(item.tech, M + doc.getTextWidth(ns), y) }
        if (item.dates) { S('normal', 10.5); doc.text(item.dates, PAGE_W - M, y, { align: 'right' }) }
        y += lh
        S('normal', 11)
        for (const b of item.bullets) { y = cp(y); doc.text('•', M + 1.5, y); y = wt(b, M + 5, y, CW - 5) }
        y += 2
      }

    } else if (section.type === 'publications') {
      S('normal', 11)
      for (const item of section.items) { y = cp(y); doc.text('•', M + 1.5, y); y = wt(item.citation, M + 5, y, CW - 5); y += 1 }

    } else if (section.type === 'custom') {
      S('normal', 11)
      for (const ln of section.content.split('\n').filter(Boolean)) { y = cp(y); doc.text('•', M + 1.5, y); y = wt(ln, M + 5, y, CW - 5) }
    }

    y += 3
  }

  // Trigger download via blob URL — more reliable than doc.save() after async awaits
  const blob = doc.output('blob')
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

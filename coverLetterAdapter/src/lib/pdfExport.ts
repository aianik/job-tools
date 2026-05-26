import { jsPDF } from 'jspdf'
import type { PdfAlign } from '../types'

const FS = 'https://cdn.jsdelivr.net/npm/@fontsource'

export const PDF_FONTS: Record<string, { label: string; slug: string; name: string }> = {
  'crimson-pro':       { label: 'Crimson Pro',        slug: 'crimson-pro',        name: 'CrimsonPro' },
  'linux-libertine':   { label: 'Linux Libertine',    slug: 'linux-libertine',    name: 'LinuxLibertine' },
  'eb-garamond':       { label: 'EB Garamond',        slug: 'eb-garamond',        name: 'EBGaramond' },
  'cormorant':         { label: 'Cormorant Garamond', slug: 'cormorant-garamond', name: 'Cormorant' },
  'libre-baskerville': { label: 'Libre Baskerville',  slug: 'libre-baskerville',  name: 'LibreBaskerville' },
}

const FONTSOURCE_URLS: Record<string, { normal: string; bold?: string; italic?: string; bolditalic?: string }> = {
  'crimson-pro': {
    normal:     `${FS}/crimson-pro/files/crimson-pro-latin-400-normal.woff`,
    bold:       `${FS}/crimson-pro/files/crimson-pro-latin-600-normal.woff`,
    italic:     `${FS}/crimson-pro/files/crimson-pro-latin-400-italic.woff`,
    bolditalic: `${FS}/crimson-pro/files/crimson-pro-latin-600-italic.woff`,
  },
  'eb-garamond': {
    normal:     `${FS}/eb-garamond/files/eb-garamond-latin-400-normal.woff`,
    bold:       `${FS}/eb-garamond/files/eb-garamond-latin-700-normal.woff`,
    italic:     `${FS}/eb-garamond/files/eb-garamond-latin-400-italic.woff`,
    bolditalic: `${FS}/eb-garamond/files/eb-garamond-latin-700-italic.woff`,
  },
  'cormorant': {
    normal:     `${FS}/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff`,
    bold:       `${FS}/cormorant-garamond/files/cormorant-garamond-latin-700-normal.woff`,
    italic:     `${FS}/cormorant-garamond/files/cormorant-garamond-latin-400-italic.woff`,
    bolditalic: `${FS}/cormorant-garamond/files/cormorant-garamond-latin-700-italic.woff`,
  },
  'libre-baskerville': {
    normal:     `${FS}/libre-baskerville/files/libre-baskerville-latin-400-normal.woff`,
    bold:       `${FS}/libre-baskerville/files/libre-baskerville-latin-700-normal.woff`,
    italic:     `${FS}/libre-baskerville/files/libre-baskerville-latin-400-italic.woff`,
  },
}

let _fontCaches: Record<string, string> = {}
let _activeFontName = 'CrimsonPro'

export function bustFontCache(): void {
  _fontCaches = {}
}

function ab2b64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let str = ''
  for (let i = 0; i < bytes.length; i += 8192)
    str += String.fromCharCode(...Array.from(bytes.subarray(i, Math.min(i + 8192, bytes.length))))
  return btoa(str)
}

async function woffToSfnt(buf: ArrayBuffer): Promise<ArrayBuffer> {
  const view = new DataView(buf)
  const bytes = new Uint8Array(buf)
  if (view.getUint32(0) !== 0x774F4646) return buf
  const sfVersion = view.getUint32(4)
  const numTables = view.getUint16(12)
  const tables: { tag: string; offset: number; compLen: number; origLen: number; checksum: number }[] = []
  for (let i = 0; i < numTables; i++) {
    const o = 44 + i * 20
    tables.push({
      tag: String.fromCharCode(bytes[o], bytes[o+1], bytes[o+2], bytes[o+3]),
      offset: view.getUint32(o+4), compLen: view.getUint32(o+8),
      origLen: view.getUint32(o+12), checksum: view.getUint32(o+16),
    })
  }
  const data = await Promise.all(tables.map(async t => {
    const chunk = bytes.slice(t.offset, t.offset + t.compLen)
    if (t.compLen === t.origLen) return chunk
    const ds = new DecompressionStream('deflate')
    const w = ds.writable.getWriter(); w.write(chunk); w.close()
    const parts: Uint8Array[] = []; const r = ds.readable.getReader()
    for (;;) { const { done, value } = await r.read(); if (done) break; parts.push(value) }
    const out = new Uint8Array(t.origLen); let pos = 0
    for (const p of parts) { out.set(p, pos); pos += p.length }
    return out
  }))
  let ptr = 12 + numTables * 16
  const offsets = data.map(d => { const o = ptr; ptr += Math.ceil(d.length / 4) * 4; return o })
  const n = numTables
  const sr = Math.pow(2, Math.floor(Math.log2(n))) * 16
  const es = Math.floor(Math.log2(n))
  const rs = n * 16 - sr
  const out = new ArrayBuffer(ptr)
  const ov = new DataView(out); const ob = new Uint8Array(out)
  ov.setUint32(0, sfVersion); ov.setUint16(4, n)
  ov.setUint16(6, sr); ov.setUint16(8, es); ov.setUint16(10, rs)
  let dir = 12
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < 4; j++) ob[dir+j] = tables[i].tag.charCodeAt(j)
    ov.setUint32(dir+4, tables[i].checksum)
    ov.setUint32(dir+8, offsets[i])
    ov.setUint32(dir+12, tables[i].origLen)
    dir += 16
  }
  for (let i = 0; i < n; i++) ob.set(data[i], offsets[i])
  return out
}

export async function loadPdfFont(doc: jsPDF, fontKey: string): Promise<void> {
  const font = PDF_FONTS[fontKey] || PDF_FONTS['crimson-pro']
  const sources = FONTSOURCE_URLS[fontKey]

  async function fetchVariant(url: string | undefined, style: string): Promise<boolean> {
    if (!url) return false
    const cacheKey = `fs__${fontKey}__${style}`
    let b64 = _fontCaches[cacheKey]
    if (!b64) {
      const res = await fetch(url)
      if (!res.ok) return false
      b64 = ab2b64(await woffToSfnt(await res.arrayBuffer()))
      _fontCaches[cacheKey] = b64
    }
    const fname = `${font.name}_${style}.ttf`
    doc.addFileToVFS(fname, b64)
    doc.addFont(fname, font.name, style)
    return true
  }

  async function fetchVariantCdnfonts(css: string, bold: boolean, italic: boolean, style: string): Promise<boolean> {
    const cacheKey = `cdnf__${font.slug}__${style}`
    let b64 = _fontCaches[cacheKey]
    if (!b64) {
      const blocks = css.split('@font-face').slice(1)
      let url: string | null = null
      for (const ext of ['ttf', 'otf', 'woff']) {
        for (const block of blocks) {
          const blkItalic = /font-style\s*:\s*italic/i.test(block)
          const blkBold = /font-weight\s*:\s*(bold(?:er)?|[6-9]\d\d)/i.test(block)
          if (blkItalic !== italic || blkBold !== bold) continue
          const m = new RegExp(`url\\(['"]?([^'"\\s)]+\\.${ext})['"]?\\)`, 'i').exec(block)
          if (m) { url = m[1]; break }
        }
        if (url) break
      }
      if (!url) return false
      const res = await fetch(url)
      if (!res.ok) return false
      b64 = ab2b64(await woffToSfnt(await res.arrayBuffer()))
      _fontCaches[cacheKey] = b64
    }
    const fname = `${font.name}_${style}.ttf`
    doc.addFileToVFS(fname, b64)
    doc.addFont(fname, font.name, style)
    return true
  }

  try {
    let ok: boolean
    if (sources) {
      ok = await fetchVariant(sources.normal, 'normal')
      if (!ok) throw new Error('Regular variant not found')
      await Promise.allSettled([
        fetchVariant(sources.bold, 'bold'),
        fetchVariant(sources.italic, 'italic'),
        fetchVariant(sources.bolditalic, 'bolditalic'),
      ])
    } else {
      const cssRes = await fetch(`https://fonts.cdnfonts.com/css/${font.slug}`)
      const css = await cssRes.text()
      ok = await fetchVariantCdnfonts(css, false, false, 'normal')
      if (!ok) throw new Error('Regular variant not found')
      await Promise.allSettled([
        fetchVariantCdnfonts(css, true, false, 'bold'),
        fetchVariantCdnfonts(css, false, true, 'italic'),
        fetchVariantCdnfonts(css, true, true, 'bolditalic'),
      ])
    }
    doc.setFont(font.name, 'normal')
    _activeFontName = font.name
  } catch (e) {
    console.warn(`${font.label} unavailable, using Times:`, (e as Error).message)
    doc.setFont('times', 'normal')
    _activeFontName = 'times'
  }
}

function setDocFont(doc: jsPDF, bold: boolean, italic: boolean): void {
  const style = bold && italic ? 'bolditalic' : bold ? 'bold' : italic ? 'italic' : 'normal'
  try { doc.setFont(_activeFontName, style) }
  catch { doc.setFont('times', style) }
}

interface TextRun { text: string; bold: boolean; italic: boolean; underline: boolean }
interface LayoutWord extends TextRun { w: number; spW: number }
interface LayoutLine { words: LayoutWord[]; isLast: boolean }

function domRuns(pEl: Element): TextRun[] {
  const runs: TextRun[] = []
  function walk(node: Node, b: boolean, i: boolean, u: boolean): void {
    if (node.nodeType === 3) {
      if (node.textContent) runs.push({ text: node.textContent, bold: b, italic: i, underline: u })
      return
    }
    const t = (node as Element).nodeName.toLowerCase()
    if (t === 'br') { runs.push({ text: '\n', bold: b, italic: i, underline: u }); return }
    const nb = b || t === 'b' || t === 'strong'
    const ni = i || t === 'i' || t === 'em'
    const nu = u || t === 'u'
    for (const c of node.childNodes) walk(c, nb, ni, nu)
  }
  walk(pEl, false, false, false)
  return runs
}

type Token =
  | { text: string; bold: boolean; italic: boolean; underline: boolean }
  | { br: true }
  | { sp: true }

function layoutRunsToLines(doc: jsPDF, runs: TextRun[], contentW: number): LayoutLine[] {
  const tokens: Token[] = []
  for (const run of runs) {
    const parts = run.text.split('\n')
    for (let pi = 0; pi < parts.length; pi++) {
      if (pi > 0) tokens.push({ br: true })
      const wds = parts[pi].split(' ')
      for (let wi = 0; wi < wds.length; wi++) {
        if (wi > 0) tokens.push({ sp: true })
        if (wds[wi]) tokens.push({ text: wds[wi], bold: run.bold, italic: run.italic, underline: run.underline })
      }
    }
  }
  const lines: LayoutLine[] = []
  let cur: LayoutWord[] = [], curW = 0, pendingSpace = false

  function flush(isLast: boolean): void {
    if (cur.length) lines.push({ words: cur, isLast })
    cur = []; curW = 0
  }

  for (const tk of tokens) {
    if ('br' in tk) { flush(true); pendingSpace = false; continue }
    if ('sp' in tk) { pendingSpace = true; continue }
    setDocFont(doc, tk.bold, tk.italic)
    const w = doc.getTextWidth(tk.text)
    const sw = pendingSpace && cur.length ? doc.getTextWidth(' ') : 0
    if (cur.length && curW + sw + w > contentW + 0.01) {
      flush(false)
      cur.push({ ...tk, w, spW: 0 }); curW = w
    } else {
      cur.push({ ...tk, w, spW: sw }); curW += sw + w
    }
    pendingSpace = false
  }
  flush(true)
  return lines
}

function renderLinePDF(doc: jsPDF, line: LayoutLine, marginX: number, y: number, contentW: number, pdfAlign: PdfAlign): void {
  const words = line.words
  const xPos: number[] = []
  if (pdfAlign === 'justify' && !line.isLast && words.length > 1) {
    const totalW = words.reduce((s, w) => s + w.w, 0)
    const gap = (contentW - totalW) / (words.length - 1)
    let cx = marginX
    for (let i = 0; i < words.length; i++) { xPos.push(cx); cx += words[i].w + gap }
  } else {
    const lineW = words.reduce((s, w) => s + w.w + w.spW, 0)
    let cx = pdfAlign === 'center' ? marginX + (contentW - lineW) / 2
           : pdfAlign === 'right'  ? marginX + contentW - lineW
           : marginX
    for (let i = 0; i < words.length; i++) { cx += words[i].spW; xPos.push(cx); cx += words[i].w }
  }
  for (let i = 0; i < words.length; i++) {
    setDocFont(doc, words[i].bold, words[i].italic)
    doc.text(words[i].text, xPos[i], y)
  }
  doc.setLineWidth(0.25)
  doc.setDrawColor(28, 28, 28)
  let i = 0
  while (i < words.length) {
    if (!words[i].underline) { i++; continue }
    const segStart = xPos[i]
    let j = i
    while (j + 1 < words.length && words[j + 1].underline) j++
    doc.line(segStart, y + 1, xPos[j] + words[j].w, y + 1)
    i = j + 1
  }
}

export interface SavePdfOptions {
  letterDocEl: HTMLElement
  pdfFontKey: string
  pdfFontSize: number
  pdfAlign: PdfAlign
  companyName: string
  signature: string
}

export async function savePDF(opts: SavePdfOptions): Promise<void> {
  const { letterDocEl, pdfFontKey, pdfFontSize, pdfAlign, companyName, signature } = opts
  const doc = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'portrait' })
  const marginX = 25.4, marginTop = 25.4, marginBottom = 17.78
  const pageW = 215.9, pageH = 279.4
  const contentW = pageW - 2 * marginX
  const fontSize = pdfFontSize
  await loadPdfFont(doc, pdfFontKey)
  doc.setFontSize(fontSize)
  const lineH = fontSize * 0.3528 * 1.65
  const paraGap = lineH * 0.75
  let y = marginTop

  const paras = Array.from(letterDocEl.querySelectorAll('p')).filter(p => (p as HTMLElement).innerText.trim())
  for (let i = 0; i < paras.length; i++) {
    const p = paras[i]
    if (p.classList.contains('signoff')) y += lineH
    const lines = layoutRunsToLines(doc, domRuns(p), contentW)
    doc.setFontSize(fontSize)
    for (const line of lines) {
      if (y + lineH > pageH - marginBottom) { doc.addPage(); y = marginTop }
      renderLinePDF(doc, line, marginX, y, contentW, pdfAlign)
      y += lineH
    }
    if (i < paras.length - 1) y += paraGap
  }

  const safeName = companyName
    ? companyName.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '')
    : 'company'
  const sigLines = signature.trim().split('\n').map(l => l.trim()).filter(Boolean)
  const nameLine = sigLines.find(l =>
    !/^(sincerely|regards|best|thank|yours)/i.test(l) && !l.includes('@') && !l.includes('|')
  )
  const lastName = nameLine ? (nameLine.trim().split(/\s+/).pop()?.toLowerCase() ?? 'user') : 'user'
  doc.save(`cover_letter_${lastName}_${safeName}.pdf`)
}

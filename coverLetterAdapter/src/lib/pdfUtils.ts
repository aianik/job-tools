import * as pdfjsLib from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

export function ab2b64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let str = ''
  for (let i = 0; i < bytes.length; i += 8192)
    str += String.fromCharCode(...Array.from(bytes.subarray(i, Math.min(i + 8192, bytes.length))))
  return btoa(str)
}

export async function extractPdfText(arrayBuffer: ArrayBuffer): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let fullText = ''
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    let lastY: number | null = null, pageText = ''
    for (const item of content.items) {
      if ('str' in item) {
        const y = (item.transform as number[])[5]
        if (lastY !== null && Math.abs(y - lastY) > 3) pageText += '\n'
        pageText += item.str
        lastY = y
      }
    }
    fullText += pageText.trim() + '\n\n'
  }
  return fullText.trim()
}

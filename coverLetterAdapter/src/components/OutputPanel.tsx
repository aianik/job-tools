import { useState, useEffect, useRef } from 'react'
import type { PdfAlign } from '../types'
import FormatBar from './FormatBar'

const WC_MIN = 350, WC_MAX = 420

interface Props {
  letterDocRef: React.RefObject<HTMLDivElement | null>
  pdfAlign: PdfAlign
  onAlignChange: (align: PdfAlign) => void
  onSavePdf: () => Promise<void>
  onToggleSource: () => void
  onSnapshot: (html: string) => void
  onUndo: () => void
  onReset: () => void
  onToast: (msg: string, type?: 'ok' | 'err') => void
}

export default function OutputPanel({ letterDocRef, pdfAlign, onAlignChange, onSavePdf, onToggleSource, onSnapshot, onUndo, onReset, onToast }: Props) {
  const [wordCount, setWordCount] = useState(0)
  const [hasLetter, setHasLetter] = useState(false)
  const [copied, setCopied] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const snapshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSnapshotRef = useRef<string>('')
  const hasSource = !!(localStorage.getItem('base_letter')?.trim() || localStorage.getItem('cv_text')?.trim())

  useEffect(() => {
    const el = letterDocRef.current
    if (!el) return
    const handler = () => {
      const text = el.innerText.trim()
      const hasContent = !!text && !el.querySelector('.empty-state')
      setHasLetter(hasContent)
      if (!hasContent) { setWordCount(0); return }
      setWordCount(text.split(/\s+/).filter(Boolean).length)
      const html = el.innerHTML
      if (html !== lastSnapshotRef.current) {
        if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current)
        snapshotTimerRef.current = setTimeout(() => {
          onSnapshot(lastSnapshotRef.current || html)
          lastSnapshotRef.current = html
        }, 500)
      }
    }
    el.addEventListener('input', handler)
    return () => {
      el.removeEventListener('input', handler)
      if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current)
    }
  }, [letterDocRef])

  const inRange = wordCount >= WC_MIN && wordCount <= WC_MAX
  const over = wordCount > WC_MAX
  const pct = Math.min(wordCount / WC_MAX, 1.15) / 1.15 * 100

  async function handleCopy() {
    const el = letterDocRef.current
    if (!el) return
    const text = el.innerText.trim()
    if (!text || el.querySelector('.empty-state')) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      onToast('Could not copy to clipboard.', 'err')
    }
  }

  async function handleSavePdf() {
    const el = letterDocRef.current
    if (!el || !el.innerText.trim() || el.querySelector('.empty-state')) {
      onToast('Generate a letter first before saving as PDF.', 'err')
      return
    }
    setPdfBusy(true)
    try {
      await onSavePdf()
    } finally {
      setPdfBusy(false)
    }
  }

  return (
    <section className="panel panel-right" aria-label="Adapted letter output">
      <div className="panel-header">
        <span className="panel-title">Adapted Letter</span>
        <div className="panel-rule" aria-hidden="true" />
        <button className={`btn-copy${copied ? ' copied' : ''}`} onClick={handleCopy} aria-label="Copy letter to clipboard">
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
        <button className="btn-subtle" onClick={handleSavePdf} disabled={pdfBusy} aria-label="Save as PDF">
          {pdfBusy ? '⏳ Generating…' : '⬇ Export PDF'}
        </button>
      </div>

      <div className="output-actions">
        <div className="word-meter" aria-live="polite" aria-label="Word count">
          <div className={`word-bar${hasLetter ? ' visible' : ''}`} aria-hidden="true">
            <div
              className={`word-bar-fill${inRange ? ' in-range' : over ? ' over' : ''}`}
              style={{ width: hasLetter ? `${pct}%` : '0%' }}
            />
          </div>
          <span className={`word-count-text${inRange ? ' in-range' : over ? ' over' : ''}`}>
            {hasLetter ? `${wordCount} words` : ''}
          </span>
        </div>
      </div>

      <div className="letter-doc-wrap">
        <div className="format-bar-center">
          <FormatBar pdfAlign={pdfAlign} letterDocRef={letterDocRef} onAlignChange={onAlignChange} onUndo={onUndo} onReset={onReset} hasLetter={hasLetter} />
        </div>
        <div
        ref={letterDocRef}
        className="letter-doc"
        contentEditable
        spellCheck
        role="textbox"
        aria-multiline
        aria-label="Adapted cover letter — editable"
        suppressContentEditableWarning
      >
        <div className="empty-state">
          <div className="empty-icon" aria-hidden="true">✉</div>
          <div className="empty-steps" aria-label="Steps to generate a letter">
            <div className={`empty-step${hasSource ? ' empty-step--done' : ' empty-step--active'}`}>
              <div className="empty-n">{hasSource ? '✓' : '1'}</div>
              <span className="empty-step-text">
                {hasSource ? 'Source ready' : (
                  <button className="empty-step-link" onClick={onToggleSource}>
                    Open Source → add your letter or CV
                  </button>
                )}
              </span>
            </div>
            <div className="empty-step-arrow" aria-hidden="true">↓</div>
            <div className="empty-step">
              <div className="empty-n">{hasSource ? '2' : '2'}</div>
              <span className="empty-step-text">Paste a job posting on the left</span>
            </div>
            <div className="empty-step-arrow" aria-hidden="true">↓</div>
            <div className="empty-step">
              <div className="empty-n">3</div>
              <span className="empty-step-text">Click Adapt My Cover Letter</span>
            </div>
            <div className="empty-step-arrow" aria-hidden="true">↓</div>
            <div className="empty-step">
              <div className="empty-n">4</div>
              <span className="empty-step-text">Edit here, then save as PDF</span>
            </div>
          </div>
        </div>
      </div>
        {hasLetter && (
          <div className="editable-hint" aria-hidden="true">Click anywhere in the letter to edit</div>
        )}
      </div>
    </section>
  )
}

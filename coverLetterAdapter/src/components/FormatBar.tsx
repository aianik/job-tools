import { useState, useEffect } from 'react'
import type { PdfAlign } from '../types'

interface Props {
  pdfAlign: PdfAlign
  letterDocRef: React.RefObject<HTMLDivElement | null>
  onAlignChange: (align: PdfAlign) => void
  onUndo: () => void
  onReset: () => void
  hasLetter: boolean
}

export default function FormatBar({ pdfAlign, letterDocRef, onAlignChange, onUndo, onReset, hasLetter }: Props) {
  const [bold, setBold] = useState(false)
  const [italic, setItalic] = useState(false)
  const [underline, setUnderline] = useState(false)

  useEffect(() => {
    function updateState() {
      const sel = window.getSelection()
      const el = letterDocRef.current
      if (sel && el && el.contains(sel.anchorNode)) {
        setBold(document.queryCommandState('bold'))
        setItalic(document.queryCommandState('italic'))
        setUnderline(document.queryCommandState('underline'))
      }
    }
    document.addEventListener('selectionchange', updateState)
    return () => document.removeEventListener('selectionchange', updateState)
  }, [letterDocRef])

  function applyFormat(e: React.MouseEvent, cmd: string) {
    e.preventDefault()
    document.execCommand(cmd, false, undefined)
    setBold(document.queryCommandState('bold'))
    setItalic(document.queryCommandState('italic'))
    setUnderline(document.queryCommandState('underline'))
  }

  function handleAlign(align: PdfAlign) {
    onAlignChange(align)
    if (letterDocRef.current) letterDocRef.current.style.textAlign = align
  }

  return (
    <div className="format-bar">
      <div className="fmt-group" role="toolbar" aria-label="Text formatting">
        <button className={`fmt-btn fmt-text${bold ? ' active' : ''}`} onMouseDown={e => applyFormat(e, 'bold')} title="Bold (Ctrl+B)"><b>Bold</b></button>
        <button className={`fmt-btn fmt-text${italic ? ' active' : ''}`} onMouseDown={e => applyFormat(e, 'italic')} title="Italic (Ctrl+I)"><i>Italic</i></button>
        <button className={`fmt-btn fmt-text${underline ? ' active' : ''}`} onMouseDown={e => applyFormat(e, 'underline')} title="Underline (Ctrl+U)"><u>Underline</u></button>
      </div>
      <div className="fmt-sep" aria-hidden="true" />
      <div className="fmt-group" role="group" aria-label="Text alignment">
        <button className={`fmt-btn fmt-icon${pdfAlign === 'left' ? ' active' : ''}`} onClick={() => handleAlign('left')} title="Align left">
          <svg width="14" height="11" viewBox="0 0 14 11" fill="currentColor" aria-hidden="true"><rect x="0" y="0" width="14" height="2" rx="1"/><rect x="0" y="4.5" width="9" height="2" rx="1"/><rect x="0" y="9" width="12" height="2" rx="1"/></svg>
        </button>
        <button className={`fmt-btn fmt-icon${pdfAlign === 'center' ? ' active' : ''}`} onClick={() => handleAlign('center')} title="Center text">
          <svg width="14" height="11" viewBox="0 0 14 11" fill="currentColor" aria-hidden="true"><rect x="0" y="0" width="14" height="2" rx="1"/><rect x="2.5" y="4.5" width="9" height="2" rx="1"/><rect x="1" y="9" width="12" height="2" rx="1"/></svg>
        </button>
        <button className={`fmt-btn fmt-icon${pdfAlign === 'right' ? ' active' : ''}`} onClick={() => handleAlign('right')} title="Align right">
          <svg width="14" height="11" viewBox="0 0 14 11" fill="currentColor" aria-hidden="true"><rect x="0" y="0" width="14" height="2" rx="1"/><rect x="5" y="4.5" width="9" height="2" rx="1"/><rect x="2" y="9" width="12" height="2" rx="1"/></svg>
        </button>
        <button className={`fmt-btn fmt-icon${pdfAlign === 'justify' ? ' active' : ''}`} onClick={() => handleAlign('justify')} title="Justify text">
          <svg width="14" height="11" viewBox="0 0 14 11" fill="currentColor" aria-hidden="true"><rect x="0" y="0" width="14" height="2" rx="1"/><rect x="0" y="4.5" width="14" height="2" rx="1"/><rect x="0" y="9" width="14" height="2" rx="1"/></svg>
        </button>
      </div>
      <div className="fmt-sep" aria-hidden="true" />
      <div className="fmt-group" role="group" aria-label="History">
        <button className="fmt-btn fmt-text" onClick={onUndo} disabled={!hasLetter} title="Undo last change">Undo</button>
        <span className="fmt-inner-sep" aria-hidden="true" />
        <button className="fmt-btn fmt-text" onClick={onReset} disabled={!hasLetter} title="Reset to last generated version">Reset</button>
      </div>
    </div>
  )
}

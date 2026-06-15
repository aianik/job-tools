import { useEffect, useState } from 'react'
import type { PdfFont, PdfSize } from '../types'
import { PDF_FONTS } from '../lib/pdfExport'

type Props = {
  open: boolean
  onClose: () => void
  apiKey: string
  onApiKeyChange: (k: string) => void
  pdfFont: PdfFont
  onPdfFontChange: (f: PdfFont) => void
  pdfSize: PdfSize
  onPdfSizeChange: (s: PdfSize) => void
}

const FONTS = (Object.entries(PDF_FONTS) as [PdfFont, { label: string }][]).map(
  ([value, { label }]) => ({ value, label })
)

const SIZES: { value: PdfSize; label: string }[] = [
  { value: 'compact',  label: 'Compact (10 pt)' },
  { value: 'regular',  label: 'Regular (11 pt)' },
  { value: 'spacious', label: 'Spacious (12 pt)' },
]

export default function SettingsDrawer({ open, onClose, apiKey, onApiKeyChange, pdfFont, onPdfFontChange, pdfSize, onPdfSizeChange }: Props) {
  const [localKey, setLocalKey] = useState(apiKey)

  useEffect(() => { setLocalKey(apiKey) }, [apiKey])

  function save() {
    onApiKeyChange(localKey.trim())
    onClose()
  }

  return (
    <>
      {open && <div className="drawer-backdrop" onClick={onClose} />}
      <div className={`drawer drawer-right ${open ? 'drawer--open' : ''}`}>
        <div className="drawer-header">
          <span className="drawer-title">Settings</span>
          <button className="drawer-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="drawer-body">
          <label className="field-label">Anthropic API Key</label>
          <input
            type="password"
            className="field-input"
            placeholder="sk-ant-..."
            value={localKey}
            onChange={e => setLocalKey(e.target.value)}
            autoComplete="off"
          />
          <p className="field-hint">
            Stored only in your browser. Never leaves your device except to call the Anthropic API.{' '}
            <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">Get a key</a>.
          </p>
          <button className="btn-primary" onClick={save}>Save Key</button>

          <div style={{ borderTop: '1px solid var(--b1)', margin: '16px 0' }} />

          <label className="field-label">PDF Font</label>
          <div className="seg-control" style={{ flexDirection: 'column', gap: 4, padding: 0, background: 'none' }}>
            {FONTS.map(f => (
              <button
                key={f.value}
                className={`settings-option ${pdfFont === f.value ? 'settings-option--active' : ''}`}
                onClick={() => onPdfFontChange(f.value)}
              >
                <span className="settings-option-label">{f.label}</span>
              </button>
            ))}
          </div>

          <label className="field-label" style={{ marginTop: 14 }}>PDF Size</label>
          <div className="seg-control">
            {SIZES.map(s => (
              <button
                key={s.value}
                className={`seg-btn ${pdfSize === s.value ? 'seg-btn--active' : ''}`}
                onClick={() => onPdfSizeChange(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

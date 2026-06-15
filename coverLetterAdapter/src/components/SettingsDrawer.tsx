import { useState } from 'react'
import { jsPDF } from 'jspdf'
import { PDF_FONTS, loadPdfFont, bustFontCache } from '../lib/pdfExport'

interface Props {
  open: boolean
  apiKey: string
  pdfFontKey: string
  pdfFontSize: number
  onClose: () => void
  onSaveKey: (key: string) => void
  onClearKey: () => void
  onChangePdfFont: (key: string) => void
  onChangePdfSize: (size: number) => void
  onToast: (msg: string, type?: 'ok' | 'err') => void
}

const FONTS = Object.entries(PDF_FONTS).map(([value, { label }]) => ({ value, label }))

const SIZES = [
  { value: 10,   label: '10 pt'   },
  { value: 10.5, label: '10.5 pt' },
  { value: 11,   label: '11 pt'   },
  { value: 11.5, label: '11.5 pt' },
  { value: 12,   label: '12 pt'   },
]

export default function SettingsDrawer({
  open, apiKey, pdfFontKey, pdfFontSize,
  onClose, onSaveKey, onClearKey, onChangePdfFont, onChangePdfSize, onToast,
}: Props) {
  const [localKey, setLocalKey] = useState(apiKey)

  function handleSave() {
    const key = localKey.trim()
    if (!key) return
    onSaveKey(key)
    onToast('API key saved', 'ok')
    setTimeout(onClose, 900)
  }

  function handleClear() {
    if (!confirm('Clear your saved API key?')) return
    onClearKey()
    setLocalKey('')
    onToast('API key cleared', 'ok')
  }

  function handleFontChange(value: string) {
    if (value !== pdfFontKey) bustFontCache()
    onChangePdfFont(value)
    localStorage.setItem('pdf_font', value)
    onToast(`PDF: ${PDF_FONTS[value]?.label ?? value}, ${pdfFontSize} pt`, 'ok')
    setTimeout(async () => {
      try { await loadPdfFont(new jsPDF(), value) } catch (_) {}
    }, 0)
  }

  function handleSizeChange(size: number) {
    onChangePdfSize(size)
    localStorage.setItem('pdf_size', String(size))
    onToast(`PDF: ${PDF_FONTS[pdfFontKey]?.label ?? pdfFontKey}, ${size} pt`, 'ok')
  }

  return (
    <>
      {open && <div className="drawer-backdrop" onClick={onClose} />}
      <div className={`drawer drawer-right${open ? ' open' : ''}`} aria-label="Settings">
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
            onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="field-hint">
            Stored only in your browser. Never leaves your device except to call the Anthropic API.{' '}
            <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">Get a key</a>.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={handleSave}>Save Key</button>
            {apiKey && (
              <button className="btn-subtle" onClick={handleClear}>Clear</button>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--b1)', margin: '8px 0' }} />

          <label className="field-label">PDF Font</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {FONTS.map(f => (
              <button
                key={f.value}
                className={`settings-option${pdfFontKey === f.value ? ' settings-option--active' : ''}`}
                onClick={() => handleFontChange(f.value)}
              >
                <span className="settings-option-label">{f.label}</span>
              </button>
            ))}
          </div>

          <label className="field-label" style={{ marginTop: 8 }}>PDF Size</label>
          <div className="seg-control" style={{ flexWrap: 'wrap' }}>
            {SIZES.map(s => (
              <button
                key={s.value}
                className={`seg-btn${pdfFontSize === s.value ? ' seg-btn--active' : ''}`}
                onClick={() => handleSizeChange(s.value)}
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

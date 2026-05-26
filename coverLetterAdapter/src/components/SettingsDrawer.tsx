import { useRef } from 'react'
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

export default function SettingsDrawer({
  open, apiKey, pdfFontKey, pdfFontSize,
  onClose, onSaveKey, onClearKey, onChangePdfFont, onChangePdfSize, onToast,
}: Props) {
  const keyInputRef = useRef<HTMLInputElement>(null)
  const feedbackRef = useRef<HTMLDivElement>(null)

  function handleSave() {
    const key = keyInputRef.current?.value.trim() ?? ''
    if (!key) return
    onSaveKey(key)
    onToast('API key saved', 'ok')
    setTimeout(onClose, 900)
  }

  function handleClear() {
    if (!confirm('Clear your saved API key?')) return
    onClearKey()
    if (keyInputRef.current) keyInputRef.current.value = ''
    onToast('API key cleared', 'ok')
  }

  function handleFontChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const prevKey = pdfFontKey
    const newKey = e.target.value
    if (prevKey !== newKey) bustFontCache()
    onChangePdfFont(newKey)
    localStorage.setItem('pdf_font', newKey)
    onToast(`PDF: ${PDF_FONTS[newKey]?.label ?? newKey}, ${pdfFontSize} pt`, 'ok')
    setTimeout(async () => {
      try { await loadPdfFont(new jsPDF(), newKey) } catch (_) {}
    }, 0)
  }

  function handleSizeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newSize = parseFloat(e.target.value) || 11
    onChangePdfSize(newSize)
    localStorage.setItem('pdf_size', String(newSize))
    onToast(`PDF: ${PDF_FONTS[pdfFontKey]?.label ?? pdfFontKey}, ${newSize} pt`, 'ok')
  }

  return (
    <div id="settingsDrawer" className={`drawer${open ? ' open' : ''}`} role="region" aria-label="API key settings">
      <div className="drawer-header">
        <span className="drawer-header-title">Settings</span>
        <button className="drawer-close" onClick={onClose} aria-label="Close settings">✕</button>
      </div>
      <div className="drawer-body">
        <div className="settings-grid">

          <div className="drawer-section">
            <div className="drawer-section-label">How to get an API key</div>
            <ol className="drawer-steps">
              <li>
                <span className="step-n">1</span>
                Go to <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer">console.anthropic.com</a> and create a free account.
              </li>
              <li>
                <span className="step-n">2</span>
                Open <strong style={{ color: 'var(--t1)' }}>API Keys</strong> and click <strong style={{ color: 'var(--t1)' }}>Create Key</strong>.
              </li>
              <li>
                <span className="step-n">3</span>
                Copy the key (starts with <code style={{ fontFamily: 'var(--f-mono)', fontSize: '0.75rem', color: 'var(--t2)' }}>sk-ant-</code>) and paste it below.
              </li>
              <li>
                <span className="step-n">4</span>
                New accounts include free credits — no credit card required.
              </li>
            </ol>
          </div>

          <div className="drawer-section">
            <div className="drawer-section-label">Your API key</div>
            <p className="drawer-note">
              Stored only in this browser's localStorage. Sent directly to Anthropic — never through any other server.
            </p>
            <div className="key-row">
              <input
                ref={keyInputRef}
                className="key-input"
                type="password"
                placeholder="sk-ant-api03-…"
                autoComplete="off"
                spellCheck={false}
                aria-label="Anthropic API key"
                defaultValue={apiKey}
                onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              />
              <button className="btn-primary" onClick={handleSave}>Save</button>
            </div>
            <div ref={feedbackRef} className="key-feedback" role="status" />
            <button className="btn-danger" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={handleClear}>
              Clear saved key
            </button>
          </div>

        </div>

        <div className="settings-pdf-section">
          <div className="drawer-section-label">PDF Export</div>
          <div className="pdf-settings-row">
            <div className="pdf-setting">
              <label className="pdf-setting-label" htmlFor="pdfFontSelect">Font</label>
              <select
                className="settings-select"
                id="pdfFontSelect"
                value={pdfFontKey}
                onChange={handleFontChange}
              >
                <option value="crimson-pro">Crimson Pro</option>
                <option value="linux-libertine">Linux Libertine</option>
                <option value="eb-garamond">EB Garamond</option>
                <option value="cormorant">Cormorant Garamond</option>
                <option value="libre-baskerville">Libre Baskerville</option>
              </select>
            </div>
            <div className="pdf-setting">
              <label className="pdf-setting-label" htmlFor="pdfSizeSelect">Size</label>
              <select
                className="settings-select"
                id="pdfSizeSelect"
                value={String(pdfFontSize)}
                onChange={handleSizeChange}
              >
                <option value="10">10 pt</option>
                <option value="10.5">10.5 pt</option>
                <option value="11">11 pt</option>
                <option value="11.5">11.5 pt</option>
                <option value="12">12 pt</option>
              </select>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

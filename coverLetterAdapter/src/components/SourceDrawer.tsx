import { useRef, useEffect, useCallback, useState } from 'react'
import type { CvFileData, InputTab, SourceTab, PersonaData } from '../types'
import { ab2b64, extractPdfText } from '../lib/pdfUtils'

interface Props {
  open: boolean
  inputTab: InputTab
  cvFileData: CvFileData | null
  onClose: () => void
  onCvFileChange: (data: CvFileData | null) => void
  onPersonaActiveChange: (active: boolean, filled: boolean) => void
  onSourceChange: (hasSource: boolean) => void
  onToast: (msg: string, type?: 'ok' | 'err') => void
}

function debounce<T extends (...args: Parameters<T>) => void>(fn: T, ms: number) {
  let t: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms) }
}


function loadPersona(): PersonaData {
  try { return JSON.parse(localStorage.getItem('persona') ?? '{}') } catch { return {} }
}

function isPersonaFilled(p: PersonaData): boolean {
  return !!(p.target || p.strengths || p.tone || p.avoid || p.voice || p.about)
}

function loadPersonaEnabled(): boolean {
  return localStorage.getItem('persona_enabled') !== 'false'
}

const TONE_OPTIONS = ['Professional', 'Confident', 'Warm', 'Conversational']

export default function SourceDrawer({
  open, inputTab, cvFileData, onClose, onCvFileChange, onPersonaActiveChange, onSourceChange, onToast,
}: Props) {
  const [activeTab, setActiveTab] = useState<SourceTab>(inputTab)
  const [persona, setPersona] = useState<PersonaData>(loadPersona)
  const [personaFilled, setPersonaFilled] = useState(() => isPersonaFilled(loadPersona()))
  const [personaEnabled, setPersonaEnabled] = useState(loadPersonaEnabled)
  const personaActive = personaFilled && personaEnabled

  const baseLetterRef = useRef<HTMLTextAreaElement>(null)
  const signatureRef = useRef<HTMLTextAreaElement>(null)
  const cvTextRef = useRef<HTMLTextAreaElement>(null)
  const baseFileInputRef = useRef<HTMLInputElement>(null)
  const cvFileInputRef = useRef<HTMLInputElement>(null)
  const baseDropZoneRef = useRef<HTMLDivElement>(null)
  const baseDropLabelRef = useRef<HTMLSpanElement>(null)
  const baseClearBtnRef = useRef<HTMLButtonElement>(null)
  const cvDropZoneRef = useRef<HTMLDivElement>(null)
  const cvDropLabelRef = useRef<HTMLSpanElement>(null)
  const cvClearBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) {
      if (baseLetterRef.current) baseLetterRef.current.value = localStorage.getItem('base_letter') ?? ''
      if (signatureRef.current) signatureRef.current.value = localStorage.getItem('user_signature') ?? ''
      if (cvTextRef.current) cvTextRef.current.value = localStorage.getItem('cv_text') ?? ''
      const p = loadPersona()
      setPersona(p)
      setPersonaFilled(isPersonaFilled(p))
      setPersonaEnabled(loadPersonaEnabled())
    }
  }, [open])

  function switchTab(tab: SourceTab) {
    setActiveTab(tab)
  }

  const saveBase = useCallback(debounce((val: string) => {
    localStorage.setItem('base_letter', val.trim())
    onToast('Template saved', 'ok')
    onSourceChange(!!(val.trim() || localStorage.getItem('cv_text')?.trim()))
  }, 600), [])

  const saveSig = useCallback(debounce((val: string) => {
    localStorage.setItem('user_signature', val.trim())
    onToast('Signature saved', 'ok')
  }, 600), [])

  const saveCvText = useCallback(debounce((val: string) => {
    localStorage.setItem('cv_text', val.trim())
    onToast('CV saved', 'ok')
    onSourceChange(!!(val.trim() || localStorage.getItem('base_letter')?.trim()))
  }, 600), [])

  function updatePersona(key: keyof PersonaData, value: string) {
    const updated = { ...persona, [key]: value }
    setPersona(updated)
    localStorage.setItem('persona', JSON.stringify(updated))
    const filled = isPersonaFilled(updated)
    setPersonaFilled(filled)
    onPersonaActiveChange(filled && personaEnabled, filled)
  }

  function togglePersonaEnabled() {
    const next = !personaEnabled
    setPersonaEnabled(next)
    localStorage.setItem('persona_enabled', String(next))
    onPersonaActiveChange(personaFilled && next, personaFilled)
  }

  function clearPersona() {
    if (!confirm('Clear all persona fields?')) return
    const empty: PersonaData = {}
    setPersona(empty)
    localStorage.removeItem('persona')
    setPersonaFilled(false)
    onPersonaActiveChange(false, false)
    onToast('Persona cleared', 'ok')
  }

  async function handleBaseFile(input: HTMLInputElement) {
    const file = input.files?.[0]
    if (!file) return
    if (baseDropLabelRef.current) baseDropLabelRef.current.textContent = 'Reading…'
    try {
      let text: string
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        text = await extractPdfText(await file.arrayBuffer())
      } else {
        text = await file.text()
      }
      if (baseLetterRef.current) baseLetterRef.current.value = text
      localStorage.setItem('base_letter', text.trim())
      baseDropZoneRef.current?.classList.add('has-file')
      if (baseDropLabelRef.current) baseDropLabelRef.current.textContent = file.name
      if (baseClearBtnRef.current) baseClearBtnRef.current.style.display = 'inline-block'
      onToast(`Loaded: ${file.name}`, 'ok')
    } catch (err) {
      if (baseDropLabelRef.current) baseDropLabelRef.current.textContent = 'Upload .pdf, .txt, or .md'
      onToast('Could not read file: ' + (err as Error).message, 'err')
    }
  }

  function clearBaseFile(e: React.MouseEvent) {
    e.stopPropagation()
    if (baseFileInputRef.current) baseFileInputRef.current.value = ''
    baseDropZoneRef.current?.classList.remove('has-file')
    if (baseDropLabelRef.current) baseDropLabelRef.current.textContent = 'Upload .pdf, .txt, or .md'
    if (baseClearBtnRef.current) baseClearBtnRef.current.style.display = 'none'
  }

  async function handleCvFile(input: HTMLInputElement) {
    const file = input.files?.[0]
    if (!file) return
    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf')
    let data: CvFileData
    if (isPdf) {
      data = { type: 'pdf', data: ab2b64(await file.arrayBuffer()), name: file.name }
    } else {
      data = { type: 'text', data: await file.text(), name: file.name }
    }
    onCvFileChange(data)
    onSourceChange(true)
    cvDropZoneRef.current?.classList.add('has-file')
    const iconEl = cvDropZoneRef.current?.querySelector('.upload-icon')
    if (iconEl) iconEl.textContent = '✓'
    if (cvDropLabelRef.current) cvDropLabelRef.current.textContent = file.name
    if (cvClearBtnRef.current) cvClearBtnRef.current.style.display = 'inline-block'
    onToast(`CV loaded: ${file.name}`, 'ok')
  }

  function clearCv(e: React.MouseEvent) {
    e.stopPropagation()
    if (cvFileInputRef.current) cvFileInputRef.current.value = ''
    onCvFileChange(null)
    cvDropZoneRef.current?.classList.remove('has-file')
    const iconEl = cvDropZoneRef.current?.querySelector('.upload-icon')
    if (iconEl) iconEl.textContent = '📄'
    if (cvDropLabelRef.current) cvDropLabelRef.current.textContent = 'Upload your CV'
    if (cvClearBtnRef.current) cvClearBtnRef.current.style.display = 'none'
  }

  function resetBaseLetter() {
    if (!confirm('Clear your template? Your edits will be lost.')) return
    localStorage.removeItem('base_letter')
    if (baseLetterRef.current) baseLetterRef.current.value = ''
    onToast('Template cleared', 'ok')
  }

  function resetSignature() {
    if (!confirm('Clear your saved signature?')) return
    localStorage.removeItem('user_signature')
    if (signatureRef.current) signatureRef.current.value = ''
    onToast('Signature cleared', 'ok')
  }

  return (
    <div id="sourceDrawer" className={`drawer${open ? ' open' : ''}`} role="region" aria-label="Letter source configuration">
      <div className="drawer-header">
        <span className="drawer-header-title">
          Source
          {personaActive && activeTab !== 'persona' && (
            <span className="persona-active-badge" title="Persona is active">✦ persona on</span>
          )}
        </span>
        <button className="drawer-close" onClick={onClose} aria-label="Close source drawer">✕</button>
      </div>
      <div className="drawer-body drawer-body--row">

        {/* Left: tabs + content */}
        <div className="source-main">
          <div className="drawer-tabs" role="tablist">
            <button
              className={`drawer-tab${activeTab === 'base' ? ' active' : ''}`}
              role="tab" aria-selected={activeTab === 'base'}
              onClick={() => switchTab('base')}
            >Template</button>
            <button
              className={`drawer-tab${activeTab === 'cv' ? ' active' : ''}`}
              role="tab" aria-selected={activeTab === 'cv'}
              onClick={() => switchTab('cv')}
            >CV / Resume</button>
            <button
              className={`drawer-tab${activeTab === 'persona' ? ' active' : ''}`}
              role="tab" aria-selected={activeTab === 'persona'}
              onClick={() => switchTab('persona')}
            >
              Persona{personaActive && activeTab !== 'persona' ? ' ✦' : ''}
            </button>
          </div>

          {/* ── Base letter tab ── */}
          <div className="tab-pane" style={{ display: activeTab === 'base' ? 'flex' : 'none' }}>
            <div className="tab-header">
              <span className="tab-hint">Autosaved</span>
              <div className="tab-actions">
                <input
                  ref={baseFileInputRef}
                  type="file" accept=".txt,.md,.pdf"
                  style={{ display: 'none' }}
                  onChange={e => handleBaseFile(e.target)}
                />
                <div
                  ref={baseDropZoneRef}
                  className="upload-zone"
                  onClick={() => baseFileInputRef.current?.click()}
                  role="button" tabIndex={0}
                  aria-label="Upload a template file"
                >
                  <span className="upload-icon" aria-hidden="true">📂</span>
                  <span ref={baseDropLabelRef} className="upload-label">Upload .pdf, .txt, or .md</span>
                  <button
                    ref={baseClearBtnRef}
                    className="btn-danger" style={{ display: 'none' }}
                    onClick={clearBaseFile} aria-label="Remove uploaded file"
                  >✕</button>
                </div>
                <button className="btn-danger" onClick={resetBaseLetter}>Reset</button>
              </div>
            </div>
            <textarea
              ref={baseLetterRef}
              className="base-textarea"
              spellCheck={false}
              placeholder="Paste or type your cover letter here. The AI will adapt it to each job posting automatically."
              aria-label="Base cover letter content"
              onChange={e => saveBase(e.target.value)}
            />
          </div>

          {/* ── CV tab ── */}
          <div className="tab-pane" style={{ display: activeTab === 'cv' ? 'flex' : 'none' }}>
            <input
              ref={cvFileInputRef}
              type="file" accept=".pdf,.txt,.md"
              style={{ display: 'none' }}
              onChange={e => handleCvFile(e.target)}
            />
            <div
              ref={cvDropZoneRef}
              className={`upload-zone${cvFileData ? ' has-file' : ''}`}
              onClick={() => cvFileInputRef.current?.click()}
              role="button" tabIndex={0}
              aria-label="Upload your CV or resume"
            >
              <span className="upload-icon" aria-hidden="true">{cvFileData ? '✓' : '📄'}</span>
              <span ref={cvDropLabelRef} className="upload-label">{cvFileData ? cvFileData.name : 'Upload your CV'}</span>
              <span className="upload-formats">PDF, .txt, or .md</span>
              <button
                ref={cvClearBtnRef}
                className="btn-danger"
                style={{ display: cvFileData ? 'inline-block' : 'none' }}
                onClick={clearCv} aria-label="Remove CV file"
              >✕</button>
            </div>
            <div className="cv-paste-label">
              <span>or paste as text</span>
            </div>
            <textarea
              ref={cvTextRef}
              className="cv-textarea"
              placeholder="Paste your CV or resume as plain text…"
              spellCheck={false}
              aria-label="CV text content"
              onChange={e => saveCvText(e.target.value)}
            />
            <p className="cv-session-note">
              <span aria-hidden="true">ⓘ</span>
              Pasted text is saved to your browser. Uploaded files must be re-selected after a refresh.
            </p>
          </div>

          {/* ── Persona tab ── */}
          <div className="tab-pane" style={{ display: activeTab === 'persona' ? 'flex' : 'none' }}>
            <div className="tab-header">
              <p className="persona-hint">
                Filled in once — injected into every letter to personalize tone, emphasis, and framing.
              </p>
              <div className="tab-actions">
                <label className="persona-toggle" title={personaEnabled ? 'Disable persona' : 'Enable persona'}>
                  <input
                    type="checkbox"
                    checked={personaEnabled}
                    onChange={togglePersonaEnabled}
                  />
                  <span className="persona-toggle-track" />
                  <span className="persona-toggle-label">{personaEnabled ? 'On' : 'Off'}</span>
                </label>
                <button className="btn-danger" onClick={clearPersona}>Clear</button>
              </div>
            </div>

            <div className="persona-form">
              <div className="persona-row">
                <div className="persona-field">
                  <label className="persona-field-label" htmlFor="personaTarget">Target role / industry</label>
                  <input
                    id="personaTarget"
                    className="persona-input"
                    type="text"
                    placeholder="e.g. product management roles in fintech"
                    value={persona.target ?? ''}
                    onChange={e => updatePersona('target', e.target.value)}
                  />
                </div>
                <div className="persona-field">
                  <label className="persona-field-label" htmlFor="personaTone">Preferred tone</label>
                  <select
                    id="personaTone"
                    className="settings-select"
                    style={{ width: '100%' }}
                    value={persona.tone ?? ''}
                    onChange={e => updatePersona('tone', e.target.value)}
                  >
                    <option value="">— not specified —</option>
                    {TONE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="persona-row">
                <div className="persona-field">
                  <label className="persona-field-label" htmlFor="personaStrengths">Key strengths</label>
                  <input
                    id="personaStrengths"
                    className="persona-input"
                    type="text"
                    placeholder="e.g. cross-functional leadership, data analysis, stakeholder comms"
                    value={persona.strengths ?? ''}
                    onChange={e => updatePersona('strengths', e.target.value)}
                  />
                </div>
                <div className="persona-field">
                  <label className="persona-field-label" htmlFor="personaVoice">Writing style / voice</label>
                  <input
                    id="personaVoice"
                    className="persona-input"
                    type="text"
                    placeholder="e.g. direct and evidence-led, story-driven opener"
                    value={persona.voice ?? ''}
                    onChange={e => updatePersona('voice', e.target.value)}
                  />
                </div>
              </div>

              <div className="persona-field">
                <label className="persona-field-label" htmlFor="personaAvoid">Things to avoid</label>
                <input
                  id="personaAvoid"
                  className="persona-input"
                  type="text"
                  placeholder="e.g. don't mention my gap year, avoid overselling leadership"
                  value={persona.avoid ?? ''}
                  onChange={e => updatePersona('avoid', e.target.value)}
                />
              </div>

              <div className="persona-field">
                <label className="persona-field-label" htmlFor="personaAbout">About me / additional context</label>
                <textarea
                  id="personaAbout"
                  className="persona-about"
                  placeholder="Anything else Claude should know: career context, what makes you unique, etc."
                  value={persona.about ?? ''}
                  onChange={e => updatePersona('about', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: signature */}
        <div className="source-sig">
          <div className="source-sig-header">
            <span className="drawer-section-label">Signature</span>
            <span className="tab-hint">Added to the end of every letter</span>
            <div className="tab-actions">
              <button className="btn-danger" onClick={resetSignature}>Reset</button>
            </div>
          </div>
          <textarea
            ref={signatureRef}
            className="base-textarea"
            spellCheck={false}
            placeholder={"e.g. Sincerely,\nYour Name\nyour@email.com | yourwebsite.com"}
            aria-label="Letter closing / signature"
            onChange={e => saveSig(e.target.value)}
          />
        </div>

      </div>
    </div>
  )
}

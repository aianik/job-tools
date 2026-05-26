import { useState, useRef, useEffect, useCallback } from 'react'
import { jsPDF } from 'jspdf'
import type { InputTab, PdfAlign, CvFileData, ToastItem, PersonaData } from './types'
import { adaptLetter } from './lib/api'
import { getEffectiveKey, useFreeAttempt, getFreeAttemptsLeft, hasFreeTrialKey } from './lib/freeTrialKey'
import { savePDF, loadPdfFont } from './lib/pdfExport'
import Header from './components/Header'
import SetupBanner from './components/SetupBanner'
import SettingsDrawer from './components/SettingsDrawer'
import SourceDrawer from './components/SourceDrawer'
import JobPanel from './components/JobPanel'
import OutputPanel from './components/OutputPanel'
import WelcomeModal from './components/WelcomeModal'
import ToastContainer from './components/Toast'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function renderLetter(el: HTMLDivElement, text: string) {
  const blocks = text.split(/\n{2,}/).map(block => {
    const trimmed = block.trim()
    const isSignoff = /^sincerely[,.]?\s*$/i.test(trimmed.split('\n')[0].trim())
    const inner = escapeHtml(trimmed).replace(/\n/g, '<br>')
    return `<p${isSignoff ? ' class="signoff"' : ''}>${inner}</p>`
  }).filter(p => p !== '<p></p>' && p !== '<p class="signoff"></p>')
  el.innerHTML = blocks.join('')
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('anthropic_key') ?? '')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sourceOpen, setSourceOpen] = useState(false)
  const [inputTab, setInputTab] = useState<InputTab>('base')
  const [cvFileData, setCvFileData] = useState<CvFileData | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [pdfAlign, setPdfAlign] = useState<PdfAlign>('justify')
  const [pdfFontKey, setPdfFontKey] = useState(() => {
    const f = localStorage.getItem('pdf_font')
    return (f && ['crimson-pro','linux-libertine','eb-garamond','cormorant','libre-baskerville'].includes(f)) ? f : 'crimson-pro'
  })
  const [pdfFontSize, setPdfFontSize] = useState(() => parseFloat(localStorage.getItem('pdf_size') ?? '') || 11)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [welcomeOpen, setWelcomeOpen] = useState(!localStorage.getItem('welcomed'))
  const [freeLeft, setFreeLeft] = useState(() => getFreeAttemptsLeft())
  const [hasSource, setHasSource] = useState(() =>
    !!(localStorage.getItem('base_letter')?.trim() || localStorage.getItem('cv_text')?.trim())
  )
  const templateReady = !!(localStorage.getItem('base_letter')?.trim())
  const cvReady = !!(cvFileData || localStorage.getItem('cv_text')?.trim())
  const [personaFilled, setPersonaFilled] = useState(() => {
    try {
      const p = JSON.parse(localStorage.getItem('persona') ?? '{}')
      return !!(p.target || p.strengths || p.tone || p.avoid || p.voice || p.about)
    } catch { return false }
  })
  const [personaActive, setPersonaActive] = useState(() => {
    try {
      const p = JSON.parse(localStorage.getItem('persona') ?? '{}')
      const enabled = localStorage.getItem('persona_enabled') !== 'false'
      return enabled && !!(p.target || p.strengths || p.tone || p.avoid || p.voice || p.about)
    } catch { return false }
  })

  const letterDocRef = useRef<HTMLDivElement>(null)
  const toastIdRef = useRef(0)
  const letterHistoryRef = useRef<string[]>([])
  const lastGeneratedRef = useRef<string>('')

  const showToast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    const id = ++toastIdRef.current
    setToasts(ts => [...ts, { id, msg, type }])
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 2600)
  }, [])

  useEffect(() => {
    const t = setTimeout(async () => {
      try { await loadPdfFont(new jsPDF(), pdfFontKey) } catch (_) {}
    }, 1500)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const tReady = !!(localStorage.getItem('base_letter')?.trim())
    const cReady = !!(cvFileData || localStorage.getItem('cv_text')?.trim())
    if (tReady && !cReady) setInputTab('base')
    else if (cReady && !tReady) setInputTab('cv')
  }, [hasSource, cvFileData])

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') closeWelcome()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [])

  function toggleSettings() {
    setSourceOpen(false)
    setSettingsOpen(v => !v)
  }

  function toggleSource() {
    setSettingsOpen(false)
    setSourceOpen(v => !v)
  }

  function closeWelcome() {
    setWelcomeOpen(false)
    localStorage.setItem('welcomed', '1')
  }

  function handleSaveKey(key: string) {
    localStorage.setItem('anthropic_key', key)
    setApiKey(key)
    setFreeLeft(getFreeAttemptsLeft())
  }

  function handleClearKey() {
    localStorage.removeItem('anthropic_key')
    setApiKey('')
    setFreeLeft(getFreeAttemptsLeft())
  }

  async function handleAdapt(jobPosting: string) {
    setError('')

    const { key: apiKey_, isDemo } = getEffectiveKey(apiKey)

    if (!apiKey_) {
      setError('Free uses exhausted. Open Settings to add your own API key — takes about a minute.')
      setSettingsOpen(true)
      return
    }
    if (!jobPosting.trim()) {
      setError('Paste a job posting on the left before adapting.')
      return
    }
    if (inputTab === 'base' && !(localStorage.getItem('base_letter') ?? '').trim()) {
      setError('Add your cover letter in Source → Template before adapting.')
      setSourceOpen(true)
      return
    }
    const cvText = localStorage.getItem('cv_text') ?? ''
    if (inputTab === 'cv' && !cvFileData && !cvText.trim()) {
      setError('CV mode is active — upload a CV file or paste CV text in the Source drawer first.')
      setSourceOpen(true)
      return
    }

    setIsGenerating(true)
    try {
      let persona: PersonaData = {}
      const personaEnabled = localStorage.getItem('persona_enabled') !== 'false'
      if (personaEnabled) {
        try { persona = JSON.parse(localStorage.getItem('persona') ?? '{}') } catch (_) {}
      }

      const result = await adaptLetter({
        apiKey: apiKey_,
        jobPosting,
        inputTab,
        baseLetter: localStorage.getItem('base_letter') ?? '',
        signature: localStorage.getItem('user_signature') ?? '',
        persona,
        cvFileData,
        cvText,
      })

      setCompanyName(result.companyName)
      if (letterDocRef.current) {
        const prev = letterDocRef.current.innerHTML
        if (prev && !letterDocRef.current.querySelector('.empty-state')) {
          letterHistoryRef.current = [...letterHistoryRef.current.slice(-16), prev]
        }
        renderLetter(letterDocRef.current, result.letterText)
        lastGeneratedRef.current = letterDocRef.current.innerHTML
      }

      if (isDemo) {
        useFreeAttempt()
        const left = getFreeAttemptsLeft()
        setFreeLeft(left)
      }

      const left = isDemo ? getFreeAttemptsLeft() : null
      const trailMsg = left !== null ? ` · ${left} free use${left === 1 ? '' : 's'} left` : ''
      showToast(`Letter adapted${result.companyName ? ' for ' + result.companyName : ''}${trailMsg}`, 'ok')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsGenerating(false)
    }
  }

  function handleSnapshot(html: string) {
    letterHistoryRef.current = [...letterHistoryRef.current.slice(-16), html]
  }

  function handleUndo() {
    const history = letterHistoryRef.current
    if (!history.length || !letterDocRef.current) return
    const prev = history[history.length - 1]
    letterHistoryRef.current = history.slice(0, -1)
    letterDocRef.current.innerHTML = prev
    letterDocRef.current.dispatchEvent(new Event('input', { bubbles: true }))
  }

  function handleReset() {
    if (!lastGeneratedRef.current || !letterDocRef.current) return
    const current = letterDocRef.current.innerHTML
    letterHistoryRef.current = [...letterHistoryRef.current.slice(-16), current]
    letterDocRef.current.innerHTML = lastGeneratedRef.current
    letterDocRef.current.dispatchEvent(new Event('input', { bubbles: true }))
  }

  async function handleSavePdf(): Promise<void> {
    const el = letterDocRef.current
    if (!el) return
    await savePDF({
      letterDocEl: el,
      pdfFontKey,
      pdfFontSize,
      pdfAlign,
      companyName,
      signature: localStorage.getItem('user_signature') ?? '',
    })
    showToast('PDF saved', 'ok')
  }

  const hasTrial = hasFreeTrialKey()
  const bannerVisible = !apiKey && !(hasTrial && freeLeft > 0)

  return (
    <>
      <ToastContainer toasts={toasts} />

      <Header
        apiKey={apiKey}
        settingsOpen={settingsOpen}
        sourceOpen={sourceOpen}
        personaActive={personaActive}
        personaFilled={personaFilled}
        onToggleSettings={toggleSettings}
        onToggleSource={toggleSource}
        onShowWelcome={() => setWelcomeOpen(true)}
      />

      {bannerVisible && (
        <SetupBanner apiKey={apiKey} freeLeft={freeLeft} onOpenSettings={toggleSettings} />
      )}

      <SettingsDrawer
        open={settingsOpen}
        apiKey={apiKey}
        pdfFontKey={pdfFontKey}
        pdfFontSize={pdfFontSize}
        onClose={toggleSettings}
        onSaveKey={handleSaveKey}
        onClearKey={handleClearKey}
        onChangePdfFont={setPdfFontKey}
        onChangePdfSize={setPdfFontSize}
        onToast={showToast}
      />

      {!hasSource && (
        <div className="setup-banner source-banner visible" role="alert">
          <p className="setup-banner-text">
            Add your cover letter template or CV in Source — the AI needs it to adapt your letter.
          </p>
          <button className="btn-primary" onClick={toggleSource}>Open Source →</button>
        </div>
      )}

      <SourceDrawer
        open={sourceOpen}
        inputTab={inputTab}
        cvFileData={cvFileData}
        onClose={toggleSource}
        onCvFileChange={setCvFileData}
        onPersonaActiveChange={(active, filled) => { setPersonaActive(active); setPersonaFilled(filled) }}
        onSourceChange={setHasSource}
        onToast={showToast}
      />

      <main role="main">
        <JobPanel
          isGenerating={isGenerating}
          error={error}
          inputTab={inputTab}
          templateReady={templateReady}
          cvReady={cvReady}
          onTabChange={setInputTab}
          onAdapt={handleAdapt}
        />
        <OutputPanel
          letterDocRef={letterDocRef}
          pdfAlign={pdfAlign}
          onAlignChange={setPdfAlign}
          onSavePdf={handleSavePdf}
          onToggleSource={toggleSource}
          onSnapshot={handleSnapshot}
          onUndo={handleUndo}
          onReset={handleReset}
          onToast={showToast}
        />
      </main>

      <footer className="app-footer">
        Your API key is stored only in this browser and sent directly to Anthropic — nothing passes through any other server.
      </footer>

      <WelcomeModal
        open={welcomeOpen}
        hasOwnKey={!!apiKey}
        onClose={closeWelcome}
        onOpenSettings={toggleSettings}
      />
    </>
  )
}

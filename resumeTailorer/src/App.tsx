import { useState, useCallback, useRef } from 'react'
import type { ResumeData, ToastItem, InputTab, PersonaData, PdfFont, PdfSize } from './types'
import { adaptResume } from './lib/api'
import { exportResumePdf, preloadFonts } from './lib/pdfExport'
import { downloadTex } from './lib/texExport'
import { getTrialKey, getRemainingTrialUses, consumeTrialUse, FREE_ATTEMPTS_TOTAL } from './lib/freeTrialKey'
import Header from './components/Header'
import JobPanel from './components/JobPanel'
import ResumeDoc from './components/ResumeDoc'
import SourceDrawer from './components/SourceDrawer'
import SettingsDrawer from './components/SettingsDrawer'
import Toast from './components/Toast'
import './App.css'

const LS = {
  apiKey:    'rt_api_key',
  resumeText:'rt_resume_text',
  inputTab:  'rt_input_tab',
  persona:   'rt_persona',
  pdfFont:   'rt_pdf_font',
  pdfSize:   'rt_pdf_size',
}

function ls<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback }
  catch { return fallback }
}

const defaultPersona: PersonaData = { targetRole: '', tone: '', strengths: '', avoid: '', headerInstructions: '' }

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function buildFilename(resume: import('./types').ResumeData): string {
  const clean = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '')
  const personName  = clean(resume.header.name) || 'Name'
  const companyName = clean(resume.companyName ?? '') || 'Company'
  const now = new Date()
  const monthYear = `${MONTHS[now.getMonth()]}${now.getFullYear()}`
  return `CV_${personName}_${companyName}_${monthYear}.pdf`
}

export default function App() {
  const [apiKey, setApiKey] = useState<string>(() => ls(LS.apiKey, ''))
  const [resumeText, setResumeText] = useState<string>(() => ls(LS.resumeText, ''))
  const [inputTab, setInputTab] = useState<InputTab>(() => ls(LS.inputTab, 'text'))
  const [persona, setPersona] = useState<PersonaData>(() => ls(LS.persona, defaultPersona))
  const [pdfFont, setPdfFont] = useState<PdfFont>(() => ls(LS.pdfFont, 'crimsonpro'))
  const [pdfSize, setPdfSize] = useState<PdfSize>(() => ls(LS.pdfSize, 'regular'))
  const [jobText, setJobText] = useState('')
  const [resume, setResume] = useState<ResumeData | null>(null)
  const [loading, setLoading] = useState(false)
  const [pdfExporting, setPdfExporting] = useState(false)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [sourceOpen, setSourceOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const paperRef = useRef<HTMLDivElement>(null)

  function toast(message: string, type: ToastItem['type'] = 'success') {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  function dismissToast(id: string) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  function saveApiKey(k: string) {
    setApiKey(k)
    localStorage.setItem(LS.apiKey, JSON.stringify(k))
  }

  function saveResumeText(v: string) {
    setResumeText(v)
    localStorage.setItem(LS.resumeText, JSON.stringify(v))
  }

  function saveInputTab(t: InputTab) {
    setInputTab(t)
    localStorage.setItem(LS.inputTab, JSON.stringify(t))
  }

  function savePersona(p: PersonaData) {
    setPersona(p)
    localStorage.setItem(LS.persona, JSON.stringify(p))
  }

  const canAdapt = resumeText.trim().length > 0 && jobText.trim().length > 0 &&
    (apiKey.trim().length > 0 || getRemainingTrialUses() > 0)

  async function handleAdapt() {
    if (!canAdapt || loading) return

    let key = apiKey.trim()
    let usingTrial = false

    if (!key) {
      const remaining = getRemainingTrialUses()
      if (remaining <= 0) {
        toast('No free uses remaining. Add your Anthropic API key in Settings.', 'error')
        return
      }
      key = getTrialKey()
      usingTrial = true
    }

    setLoading(true)
    try {
      const result = await adaptResume(
        resumeText,
        jobText,
        key,
        persona.targetRole || persona.tone || persona.strengths || persona.avoid ? persona : null
      )
      setResume(result)
      if (pdfFont === 'crimsonpro') preloadFonts().catch(() => {})
      if (usingTrial) {
        consumeTrialUse()
        const left = getRemainingTrialUses()
        toast(left > 0
          ? `Resume tailored! ${left}/${FREE_ATTEMPTS_TOTAL} free uses remaining.`
          : 'Resume tailored! No free uses left — add your API key to continue.',
          'success'
        )
      } else {
        toast('Resume tailored!', 'success')
      }
    } catch (err) {
      toast((err as Error).message ?? 'Something went wrong.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleExportPdf = useCallback(async () => {
    if (!resume || pdfExporting) return
    setPdfExporting(true)
    const filename = buildFilename(resume)
    try {
      await exportResumePdf(resume, filename, { font: pdfFont, size: pdfSize })
      toast('PDF saved', 'success')
    } catch (err) {
      toast((err as Error).message || 'PDF export failed.', 'error')
    } finally {
      setPdfExporting(false)
    }
  }, [resume, pdfExporting])

  const handleExportTex = useCallback(() => {
    if (!resume) return
    downloadTex(resume, buildFilename(resume).replace('.pdf', '.tex'))
    toast('.tex downloaded', 'success')
  }, [resume])

  return (
    <div className="app">
      <Header
        onOpenSource={() => setSourceOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        hasResume={resumeText.trim().length > 0}
      />

      <main className="app-main">
        <JobPanel
          jobText={jobText}
          onJobChange={setJobText}
          onAdapt={handleAdapt}
          loading={loading}
          canAdapt={canAdapt}
        />

        {resume ? (
          <ResumeDoc
            resume={resume}
            onChange={setResume}
            onExportPdf={handleExportPdf}
            onExportTex={handleExportTex}
            paperRef={paperRef}
            pdfExporting={pdfExporting}
          />
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10,9 9,9 8,9"/>
              </svg>
            </div>
            <div className="empty-steps">
              <div className="empty-step">
                <span className="step-num">1</span>
                <span>
                  {resumeText.trim()
                    ? <><span className="step-check">✓</span> Resume source ready</>
                    : <><button className="link-btn" onClick={() => setSourceOpen(true)}>Add your resume</button> (LaTeX or text)</>
                  }
                </span>
              </div>
              <div className="empty-step">
                <span className="step-num">2</span>
                <span>Paste the job description on the left</span>
              </div>
              <div className="empty-step">
                <span className="step-num">3</span>
                <span>Click <strong>Tailor Resume</strong></span>
              </div>
              <div className="empty-step">
                <span className="step-num">4</span>
                <span>Edit inline, then export PDF or download .tex</span>
              </div>
            </div>
            {!apiKey && (
              <p className="empty-hint">
                {getRemainingTrialUses()} free use{getRemainingTrialUses() !== 1 ? 's' : ''} available.{' '}
                <button className="link-btn" onClick={() => setSettingsOpen(true)}>Add your Anthropic key</button> for unlimited use.
              </p>
            )}
          </div>
        )}
      </main>

      <SourceDrawer
        open={sourceOpen}
        onClose={() => setSourceOpen(false)}
        inputTab={inputTab}
        onTabChange={saveInputTab}
        resumeText={resumeText}
        onResumeTextChange={saveResumeText}
        persona={persona}
        onPersonaChange={savePersona}
        onToast={toast}
      />
      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        apiKey={apiKey}
        onApiKeyChange={saveApiKey}
        pdfFont={pdfFont}
        onPdfFontChange={f => { setPdfFont(f); localStorage.setItem(LS.pdfFont, JSON.stringify(f)) }}
        pdfSize={pdfSize}
        onPdfSizeChange={s => { setPdfSize(s); localStorage.setItem(LS.pdfSize, JSON.stringify(s)) }}
      />
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

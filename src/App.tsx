import { useState, useCallback } from 'react'
import './App.css'

const SHARED_JOB_KEY = 'jt_job_posting'
const TRIGGER_PREFIX = 'jt_pending_trigger_'

function getResumeSourceStatus(): 'ready' | 'missing' {
  try {
    const v = JSON.parse(localStorage.getItem('rt_resume_text') ?? 'null')
    return typeof v === 'string' && v.trim().length > 0 ? 'ready' : 'missing'
  } catch { return 'missing' }
}

function getCoverLetterSourceStatus(): 'ready' | 'missing' {
  const base = localStorage.getItem('base_letter')?.trim()
  const cv = localStorage.getItem('cv_text')?.trim()
  return base || cv ? 'ready' : 'missing'
}

type Tool = {
  id: string
  name: string
  desc: string
  tags: string[]
  href: string
  sourceStatus: () => 'ready' | 'missing'
  sourceLabel: string
  icon: React.ReactNode
}

const tools: Tool[] = [
  {
    id: 'resume',
    name: 'Resume Tailorer',
    desc: 'Adapts your resume to match the job posting. Supports LaTeX and plain text, exports as PDF.',
    tags: ['LaTeX', 'PDF export', 'Inline editing'],
    href: './resumeTailorer/',
    sourceStatus: getResumeSourceStatus,
    sourceLabel: 'Resume source',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14,2 14,8 20,8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10,9 9,9 8,9"/>
      </svg>
    ),
  },
  {
    id: 'coverletter',
    name: 'Cover Letter Adapter',
    desc: 'Adapts your cover letter or CV to the job posting. Personalized tone, exported as PDF.',
    tags: ['Persona', 'PDF export', 'CV-aware'],
    href: './coverLetterAdapter/',
    sourceStatus: getCoverLetterSourceStatus,
    sourceLabel: 'Letter / CV source',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
    ),
  },
]

export default function App() {
  const [jobPosting, setJobPosting] = useState(() => localStorage.getItem(SHARED_JOB_KEY) ?? '')
  const [, forceUpdate] = useState(0)

  const handleJobChange = useCallback((val: string) => {
    setJobPosting(val)
    localStorage.setItem(SHARED_JOB_KEY, val)
  }, [])

  function handleCardClick(tool: Tool, e: React.MouseEvent) {
    e.preventDefault()
    if (!jobPosting.trim()) return
    localStorage.setItem(TRIGGER_PREFIX + tool.id, '1')
    window.open(tool.href, '_blank')
  }

  const hasJob = jobPosting.trim().length > 0

  return (
    <div className="layout">
      <header className="header">
        <div className="header-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2"/>
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            <line x1="12" y1="12" x2="12" y2="16"/>
            <line x1="10" y1="14" x2="14" y2="14"/>
          </svg>
        </div>
        <div>
          <div className="header-title">Job Tools</div>
          <div className="header-sub">by Ariful Islam Anik</div>
        </div>
      </header>

      <main className="main">
        <div className="hero">
          <span className="hero-label">AI-powered</span>
          <h1 className="hero-title">Your job search,<br /><span>sharpened</span></h1>
          <p className="hero-desc">
            Paste a job posting below, then launch the tools you need. Each one opens ready to generate.
          </p>
        </div>

        <div className="job-input-section">
          <div className="job-input-header">
            <label className="job-input-label" htmlFor="jobPosting">Job Posting</label>
            {hasJob && (
              <span className="job-input-ready">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                Ready
              </span>
            )}
          </div>
          <textarea
            id="jobPosting"
            className="job-textarea"
            placeholder="Paste the full job posting here — title, company, responsibilities, requirements…"
            value={jobPosting}
            onChange={e => handleJobChange(e.target.value)}
            spellCheck={false}
          />
        </div>

        <div className="tools-grid">
          {tools.map(tool => {
            const status = tool.sourceStatus()
            const canLaunch = hasJob
            return (
              <a
                key={tool.id}
                className={`tool-card${!canLaunch ? ' tool-card--disabled' : ''}`}
                href={tool.href}
                onClick={e => handleCardClick(tool, e)}
                onMouseEnter={() => forceUpdate(n => n + 1)}
              >
                <div className="card-top">
                  <div className="card-icon">{tool.icon}</div>
                  <div className={`source-badge source-badge--${status}`}>
                    {status === 'ready' ? (
                      <>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20,6 9,17 4,12"/>
                        </svg>
                        {tool.sourceLabel} ready
                      </>
                    ) : (
                      <>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Add {tool.sourceLabel.toLowerCase()}
                      </>
                    )}
                  </div>
                </div>
                <div className="card-body">
                  <div className="card-name">{tool.name}</div>
                  <div className="card-desc">{tool.desc}</div>
                  <div className="card-tags">
                    {tool.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
                  </div>
                </div>
                <span className={`card-cta${canLaunch ? '' : ' card-cta--muted'}`}>
                  {canLaunch ? (status === 'ready' ? 'Launch & generate' : 'Launch tool') : 'Paste job posting first'}
                  {canLaunch && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12,5 19,12 12,19"/>
                    </svg>
                  )}
                </span>
              </a>
            )
          })}
        </div>
      </main>

      <footer className="footer">
        Powered by Claude · All processing happens in your browser · No data stored server-side
      </footer>
    </div>
  )
}

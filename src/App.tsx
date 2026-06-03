import './App.css'

type Tool = {
  id: string
  name: string
  desc: string
  tags: string[]
  href: string
  icon: React.ReactNode
}

const tools: Tool[] = [
  {
    id: 'resume',
    name: 'Resume Tailorer',
    desc: 'Paste a job description and get your resume adapted to match — LaTeX or plain text, exported as a clean PDF.',
    tags: ['LaTeX', 'PDF export', 'Inline editing'],
    href: './resumeTailorer/',
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
    desc: 'Adapt your base cover letter or CV to any job posting — personalized tone, tailored framing, exported as PDF.',
    tags: ['Persona', 'PDF export', 'CV-aware'],
    href: './coverLetterAdapter/',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
    ),
  },
]

function ArrowIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="17" x2="17" y2="7"/>
      <polyline points="7,7 17,7 17,17"/>
    </svg>
  )
}

export default function App() {
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
            A small suite of tools to help you apply smarter — tailor your resume and cover letter to any job posting in seconds.
          </p>
        </div>

        <div className="tools-grid">
          {tools.map(tool => (
            <a key={tool.id} className="tool-card" href={tool.href}>
              <div className="card-top">
                <div className="card-icon">{tool.icon}</div>
                <div className="card-arrow"><ArrowIcon /></div>
              </div>
              <div className="card-body">
                <div className="card-name">{tool.name}</div>
                <div className="card-desc">{tool.desc}</div>
                <div className="card-tags">
                  {tool.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
                </div>
              </div>
              <span className="card-cta">
                Open tool
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12,5 19,12 12,19"/>
                </svg>
              </span>
            </a>
          ))}
        </div>
      </main>

      <footer className="footer">
        Powered by Claude · All processing happens in your browser · No data stored server-side
      </footer>
    </div>
  )
}

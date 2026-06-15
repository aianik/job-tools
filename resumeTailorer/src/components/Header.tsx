import { getRemainingTrialUses } from '../lib/freeTrialKey'

type Props = {
  apiKey: string
  onOpenSource: () => void
  onOpenSettings: () => void
  hasResume: boolean
}

export default function Header({ apiKey, onOpenSource, onOpenSettings, hasResume }: Props) {
  const freeLeft = getRemainingTrialUses()

  let pillClass = 'status-pill'
  let pillText = 'Setup required'
  if (apiKey) {
    pillClass += ' ready'
    pillText = 'Ready'
  } else if (freeLeft > 0) {
    pillClass += ' free'
    pillText = `${freeLeft} free use${freeLeft === 1 ? '' : 's'} left`
  }

  return (
    <header className="app-header">
      <div className="header-brand">
        <span className="header-logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10,9 9,9 8,9"/>
          </svg>
        </span>
        <span className="header-title">Resume Tailorer</span>
        <span className="header-sub">by job-tools</span>
      </div>
      <div className="header-actions">
        <div className={pillClass} onClick={onOpenSettings} role="button" tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onOpenSettings() }}>
          <span className="s-dot" />
          <span>{pillText}</span>
        </div>
        <button
          className={`btn-ghost${hasResume ? ' btn-ghost--active' : ''}`}
          onClick={onOpenSource}
          title="Resume source"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
          </svg>
          Source
          {hasResume && <span className="badge-dot" />}
        </button>
        <button className="btn-ghost" onClick={onOpenSettings} title="Settings">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          Settings
        </button>
      </div>
    </header>
  )
}

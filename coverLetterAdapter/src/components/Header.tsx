import { hasFreeTrialKey, getFreeAttemptsLeft } from '../lib/freeTrialKey'

interface Props {
  apiKey: string
  settingsOpen: boolean
  sourceOpen: boolean
  personaActive: boolean
  personaFilled: boolean
  onToggleSettings: () => void
  onToggleSource: () => void
  onShowWelcome: () => void
}

export default function Header({ apiKey, settingsOpen, sourceOpen, personaActive, personaFilled, onToggleSettings, onToggleSource, onShowWelcome }: Props) {
  const freeLeft = getFreeAttemptsLeft()
  const hasTrial = hasFreeTrialKey()

  let statusClass = 'status-pill'
  let statusText = 'Setup required'
  if (apiKey) {
    statusClass += ' ready'
    statusText = 'Ready'
  } else if (hasTrial && freeLeft > 0) {
    statusClass += ' free'
    statusText = `${freeLeft} free use${freeLeft === 1 ? '' : 's'} left`
  }

  return (
    <header className="app-header" role="banner">
      <a
        className="brand"
        href=""
        onClick={e => { e.preventDefault(); window.location.reload() }}
        aria-label="Cover Letter Adapter home"
      >
        <div className="brand-mark" aria-hidden="true">CL</div>
        <span className="brand-name">Cover Letter Adapter</span>
      </a>

      <div className="header-sep" aria-hidden="true" />

      <div
        className={`persona-badge${personaActive ? ' persona-badge--on' : personaFilled ? ' persona-badge--off' : ' persona-badge--empty'}`}
        onClick={onToggleSource}
        role="button"
        tabIndex={0}
        aria-label={personaFilled ? `Persona ${personaActive ? 'on' : 'off'} — click to open source` : 'Persona — click to open source'}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onToggleSource() }}
      >
        <span className="persona-badge-dot" aria-hidden="true" />
        <span>{personaFilled ? `Persona ${personaActive ? 'on' : 'off'}` : 'Persona'}</span>
      </div>

      <div className="header-spacer" />

      <div className="header-actions">
        <button className="btn-info" onClick={onShowWelcome} aria-label="How this works">?</button>

        <div
          className={statusClass}
          onClick={onToggleSettings}
          role="button"
          aria-label="API key status — click to open settings"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onToggleSettings() }}
        >
          <span className="s-dot" aria-hidden="true" />
          <span>{statusText}</span>
        </div>

        <button
          className={`btn-ghost${sourceOpen ? ' active' : ''}`}
          onClick={onToggleSource}
          aria-expanded={sourceOpen}
          aria-controls="sourceDrawer"
        >
          Source
        </button>

        <button
          className={`btn-ghost${settingsOpen ? ' active' : ''}`}
          onClick={onToggleSettings}
          aria-expanded={settingsOpen}
          aria-controls="settingsDrawer"
        >
          Settings
        </button>
      </div>
    </header>
  )
}

import { hasFreeTrialKey, getFreeAttemptsLeft, FREE_ATTEMPTS_TOTAL } from '../lib/freeTrialKey'

interface Props {
  open: boolean
  hasOwnKey: boolean
  onClose: () => void
  onOpenSettings: () => void
}

export default function WelcomeModal({ open, hasOwnKey, onClose, onOpenSettings }: Props) {
  const freeLeft = getFreeAttemptsLeft()
  const hasTrial = hasFreeTrialKey()

  let freeNote: React.ReactNode
  if (hasOwnKey) {
    freeNote = 'Your API key is active — unlimited uses.'
  } else if (hasTrial && freeLeft > 0) {
    const usedSome = freeLeft < FREE_ATTEMPTS_TOTAL
    const countLabel = usedSome ? `${freeLeft}/${FREE_ATTEMPTS_TOTAL} free uses remaining` : `${freeLeft} free uses`
    freeNote = <>{countLabel} to check it out. No account needed. Get your own <button className="modal-key-link" onClick={() => { onClose(); onOpenSettings() }}>Anthropic key</button> for unlimited use.</>
  } else {
    freeNote = <>Add your own API key in <strong>Settings</strong> to get started.</>
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className={`modal-backdrop${open ? ' open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Cover Letter Adapter"
      onClick={handleBackdropClick}
    >
      <div className="modal-card">
        <div className="modal-eyebrow">
          <div className="modal-logo" aria-hidden="true">CL</div>
          <span className="modal-title">Cover Letter Adapter</span>
        </div>

        <p className="modal-desc">
          Paste a job posting, get your cover letter tailored to it in seconds. Right emphasis, right company references, your authentic voice.
        </p>

        <div>
          <div className="modal-steps-label">How it works</div>
          <div className="modal-steps">
            <div className="modal-step">
              <span className="modal-step-n">1</span>
              <span>Add an existing cover letter or your CV in <strong>Source</strong>.</span>
            </div>
            <div className="modal-step">
              <span className="modal-step-n">2</span>
              <span>Paste a job posting you are interested in.</span>
            </div>
            <div className="modal-step">
              <span className="modal-step-n">3</span>
              <span>Click <strong>Adapt My Cover Letter</strong> to get your customized letter.</span>
            </div>
            <div className="modal-step">
              <span className="modal-step-n">4</span>
              <span>Edit the letter as you want and save as PDF.</span>
            </div>
          </div>
        </div>

        <div className="modal-divider" />

        <div className="modal-actions">
          <span className="modal-free-note">{freeNote}</span>
          <button
            className="btn-primary"
            style={{ flexShrink: 0 }}
            onClick={() => { onClose(); if (!hasOwnKey && (!hasTrial || freeLeft === 0)) onOpenSettings() }}
          >
            Get started →
          </button>
        </div>
      </div>
    </div>
  )
}

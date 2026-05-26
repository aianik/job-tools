import { useRef } from 'react'
import type { InputTab } from '../types'

interface Props {
  isGenerating: boolean
  error: string
  inputTab: InputTab
  templateReady: boolean
  cvReady: boolean
  onTabChange: (tab: InputTab) => void
  onAdapt: (jobPosting: string) => void
}

export default function JobPanel({ isGenerating, error, inputTab, templateReady, cvReady, onTabChange, onAdapt }: Props) {
  const anyReady = templateReady || cvReady
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      onAdapt((e.target as HTMLTextAreaElement).value)
    }
  }

  return (
    <section className="panel panel-left" aria-label="Job posting input">
      <div className="panel-header">
        <span className="panel-title">Job Posting</span>
        <div className="panel-rule" aria-hidden="true" />
        <div className="mode-seg" role="group" aria-label="Adapt from">
          <button
            className={`mode-seg-btn${anyReady && inputTab === 'base' ? (templateReady ? ' active' : ' active active--warn') : ''}`}
            onClick={() => onTabChange('base')}
            aria-pressed={anyReady && inputTab === 'base'}
          >
            Template
            {anyReady && inputTab === 'base' && !templateReady && <span className="mode-warn-badge" aria-label="No template saved">⚠</span>}
          </button>
          <button
            className={`mode-seg-btn${anyReady && inputTab === 'cv' ? (cvReady ? ' active' : ' active active--warn') : ''}`}
            onClick={() => onTabChange('cv')}
            aria-pressed={anyReady && inputTab === 'cv'}
          >
            CV
            {anyReady && inputTab === 'cv' && !cvReady && <span className="mode-warn-badge" aria-label="No CV saved">⚠</span>}
          </button>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        id="jobPosting"
        className="job-textarea"
        placeholder="Paste the full job posting here — title, company, responsibilities, requirements. The more detail, the better the adaptation."
        spellCheck={false}
        aria-label="Job posting text"
        onKeyDown={handleKeyDown}
      />

      <button
        className={`btn-cta${isGenerating ? ' loading' : ''}`}
        onClick={() => onAdapt(textareaRef.current?.value ?? '')}
        disabled={isGenerating}
        aria-label="Adapt cover letter (Ctrl+Enter)"
      >
        <span className="spinner" aria-hidden="true" />
        <span className="btn-cta-label">{isGenerating ? 'Adapting…' : 'Adapt My Cover Letter'}</span>
        <span className="kbd-hint" aria-hidden="true">Ctrl ↵</span>
      </button>

      <div className={`error-box${error ? ' visible' : ''}`} role="alert" aria-live="assertive">
        {error}
      </div>
    </section>
  )
}

type Props = {
  jobText: string
  onJobChange: (v: string) => void
  onAdapt: () => void
  loading: boolean
  canAdapt: boolean
}

export default function JobPanel({ jobText, onJobChange, onAdapt, loading, canAdapt }: Props) {
  return (
    <div className="job-panel">
      <div className="panel-header">
        <span className="panel-label">Job Posting</span>
      </div>
      <textarea
        className="job-textarea"
        placeholder="Paste the job description here..."
        value={jobText}
        onChange={e => onJobChange(e.target.value)}
        spellCheck={false}
      />
      <div className="job-panel-footer">
        <button
          className="btn-adapt"
          onClick={onAdapt}
          disabled={!canAdapt || loading}
        >
          {loading ? (
            <>
              <span className="spinner" />
              Tailoring...
            </>
          ) : (
            <>
              Tailor Resume
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12,5 19,12 12,19"/>
              </svg>
            </>
          )}
        </button>
        {!canAdapt && !loading && (
          <p className="adapt-hint">Add your resume source and an API key first</p>
        )}
      </div>
    </div>
  )
}

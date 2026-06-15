type Props = {
  jobText: string
  onJobChange: (v: string) => void
  onAdapt: () => void
  loading: boolean
  canAdapt: boolean
}

export default function JobPanel({ jobText, onJobChange, onAdapt, loading, canAdapt }: Props) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') onAdapt()
  }

  return (
    <div className="job-panel">
      <div className="panel-header">
        <span className="panel-label">Job Posting</span>
      </div>
      <textarea
        className="job-textarea"
        placeholder="Paste the job description here…"
        value={jobText}
        onChange={e => onJobChange(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
      />
      <div className="job-panel-footer">
        <button
          className="btn-adapt"
          onClick={onAdapt}
          disabled={!canAdapt || loading}
          aria-label="Tailor resume (Ctrl+Enter)"
        >
          {loading && <span className="spinner" />}
          <span>{loading ? 'Tailoring…' : 'Tailor Resume'}</span>
          {!loading && <span className="kbd-hint">Ctrl ↵</span>}
        </button>
      </div>
    </div>
  )
}

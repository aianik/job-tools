import { useRef, useState } from 'react'
import type { InputTab, PersonaData } from '../types'

type Props = {
  open: boolean
  onClose: () => void
  inputTab: InputTab
  onTabChange: (t: InputTab) => void
  resumeText: string
  onResumeTextChange: (v: string) => void
  persona: PersonaData
  onPersonaChange: (p: PersonaData) => void
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

export default function SourceDrawer({
  open, onClose, inputTab, onTabChange,
  resumeText, onResumeTextChange,
  persona, onPersonaChange, onToast,
}: Props) {
  const [activeTab, setActiveTab] = useState<'resume' | 'persona'>('resume')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      onResumeTextChange(text)
      onToast('Resume loaded', 'success')
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleTextSave() {
    onToast('Resume saved', 'success')
  }

  return (
    <>
      {open && <div className="drawer-backdrop" onClick={onClose} />}
      <div className={`drawer drawer-left ${open ? 'drawer--open' : ''}`}>
        <div className="drawer-header">
          <span className="drawer-title">Resume Source</span>
          <button className="drawer-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="drawer-tabs">
          <button className={`dtab ${activeTab === 'resume' ? 'dtab--active' : ''}`} onClick={() => setActiveTab('resume')}>Resume</button>
          <button className={`dtab ${activeTab === 'persona' ? 'dtab--active' : ''}`} onClick={() => setActiveTab('persona')}>Persona</button>
        </div>

        <div className="drawer-body">
          {activeTab === 'resume' && (
            <>
              <div className="seg-control">
                <button className={`seg-btn ${inputTab === 'latex' ? 'seg-btn--active' : ''}`} onClick={() => onTabChange('latex')}>LaTeX (.tex)</button>
                <button className={`seg-btn ${inputTab === 'text' ? 'seg-btn--active' : ''}`} onClick={() => onTabChange('text')}>Plain Text</button>
              </div>

              <div className="file-upload-zone" onClick={() => fileRef.current?.click()}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17,8 12,3 7,8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <span>Upload {inputTab === 'latex' ? '.tex' : '.txt / .md'} file</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept={inputTab === 'latex' ? '.tex,.txt' : '.txt,.md,.text'}
                  style={{ display: 'none' }}
                  onChange={handleFile}
                />
              </div>

              <label className="field-label" style={{ marginTop: 12 }}>
                {inputTab === 'latex' ? 'Or paste LaTeX source' : 'Or paste plain text resume'}
              </label>
              <textarea
                className="source-textarea"
                placeholder={inputTab === 'latex'
                  ? '\\documentclass{article}\n...'
                  : 'John Doe\njohn@example.com\n\nExperience\n...'
                }
                value={resumeText}
                onChange={e => onResumeTextChange(e.target.value)}
                spellCheck={false}
              />
              <button className="btn-secondary" style={{ marginTop: 8 }} onClick={handleTextSave}>
                Save
              </button>
            </>
          )}

          {activeTab === 'persona' && (
            <>
              <p className="field-hint" style={{ marginBottom: 12 }}>
                Persona guidance is injected into every adapt prompt. Leave blank to skip.
              </p>
              <label className="field-label">Target Role</label>
              <input
                className="field-input"
                placeholder="e.g. Senior UX Researcher"
                value={persona.targetRole}
                onChange={e => onPersonaChange({ ...persona, targetRole: e.target.value })}
              />
              <label className="field-label">Tone</label>
              <input
                className="field-input"
                placeholder="e.g. professional, concise, confident"
                value={persona.tone}
                onChange={e => onPersonaChange({ ...persona, tone: e.target.value })}
              />
              <label className="field-label">Strengths to Emphasize</label>
              <input
                className="field-input"
                placeholder="e.g. user research, mixed methods, HCI"
                value={persona.strengths}
                onChange={e => onPersonaChange({ ...persona, strengths: e.target.value })}
              />
              <label className="field-label">Avoid</label>
              <input
                className="field-input"
                placeholder="e.g. buzzwords, passive voice"
                value={persona.avoid}
                onChange={e => onPersonaChange({ ...persona, avoid: e.target.value })}
              />
              <label className="field-label">Header Instructions</label>
              <textarea
                className="field-input"
                style={{ minHeight: 64, resize: 'vertical' }}
                placeholder="e.g. Use full name with PhD suffix. Keep LinkedIn URL exactly as written."
                value={persona.headerInstructions}
                onChange={e => onPersonaChange({ ...persona, headerInstructions: e.target.value })}
              />
            </>
          )}
        </div>
      </div>
    </>
  )
}

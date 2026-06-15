import { useRef } from 'react'
import type { ResumeData, ResumeSection, ExperienceItem, EducationItem, ProjectItem, SkillCategory } from '../types'

function absoluteUrl(value: string, prefix: string): string {
  return value.startsWith('http') ? value : `${prefix}${value}`
}

function stripLatex(text: string): string {
  if (!text.includes('\\')) return text
  return text
    .replace(/\\begin\{[^}]*\}(\[[^\]]*\])?/g, '')
    .replace(/\\end\{[^}]*\}/g, '')
    .replace(/\\item\s*/g, '')
    .replace(/\\[a-zA-Z]+(\*)?(\[[^\]]*\])?(\{([^}]*)\})?/g, '$4')
    .replace(/[{}]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function latexToLines(text: string): string[] {
  if (!text.includes('\\item')) return [stripLatex(text)]
  return text
    .split(/\\item\s*/)
    .map(s => stripLatex(s))
    .filter(Boolean)
}

type Props = {
  resume: ResumeData
  onChange: (updated: ResumeData) => void
  onExportPdf: () => void
  onExportTex: () => void
  paperRef: React.RefObject<HTMLDivElement | null>
  pdfExporting: boolean
}

function EditableSpan({
  value, onChange, className, multiline
}: {
  value: string
  onChange: (v: string) => void
  className?: string
  multiline?: boolean
}) {
  const ref = useRef<HTMLSpanElement>(null)

  function handleBlur() {
    if (ref.current) onChange(ref.current.innerText)
  }

  // Hide the bullet marker as soon as its text is cleared, without waiting
  // for blur (and the resulting state update) to remove the list item.
  function handleInput() {
    if (!ref.current) return
    const li = ref.current.closest('li')
    if (li) li.classList.toggle('bullet-empty', ref.current.innerText.trim() === '')
  }

  return (
    <span
      ref={ref}
      className={`editable ${className ?? ''}`}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onInput={handleInput}
      style={{ whiteSpace: multiline ? 'pre-wrap' : undefined }}
      dangerouslySetInnerHTML={{ __html: value }}
    />
  )
}

function ExperienceSection({ section, onChange }: { section: Extract<ResumeSection, { type: 'experience' }>, onChange: (s: ResumeSection) => void }) {
  function updateItem(idx: number, updated: ExperienceItem) {
    const items = section.items.map((it, i) => i === idx ? updated : it)
    onChange({ ...section, items })
  }

  return (
    <>
      {section.items.map((item, i) => (
        <div key={item.id} className="resume-entry">
          <div className="entry-row">
            <EditableSpan value={item.role} onChange={v => updateItem(i, { ...item, role: v })} className="entry-role" />
            <EditableSpan value={item.dates} onChange={v => updateItem(i, { ...item, dates: v })} className="entry-dates" />
          </div>
          <div className="entry-sub">
            <EditableSpan value={item.company} onChange={v => updateItem(i, { ...item, company: v })} className="entry-company" />
            <span className="entry-sep">, </span>
            <EditableSpan value={item.location} onChange={v => updateItem(i, { ...item, location: v })} className="entry-location" />
          </div>
          <ul className="entry-bullets">
            {item.bullets.map((b, bi) => (
              <li key={bi}>
                <EditableSpan
                  value={b}
                  onChange={v => {
                    const bullets = item.bullets
                      .map((bb, bj) => bj === bi ? v : bb)
                      .filter(bb => bb.trim() !== '')
                    updateItem(i, { ...item, bullets })
                  }}
                  multiline
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  )
}

function EducationSection({ section, onChange }: { section: Extract<ResumeSection, { type: 'education' }>, onChange: (s: ResumeSection) => void }) {
  function updateItem(idx: number, updated: EducationItem) {
    const items = section.items.map((it, i) => i === idx ? updated : it)
    onChange({ ...section, items })
  }

  return (
    <>
      {section.items.map((item, i) => (
        <div key={item.id} className="resume-entry">
          <div className="entry-row">
            <EditableSpan value={item.institution} onChange={v => updateItem(i, { ...item, institution: v })} className="entry-role" />
            <EditableSpan value={item.dates} onChange={v => updateItem(i, { ...item, dates: v })} className="entry-dates" />
          </div>
          <div className="entry-sub">
            <EditableSpan value={item.degree} onChange={v => updateItem(i, { ...item, degree: v })} className="entry-company" />
            <span className="entry-sep">, </span>
            <EditableSpan value={item.location} onChange={v => updateItem(i, { ...item, location: v })} className="entry-location" />
          </div>
          {item.notes && item.notes.length > 0 && (
            <ul className="entry-bullets">
              {item.notes.map((n, ni) => (
                <li key={ni}>
                  <EditableSpan
                    value={n}
                    onChange={v => {
                      const notes = (item.notes ?? [])
                        .map((nn, nj) => nj === ni ? v : nn)
                        .filter(nn => nn.trim() !== '')
                      updateItem(i, { ...item, notes })
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </>
  )
}

function SkillsSection({ section, onChange }: { section: Extract<ResumeSection, { type: 'skills' }>, onChange: (s: ResumeSection) => void }) {
  function updateCat(idx: number, updated: SkillCategory) {
    const categories = section.categories.map((c, i) => i === idx ? updated : c)
    onChange({ ...section, categories })
  }

  return (
    <div className="skills-grid">
      {section.categories.map((cat, i) => (
        <div key={cat.id} className="skill-row">
          <EditableSpan value={cat.label} onChange={v => updateCat(i, { ...cat, label: v })} className="skill-label" />
          <span className="skill-sep">: </span>
          <EditableSpan
            value={cat.items.join(', ')}
            onChange={v => updateCat(i, { ...cat, items: v.split(',').map(s => s.trim()).filter(Boolean) })}
            className="skill-items"
          />
        </div>
      ))}
    </div>
  )
}

function ProjectsSection({ section, onChange }: { section: Extract<ResumeSection, { type: 'projects' }>, onChange: (s: ResumeSection) => void }) {
  function updateItem(idx: number, updated: ProjectItem) {
    const items = section.items.map((it, i) => i === idx ? updated : it)
    onChange({ ...section, items })
  }

  return (
    <>
      {section.items.map((item, i) => (
        <div key={item.id} className="resume-entry">
          <div className="entry-row entry-row--top">
            <div>
              <EditableSpan value={item.name} onChange={v => updateItem(i, { ...item, name: v })} className="entry-role" />
              {item.tech && (
                <>
                  <span className="entry-sep"> | </span>
                  <EditableSpan value={item.tech} onChange={v => updateItem(i, { ...item, tech: v })} className="entry-tech" />
                </>
              )}
            </div>
            {item.dates && (
              <EditableSpan value={item.dates} onChange={v => updateItem(i, { ...item, dates: v })} className="entry-dates" />
            )}
          </div>
          <ul className="entry-bullets">
            {item.bullets.map((b, bi) => (
              <li key={bi}>
                <EditableSpan
                  value={b}
                  onChange={v => {
                    const bullets = item.bullets
                      .map((bb, bj) => bj === bi ? v : bb)
                      .filter(bb => bb.trim() !== '')
                    updateItem(i, { ...item, bullets })
                  }}
                  multiline
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  )
}

export default function ResumeDoc({ resume, onChange, onExportPdf, onExportTex, paperRef, pdfExporting }: Props) {
  const { header, summary, sections } = resume

  function updateSection(idx: number, updated: ResumeSection) {
    const updated_sections = sections.map((s, i) => i === idx ? updated : s)
    onChange({ ...resume, sections: updated_sections })
  }

  return (
    <div className="resume-panel">
      <div className="panel-header">
        <span className="panel-label">Tailored Resume</span>
        <div className="panel-actions">
          <button className="btn-sm" onClick={onExportTex} title="Download .tex file">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download .tex
          </button>
          <button className="btn-sm btn-sm--primary" onClick={onExportPdf} disabled={pdfExporting} title="Export PDF">
            {pdfExporting
              ? <><span className="spinner spinner--sm" />Exporting...</>
              : <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                  </svg>
                  Export PDF
                </>
            }
          </button>
        </div>
      </div>

      <div className="resume-doc">
        <div className="doc-paper" ref={paperRef}>
        {/* Header block */}
        <div className="doc-header">
          <EditableSpan value={header.name} onChange={v => onChange({ ...resume, header: { ...header, name: v } })} className="doc-name" />
          <div className="doc-contact">
            {header.email && (
              <span className="doc-contact-item">
                <EditableSpan value={header.email} onChange={v => onChange({ ...resume, header: { ...header, email: v } })} className="doc-contact-link" />
              </span>
            )}
            {header.linkedin && (
              <span className="doc-contact-item">
                <a href={absoluteUrl(header.linkedin, 'https://')} target="_blank" rel="noreferrer" className="doc-contact-link">LinkedIn</a>
              </span>
            )}
            {header.website && (
              <span className="doc-contact-item">
                <a href={absoluteUrl(header.website, 'https://')} target="_blank" rel="noreferrer" className="doc-contact-link">Website</a>
              </span>
            )}
            {header.phone && (
              <span className="doc-contact-item">
                <EditableSpan value={header.phone} onChange={v => onChange({ ...resume, header: { ...header, phone: v } })} />
              </span>
            )}
            {header.location && (
              <span className="doc-contact-item">
                <EditableSpan value={header.location} onChange={v => onChange({ ...resume, header: { ...header, location: v } })} />
              </span>
            )}
            {header.github && (
              <span className="doc-contact-item">
                <a href={absoluteUrl(header.github, 'https://github.com/')} target="_blank" rel="noreferrer" className="doc-contact-link">GitHub</a>
              </span>
            )}
          </div>
        </div>

        {/* Summary */}
        {summary !== undefined && (
          <div className="doc-section">
            <div className="doc-section-title">Summary</div>
            <EditableSpan
              value={summary}
              onChange={v => onChange({ ...resume, summary: v })}
              className="doc-summary"
              multiline
            />
          </div>
        )}

        {/* Sections */}
        {sections.map((section, idx) => (
          <div key={section.id} className="doc-section">
            <div className="doc-section-title">
              <EditableSpan
                value={section.title}
                onChange={v => updateSection(idx, { ...section, title: v } as ResumeSection)}
              />
            </div>
            {section.type === 'experience' && (
              <ExperienceSection section={section} onChange={s => updateSection(idx, s)} />
            )}
            {section.type === 'education' && (
              <EducationSection section={section} onChange={s => updateSection(idx, s)} />
            )}
            {section.type === 'skills' && (
              <SkillsSection section={section} onChange={s => updateSection(idx, s)} />
            )}
            {section.type === 'projects' && (
              <ProjectsSection section={section} onChange={s => updateSection(idx, s)} />
            )}
            {section.type === 'publications' && (
              <ul className="entry-bullets">
                {section.items.map((item, pi) => (
                  <li key={item.id}>
                    <EditableSpan
                      value={item.citation}
                      onChange={v => {
                        const items = section.items
                          .map((it, j) => j === pi ? { ...it, citation: v } : it)
                          .filter(it => it.citation.trim() !== '')
                        updateSection(idx, { ...section, items })
                      }}
                      multiline
                    />
                  </li>
                ))}
              </ul>
            )}
            {section.type === 'custom' && (() => {
              const lines = latexToLines(section.content)
              return lines.length > 1 ? (
                <ul className="entry-bullets">
                  {lines.map((line, li) => (
                    <li key={li}>
                      <EditableSpan
                        value={line}
                        onChange={v => {
                          const updated = lines
                            .map((l, j) => j === li ? v : l)
                            .filter(l => l.trim() !== '')
                            .join('\n')
                          updateSection(idx, { ...section, content: updated })
                        }}
                        multiline
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <EditableSpan
                  value={stripLatex(section.content)}
                  onChange={v => updateSection(idx, { ...section, content: v })}
                  multiline
                />
              )
            })()}
          </div>
        ))}
        </div>{/* end doc-paper */}
      </div>
    </div>
  )
}

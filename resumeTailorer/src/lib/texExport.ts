import type { ResumeData } from '../types'

export function downloadTex(resume: ResumeData, filename = 'resume.tex') {
  const content = resume.rawTex ?? buildTexFromData(resume)
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function buildTexFromData(resume: ResumeData): string {
  const { header, summary, sections } = resume

  const contactLine = [
    header.phone && `\\faPhone\\ ${header.phone}`,
    header.email && `\\href{mailto:${header.email}}{\\faEnvelope\\ ${header.email}}`,
    header.linkedin && `\\href{${header.linkedin}}{\\faLinkedin\\ LinkedIn}`,
    header.github && `\\href{${header.github}}{\\faGithub\\ GitHub}`,
    header.website && `\\href{${header.website}}{\\faGlobe\\ ${header.website}}`,
  ].filter(Boolean).join(' $|$ ')

  const lines: string[] = [
    '\\documentclass[letterpaper,11pt]{article}',
    '\\usepackage{latexsym,fullpage,titlesec,marvosym,verbatim,enumitem,hyperref,fancyhdr,babel,fontawesome5}',
    '\\usepackage[usenames,dvipsnames]{color}',
    '\\usepackage[margin=1in]{geometry}',
    '\\pagestyle{fancy}\\fancyhf{}\\fancyfoot{}\\renewcommand{\\headrulewidth}{0pt}',
    '\\hypersetup{colorlinks=true,urlcolor=blue}',
    '\\begin{document}',
    '',
    '% Header',
    `\\begin{center}`,
    `  {\\Huge \\textbf{${header.name}}}\\\\[4pt]`,
    `  ${contactLine}`,
    `\\end{center}`,
    '',
  ]

  if (summary) {
    lines.push('\\section{Summary}', summary, '')
  }

  for (const section of sections) {
    lines.push(`\\section{${section.title}}`)

    if (section.type === 'experience') {
      for (const item of section.items) {
        lines.push(
          `\\textbf{${item.role}} \\hfill ${item.dates}\\\\`,
          `\\textit{${item.company}, ${item.location}}`,
          '\\begin{itemize}[leftmargin=0.15in,label={}]\\small',
          ...item.bullets.map(b => `  \\item ${b}`),
          '\\end{itemize}',
          '',
        )
      }
    } else if (section.type === 'education') {
      for (const item of section.items) {
        lines.push(
          `\\textbf{${item.institution}} \\hfill ${item.dates}\\\\`,
          `\\textit{${item.degree}}, ${item.location}`,
        )
        if (item.notes?.length) {
          lines.push('\\begin{itemize}[leftmargin=0.15in,label={}]\\small', ...item.notes.map(n => `  \\item ${n}`), '\\end{itemize}')
        }
        lines.push('')
      }
    } else if (section.type === 'skills') {
      lines.push('\\begin{itemize}[leftmargin=0.15in,label={}]\\small')
      for (const cat of section.categories) {
        lines.push(`  \\item \\textbf{${cat.label}:} ${cat.items.join(', ')}`)
      }
      lines.push('\\end{itemize}', '')
    } else if (section.type === 'projects') {
      for (const item of section.items) {
        const heading = item.tech ? `\\textbf{${item.name}} $|$ \\textit{${item.tech}}` : `\\textbf{${item.name}}`
        lines.push(`${heading}${item.dates ? ` \\hfill ${item.dates}` : ''}`)
        lines.push('\\begin{itemize}[leftmargin=0.15in,label={}]\\small', ...item.bullets.map(b => `  \\item ${b}`), '\\end{itemize}', '')
      }
    } else if (section.type === 'publications') {
      lines.push('\\begin{itemize}[leftmargin=0.15in]')
      for (const item of section.items) lines.push(`  \\item ${item.citation}`)
      lines.push('\\end{itemize}', '')
    } else if (section.type === 'custom') {
      lines.push(section.content, '')
    }
  }

  lines.push('\\end{document}')
  return lines.join('\n')
}

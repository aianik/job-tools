export type InputTab = 'latex' | 'text'

export type ExperienceItem = {
  id: string
  company: string
  role: string
  location: string
  dates: string
  bullets: string[]
}

export type EducationItem = {
  id: string
  institution: string
  degree: string
  location: string
  dates: string
  notes?: string[]
}

export type SkillCategory = {
  id: string
  label: string
  items: string[]
}

export type ProjectItem = {
  id: string
  name: string
  tech?: string
  dates?: string
  bullets: string[]
}

export type PublicationItem = {
  id: string
  citation: string
}

export type ResumeSection =
  | { type: 'experience'; id: string; title: string; items: ExperienceItem[] }
  | { type: 'education'; id: string; title: string; items: EducationItem[] }
  | { type: 'skills'; id: string; title: string; categories: SkillCategory[] }
  | { type: 'projects'; id: string; title: string; items: ProjectItem[] }
  | { type: 'publications'; id: string; title: string; items: PublicationItem[] }
  | { type: 'custom'; id: string; title: string; content: string }

export type ResumeHeader = {
  name: string
  email: string
  phone: string
  location: string
  linkedin?: string
  github?: string
  website?: string
}

export type ResumeData = {
  header: ResumeHeader
  summary?: string
  sections: ResumeSection[]
  rawTex?: string
  companyName?: string
}

export type ToastItem = {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

export type PersonaData = {
  targetRole: string
  tone: string
  strengths: string
  avoid: string
  headerInstructions: string
}

export type PdfFont = 'crimsonpro' | 'linux-libertine' | 'eb-garamond' | 'cormorant' | 'libre-baskerville'
export type PdfSize = 'compact' | 'regular' | 'spacious'

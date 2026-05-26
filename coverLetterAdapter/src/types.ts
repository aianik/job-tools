export type InputTab = 'base' | 'cv'
export type SourceTab = 'base' | 'cv' | 'persona'

export interface PersonaData {
  target?: string
  strengths?: string
  tone?: string
  avoid?: string
  voice?: string
  about?: string
}
export type PdfAlign = 'left' | 'center' | 'right' | 'justify'
export type ToastKind = 'ok' | 'err'

export interface ToastItem {
  id: number
  msg: string
  type: ToastKind
}

export interface CvFileData {
  type: 'pdf' | 'text'
  data: string
  name: string
}

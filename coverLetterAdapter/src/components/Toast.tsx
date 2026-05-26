import type { ToastItem } from '../types'

interface Props {
  toasts: ToastItem[]
}

export default function ToastContainer({ toasts }: Props) {
  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.type === 'ok' ? '✓ ' : '✕ '}{t.msg}
        </div>
      ))}
    </div>
  )
}

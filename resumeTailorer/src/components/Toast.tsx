import type { ToastItem } from '../types'

type Props = { toasts: ToastItem[]; onDismiss: (id: string) => void }

export default function Toast({ toasts, onDismiss }: Props) {
  if (!toasts.length) return null
  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast--${t.type}`} onClick={() => onDismiss(t.id)}>
          {t.message}
        </div>
      ))}
    </div>
  )
}

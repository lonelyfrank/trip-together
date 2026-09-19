import { AlertTriangle, Check, Info, X } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { dismissToast, getToasts, subscribeToasts, type ToastKind } from '../../lib/toast'

const ICON: Record<ToastKind, typeof Info> = { info: Info, error: AlertTriangle, success: Check }
const ACCENT: Record<ToastKind, string> = { info: 'text-fg-muted', error: 'text-danger-text', success: 'text-brand-text' }

export default function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts)

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 mx-auto flex max-w-lg flex-col items-center gap-2 px-4">
      {toasts.map((t) => {
        const Icon = ICON[t.kind]
        return (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex w-full items-center gap-2.5 rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 shadow-raised transition-all duration-200 ${
              t.leaving ? 'scale-95 opacity-0' : 'opacity-100'
            }`}
            style={t.leaving ? undefined : { animation: 'fade-slide-up 0.22s ease-out' }}
          >
            <Icon size={15} className={`shrink-0 ${ACCENT[t.kind]}`} />
            <p className="flex-1 text-[13px] text-fg">{t.message}</p>
            {t.action && (
              <button
                onClick={() => {
                  t.action!.onClick()
                  dismissToast(t.id)
                }}
                className="shrink-0 text-[12px] font-medium text-brand-text"
              >
                {t.action.label}
              </button>
            )}
            <button type="button" aria-label="Chiudi notifica" onClick={() => dismissToast(t.id)} className="flex h-11 w-11 shrink-0 items-center justify-center text-fg-muted">
              <X size={13} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

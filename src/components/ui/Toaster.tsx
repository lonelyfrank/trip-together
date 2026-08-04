import { AlertTriangle, Check, Info, X } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { dismissToast, getToasts, subscribeToasts, type ToastKind } from '../../lib/toast'

const ICON: Record<ToastKind, typeof Info> = { info: Info, error: AlertTriangle, success: Check }
const ACCENT: Record<ToastKind, string> = { info: 'text-muted', error: 'text-coral', success: 'text-teal' }

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
            className="pointer-events-auto flex w-full items-center gap-2.5 rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 shadow-lg"
          >
            <Icon size={15} className={`shrink-0 ${ACCENT[t.kind]}`} />
            <p className="flex-1 text-[12.5px] text-cream">{t.message}</p>
            {t.action && (
              <button
                onClick={() => {
                  t.action!.onClick()
                  dismissToast(t.id)
                }}
                className="shrink-0 text-[12px] font-medium text-teal"
              >
                {t.action.label}
              </button>
            )}
            <button onClick={() => dismissToast(t.id)} className="shrink-0 text-muted">
              <X size={13} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

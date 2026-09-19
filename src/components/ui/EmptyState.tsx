import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

// Sostituisce i <p className="text-sm text-fg-muted">Nessuna nota ancora.</p>
// sparsi in sei punti: uno stato vuoto dice anche cosa fare, non solo che non
// c'è niente.
interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  hint?: string
  action?: ReactNode
  className?: string
}

export default function EmptyState({ icon: Icon, title, hint, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center gap-2 rounded-[18px] border border-dashed border-line-dashed bg-surface/60 px-5 py-7 text-center ${className}`}>
      {Icon && (
        <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-canvas text-fg-muted">
          <Icon aria-hidden="true" size={20} />
        </div>
      )}
      <p className="text-sm font-medium text-fg">{title}</p>
      {hint && <p className="max-w-xs text-[13px] leading-relaxed text-fg-muted">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

// Intestazione di sezione dei mockup: icona + titolo a sinistra, azione
// secondaria ("Vedi tutti") a destra. Un solo componente evita che ogni
// sezione reinventi la propria gerarchia tipografica.
interface SectionHeaderProps {
  icon?: LucideIcon
  title: string
  hint?: string
  action?: ReactNode
  className?: string
}

export default function SectionHeader({ icon: Icon, title, hint, action, className = '' }: SectionHeaderProps) {
  return (
    <div className={`mb-3 flex items-center justify-between gap-3 ${className}`}>
      <div className="flex min-w-0 items-center gap-2">
        {Icon && <Icon aria-hidden="true" size={18} className="shrink-0 text-accent" />}
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold text-fg">{title}</h2>
          {hint && <p className="truncate text-[13px] text-fg-muted">{hint}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

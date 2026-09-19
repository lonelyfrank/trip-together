import { AlertTriangle, Info, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

// Unifica i tre banner d'avviso che erano scritti a mano in Room.tsx e altrove.
// `role="alert"` solo per danger/warn: un avviso informativo che interrompe il
// lettore di schermo è più fastidioso che utile.
const TONES = {
  info: { wrap: 'bg-info-soft text-fg', icon: Info, mark: 'text-info', live: false },
  warn: { wrap: 'bg-warn-soft text-fg', icon: TriangleAlert, mark: 'text-warn', live: true },
  danger: { wrap: 'bg-danger-soft text-fg', icon: AlertTriangle, mark: 'text-danger-text', live: true },
} as const

interface AlertBannerProps {
  tone?: keyof typeof TONES
  title: string
  children?: ReactNode
  action?: ReactNode
  className?: string
}

export default function AlertBanner({ tone = 'warn', title, children, action, className = '' }: AlertBannerProps) {
  const meta = TONES[tone]
  const Icon = meta.icon
  return (
    <div
      role={meta.live ? 'alert' : undefined}
      className={`flex items-start gap-3 rounded-2xl p-3.5 ${meta.wrap} ${className}`}
    >
      <Icon aria-hidden="true" size={18} className={`mt-0.5 shrink-0 ${meta.mark}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-[13px] font-bold ${meta.mark}`}>{title}</p>
        {children && <div className="mt-1 text-[13px] leading-relaxed text-fg-muted">{children}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  )
}

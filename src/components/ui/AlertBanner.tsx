import { AlertTriangle, Info, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

// Unifica i tre banner d'avviso che erano scritti a mano in Room.tsx e altrove.
// `role="alert"` solo per danger/warn: un avviso informativo che interrompe il
// lettore di schermo è più fastidioso che utile.
const TONES = {
  info: { wrap: 'border-info/25 bg-info/10 text-fg', icon: Info, mark: 'text-info', live: false },
  warn: { wrap: 'border-warn/25 bg-warn/10 text-fg', icon: TriangleAlert, mark: 'text-warn', live: true },
  danger: { wrap: 'border-danger/25 bg-danger/10 text-fg', icon: AlertTriangle, mark: 'text-danger', live: true },
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
      className={`flex items-start gap-3 rounded-[20px] border p-4 ${meta.wrap} ${className}`}
    >
      <Icon aria-hidden="true" size={18} className={`mt-0.5 shrink-0 ${meta.mark}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        {children && <div className="mt-1 text-[13px] leading-relaxed text-fg-muted">{children}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  )
}

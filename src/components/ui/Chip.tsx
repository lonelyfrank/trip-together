import type { ReactNode } from 'react'

// Toni semantici (ok/warn/danger/info) + gli alias storici usati dai
// componenti già scritti. `solid` serve dove il chip è l'unico portatore
// dello stato e una tinta al 12% non basterebbe a farlo notare.
const TONES = {
  muted: 'bg-canvas text-fg-muted',
  ok: 'bg-ok/12 text-ok',
  warn: 'bg-warn/12 text-warn',
  danger: 'bg-danger/12 text-danger',
  info: 'bg-info/12 text-info',
  solid: 'bg-accent text-on-accent',
  // Alias legacy.
  amber: 'bg-warn/12 text-warn',
  teal: 'bg-accent/12 text-accent',
  alert: 'bg-danger/12 text-danger',
} as const

interface ChipProps {
  children: ReactNode
  tone?: keyof typeof TONES
  className?: string
}

export default function Chip({ children, tone = 'muted', className = '' }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

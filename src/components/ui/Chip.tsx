import type { ReactNode } from 'react'

// StatusBadge del mockup: pillola tenue, testo 600. I toni storici (ok,
// warn, info, muted…) restano come alias per le pagine fuori dalla stanza.
const TONES = {
  brand: 'bg-brand-soft text-brand-text',
  blue: 'bg-blue-soft text-blue',
  purple: 'bg-purple-soft text-purple',
  warning: 'bg-warning-soft text-warning-text',
  danger: 'bg-danger-soft text-danger-text',
  grey: 'bg-grey-soft text-fg-muted',
  solid: 'bg-brand-button text-on-accent',
  // Alias
  muted: 'bg-grey-soft text-fg-muted',
  ok: 'bg-brand-soft text-brand-text',
  warn: 'bg-warning-soft text-warning-text',
  info: 'bg-blue-soft text-blue',
  amber: 'bg-warning-soft text-warning-text',
  teal: 'bg-brand-soft text-brand-text',
  alert: 'bg-danger-soft text-danger-text',
} as const

const SIZES = {
  md: 'px-2 py-[5px] text-[10.5px]',
  sm: 'px-2 py-1 text-[9.5px]',
} as const

export type ChipTone = keyof typeof TONES

interface ChipProps {
  children: ReactNode
  tone?: ChipTone
  size?: keyof typeof SIZES
  className?: string
}

export default function Chip({ children, tone = 'muted', size = 'md', className = '' }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full font-semibold leading-none ${TONES[tone]} ${SIZES[size]} ${className}`}
    >
      {children}
    </span>
  )
}

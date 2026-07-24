import type { ReactNode } from 'react'

const TONES = {
  muted: 'bg-ink text-muted',
  amber: 'bg-amber/15 text-amber',
  teal: 'bg-teal/15 text-teal',
  alert: 'bg-coral/15 text-coral',
} as const

interface ChipProps {
  children: ReactNode
  tone?: keyof typeof TONES
}

export default function Chip({ children, tone = 'muted' }: ChipProps) {
  return (
    <span className={`rounded-full px-2 py-1 font-mono text-[10px] ${TONES[tone]}`}>{children}</span>
  )
}

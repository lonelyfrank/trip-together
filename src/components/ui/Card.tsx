import type { ReactNode } from 'react'

const TONES = {
  surface: 'bg-surface/70 border border-border-soft',
  highlight: 'bg-gradient-to-br from-highlight-from to-highlight-to border border-border-strong',
  flat: 'bg-surface/30 opacity-70',
  dashed: 'border border-dashed border-border-dashed bg-transparent',
} as const

interface CardProps {
  children: ReactNode
  tone?: keyof typeof TONES
  className?: string
  onClick?: () => void
}

export default function Card({ children, tone = 'surface', className = '', onClick }: CardProps) {
  const base = `rounded-2xl p-4 transition-transform ${TONES[tone]} ${className}`

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`w-full text-left active:scale-[0.98] ${base}`}>
        {children}
      </button>
    )
  }

  return <div className={base}>{children}</div>
}

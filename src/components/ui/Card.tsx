import type { ReactNode } from 'react'

// Nel tema chiaro il separatore principale è l'ombra (il bordo da solo
// sparirebbe sul canvas grigio); nello scuro l'ombra è annullata dai token e
// resta il bordo. Stesse classi, resa corretta in entrambi i temi.
const TONES = {
  surface: 'bg-surface border border-line shadow-card',
  highlight: 'bg-gradient-to-br from-highlight-from to-highlight-to border border-line-strong shadow-card',
  flat: 'bg-surface/60 border border-line',
  dashed: 'border border-dashed border-line-dashed bg-transparent',
} as const

interface CardProps {
  children: ReactNode
  tone?: keyof typeof TONES
  className?: string
  onClick?: () => void
}

export default function Card({ children, tone = 'surface', className = '', onClick }: CardProps) {
  const base = `rounded-[20px] p-4 transition-transform ${TONES[tone]} ${className}`

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`w-full text-left active:scale-[0.98] ${base}`}>
        {children}
      </button>
    )
  }

  return <div className={base}>{children}</div>
}

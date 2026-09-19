import type { CSSProperties, ReactNode } from 'react'

// Card del mockup: bianca, bordo quasi invisibile, raggio 12, ombra doppia.
// Con `onClick` diventa un unico bottone: nel mockup il chevron nel titolo
// promette che tutta la card è tappabile, non solo la freccia.
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
  style?: CSSProperties
  onClick?: () => void
  /** Nome accessibile quando la card intera è un bottone. */
  label?: string
  /** Contenuto in riga (icona, testo, azione) invece che in colonna. */
  row?: boolean
}

export default function Card({ children, tone = 'surface', className = '', style, onClick, label, row = false }: CardProps) {
  const base = `overflow-hidden rounded-card p-[9px] ${TONES[tone]} ${className}`
  if (onClick) {
    // Un <button> centra il contenuto in verticale: in colonna, dall'alto,
    // come una card qualsiasi.
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        style={style}
        className={`press flex w-full text-left text-fg ${row ? 'flex-row items-center' : 'flex-col items-stretch justify-start'} ${base}`}
      >
        {children}
      </button>
    )
  }
  return (
    <div style={style} className={`${row ? 'flex items-center' : 'block'} ${base}`}>
      {children}
    </div>
  )
}

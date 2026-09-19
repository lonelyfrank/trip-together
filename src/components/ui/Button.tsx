import type { ButtonHTMLAttributes } from 'react'

// `primary` è il verde pieno del mockup (gradiente #00B26F → #00A468, testo
// bianco). `teal` resta come alias per i punti di chiamata esistenti.
const VARIANTS = {
  primary: 'bg-gradient-to-b from-brand-button-top to-brand-button text-on-accent shadow-cta',
  teal: 'bg-gradient-to-b from-brand-button-top to-brand-button text-on-accent shadow-cta',
  outline: 'border border-line-dashed/60 bg-surface text-fg',
  surface: 'bg-surface text-fg border border-line shadow-card',
  soft: 'bg-brand-soft text-brand-text',
  ghost: 'text-brand-text',
  danger: 'bg-danger-text text-on-accent',
} as const

const SIZES = {
  md: 'min-h-11 px-4 text-[13px] rounded-[10px]',
  sm: 'min-h-9 px-3 text-[11.5px] rounded-[10px]',
} as const

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS
  size?: keyof typeof SIZES
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`press press-btn flex items-center justify-center gap-1.5 font-bold disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

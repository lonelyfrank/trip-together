import type { ButtonHTMLAttributes } from 'react'

// `primary` è l'accento verde/turchese, non più l'ambra: l'ambra resta il
// colore dell'attenzione (ritardi, in attesa) e usarla anche per l'azione
// principale rendeva i due significati indistinguibili.
// `teal` è mantenuto come alias di `primary` per i punti di chiamata esistenti.
const VARIANTS = {
  primary: 'bg-accent text-on-accent font-semibold',
  teal: 'bg-accent text-on-accent font-semibold',
  outline: 'border border-line-strong text-fg',
  surface: 'bg-surface text-fg border border-line shadow-card',
  ghost: 'text-accent',
  danger: 'bg-danger text-on-accent font-semibold',
} as const

const SIZES = {
  md: 'min-h-12 py-3 px-4 text-sm rounded-xl',
  sm: 'min-h-11 py-2 px-3 text-xs rounded-xl',
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
      className={`flex items-center justify-center gap-1.5 font-medium transition-transform active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

import type { ButtonHTMLAttributes } from 'react'

const VARIANTS = {
  primary: 'bg-amber text-ink font-semibold',
  teal: 'bg-teal text-ink font-semibold',
  outline: 'border border-border-soft text-cream',
  surface: 'bg-surface text-cream border border-border-soft',
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

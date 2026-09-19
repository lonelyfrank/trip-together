// Coppie cerchio tenue + tratto dell'icona del mockup, per categoria.
export const ICON_TONES = {
  brand: { circle: 'bg-brand-soft', icon: 'text-brand' },
  blue: { circle: 'bg-blue-soft', icon: 'text-blue' },
  purple: { circle: 'bg-purple-soft', icon: 'text-purple' },
  warning: { circle: 'bg-warning-soft', icon: 'text-warning' },
  danger: { circle: 'bg-danger-soft', icon: 'text-danger' },
  grey: { circle: 'bg-grey-soft', icon: 'text-fg-muted' },
} as const

export type IconTone = keyof typeof ICON_TONES

/** Un'icona lucide o una delle icone su misura di components/icons. */
export type IconComponent = import('react').ComponentType<{
  size?: number | string
  strokeWidth?: number | string
  className?: string
  'aria-hidden'?: boolean | 'true' | 'false'
}>

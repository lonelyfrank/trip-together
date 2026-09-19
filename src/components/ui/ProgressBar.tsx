const TONES = {
  accent: 'bg-brand',
  ok: 'bg-brand',
  warn: 'bg-warning',
} as const

interface ProgressBarProps {
  value: number
  max: number
  tone?: keyof typeof TONES
  label?: string
  /** Altezza in px: 13 nel saldo di Spese, 6 nelle card piccole. */
  height?: number
  className?: string
}

export default function ProgressBar({ value, max, tone = 'accent', label, height = 6, className = '' }: ProgressBarProps) {
  const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={`relative overflow-hidden rounded-full bg-track ${className}`}
      style={{ height }}
    >
      <div
        className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out ${TONES[tone]}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

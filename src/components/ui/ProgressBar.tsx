const TONES = {
  accent: 'bg-accent',
  ok: 'bg-ok',
  warn: 'bg-warn',
} as const

interface ProgressBarProps {
  value: number
  max: number
  tone?: keyof typeof TONES
  label?: string
  className?: string
}

export default function ProgressBar({ value, max, tone = 'accent', label, className = '' }: ProgressBarProps) {
  const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={`h-2 overflow-hidden rounded-full bg-canvas ${className}`}
    >
      <div className={`h-full rounded-full transition-[width] duration-200 ${TONES[tone]}`} style={{ width: `${percent}%` }} />
    </div>
  )
}

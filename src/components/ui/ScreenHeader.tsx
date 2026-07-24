import type { ReactNode } from 'react'

interface ScreenHeaderProps {
  eyebrow: string
  title: string
  action?: ReactNode
}

export default function ScreenHeader({ eyebrow, title, action }: ScreenHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-4 px-4 pt-2 pb-4 sm:px-6">
      <div className="min-w-0">
        <p className="mb-1 truncate font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
          {eyebrow}
        </p>
        <h1 className="truncate font-serif text-[26px] leading-none text-cream">{title}</h1>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

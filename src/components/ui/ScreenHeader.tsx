import type { ReactNode } from 'react'

interface ScreenHeaderProps {
  eyebrow: string
  title: string
  action?: ReactNode
}

export default function ScreenHeader({ eyebrow, title, action }: ScreenHeaderProps) {
  return (
    <header className="flex items-end justify-between gap-4 px-4 pb-6 pt-6 sm:px-6">
      <div className="min-w-0">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted">
          {eyebrow}
        </p>
        <h1 className="break-words font-serif text-3xl leading-tight text-cream">{title}</h1>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}

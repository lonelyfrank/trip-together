import { Check, Circle, Dot } from 'lucide-react'
import type { PlanEntry } from '../../lib/todayPlan'

// Timeline verticale dei mockup. Gli orari sono formattati qui e non nel
// view-model: la stessa voce può comparire con granularità diverse.
const MARK = {
  done: { icon: Check, ring: 'border-accent bg-accent text-on-accent' },
  now: { icon: Dot, ring: 'border-warn bg-warn/15 text-warn' },
  next: { icon: Circle, ring: 'border-line-dashed bg-surface text-fg-muted' },
} as const

function timeLabel(at: string | null): string {
  if (!at) return '--:--'
  return new Date(at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

interface TimelineProps {
  entries: PlanEntry[]
  className?: string
}

export default function Timeline({ entries, className = '' }: TimelineProps) {
  return (
    <ol className={`space-y-0 ${className}`}>
      {entries.map((entry, index) => {
        const mark = MARK[entry.state]
        const Icon = mark.icon
        const last = index === entries.length - 1
        return (
          <li key={entry.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${mark.ring}`}
              >
                <Icon aria-hidden="true" size={13} strokeWidth={3} />
              </span>
              {!last && <span className="w-px flex-1 bg-line-strong" />}
            </div>
            <div className={`min-w-0 flex-1 ${last ? '' : 'pb-4'}`}>
              <p className="flex items-baseline gap-2">
                <span className="font-mono text-[12px] tabular-nums text-fg-muted">{timeLabel(entry.at)}</span>
                <span className="min-w-0 truncate text-[13px] font-medium text-fg">{entry.label}</span>
              </p>
              {entry.detail && <p className="truncate text-[12px] text-fg-muted">{entry.detail}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

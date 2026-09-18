import { AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import BottomSheet from '../ui/BottomSheet'
import Button from '../ui/Button'
import { mutateNotify } from '../../lib/db'
import { insertDelayReport, resolveDelayReport } from '../../lib/mutations'
import { formatRelativeTime } from '../../lib/time'
import type { DelayReason, DelayReport } from '../../types'

const REASON_LABELS: Record<DelayReason, string> = {
  traffico: 'Traffico',
  benzina: 'Rifornimento',
  dimenticanza: 'Dimenticanza',
  altro: 'Altro',
}

const REASONS: DelayReason[] = ['traffico', 'benzina', 'dimenticanza', 'altro']

interface DelayReportBadgeProps {
  carId: string
  currentMemberId: string
  canReport: boolean
  activeDelay: DelayReport | undefined
}

export default function DelayReportBadge({ carId, currentMemberId, canReport, activeDelay }: DelayReportBadgeProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<DelayReason | null>(null)
  const [minutes, setMinutes] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!reason) return
    setSaving(true)
    try {
      const { error } = await mutateNotify(
        'delay_reports.insert',
        insertDelayReport(carId, reason, minutes, currentMemberId),
        'Ritardo non segnalato.',
      )
      if (error) return
      setReason(null)
      setMinutes(null)
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function resolve() {
    if (!activeDelay) return
    await mutateNotify(
      'delay_reports.resolve',
      resolveDelayReport(activeDelay.id, new Date().toISOString()),
      'Ritardo non chiuso.',
    )
  }

  if (activeDelay) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <AlertTriangle size={13} className="shrink-0 text-danger" />
          <div>
            <p className="text-[12px] text-fg">
              Ritardo: {REASON_LABELS[activeDelay.reason]}
              {activeDelay.minutes_estimate ? ` · ~${activeDelay.minutes_estimate} min` : ''}
            </p>
            <p className="font-mono text-[10px] text-fg-muted">segnalato {formatRelativeTime(activeDelay.created_at)}</p>
          </div>
        </div>
        {canReport && (
          <button onClick={resolve} className="shrink-0 font-mono text-[10px] text-fg-muted underline">
            risolto
          </button>
        )}
      </div>
    )
  }

  if (!canReport) return null

  return (
    <>
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <AlertTriangle size={13} /> Segnala ritardo
      </Button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Segnala ritardo">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {REASONS.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={`rounded-full px-3 py-1.5 text-[12px] ${
                  reason === r ? 'bg-danger text-on-accent' : 'bg-canvas text-fg-muted'
                }`}
              >
                {REASON_LABELS[r]}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-xl bg-canvas px-4 py-2.5">
            <span className="text-[12px] text-fg-muted">Minuti stimati (opzionale)</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMinutes((m) => (m && m > 5 ? m - 5 : null))}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-surface text-fg"
              >
                −
              </button>
              <span className="w-16 text-center font-mono text-[12px] text-fg">
                {minutes ? `~${minutes} min` : '—'}
              </span>
              <button
                onClick={() => setMinutes((m) => (m ?? 0) + 5)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-surface text-fg"
              >
                +
              </button>
            </div>
          </div>

          <Button variant="teal" disabled={!reason || saving} onClick={submit}>
            Segnala
          </Button>
        </div>
      </BottomSheet>
    </>
  )
}

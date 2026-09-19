import { Check } from 'lucide-react'
import { useState } from 'react'
import BottomSheet from '../ui/BottomSheet'
import Chip from '../ui/Chip'
import { useSetTravelStatus } from '../../hooks/useSetTravelStatus'
import { formatRelativeTime } from '../../lib/time'
import type { Car, TravelStatus } from '../../types'

const STATUS_META: Record<TravelStatus, { label: string; tone: 'muted' | 'amber' | 'teal' | 'alert' }> = {
  non_partita: { label: 'Non partita', tone: 'muted' },
  in_partenza: { label: 'In partenza', tone: 'amber' },
  in_viaggio: { label: 'In viaggio', tone: 'teal' },
  fermo: { label: 'Ferma', tone: 'alert' },
  arrivata: { label: 'Arrivata', tone: 'teal' },
}

const SELECTABLE: TravelStatus[] = ['in_partenza', 'in_viaggio', 'fermo', 'arrivata']

interface TravelStatusChipProps {
  car: Car
  currentMemberId: string
  canEdit: boolean
}

interface TravelStatusSheetProps {
  car: Car
  currentMemberId: string
  open: boolean
  onClose: () => void
}

export function TravelStatusSheet({ car, currentMemberId, open, onClose }: TravelStatusSheetProps) {
  const setStatus = useSetTravelStatus(car.room_id, currentMemberId)
  return (
    <BottomSheet open={open} onClose={onClose} title="Aggiorna stato viaggio">
      <div className="space-y-2">
        {SELECTABLE.map((status) => {
          const optionMeta = STATUS_META[status]
          const current = car.travel_status === status
          return (
            <button
              key={status}
              type="button"
              aria-pressed={current}
              onClick={() => {
                onClose()
                setStatus(car, status)
              }}
              className={`press flex min-h-12 w-full items-center justify-between rounded-card border px-4 ${
                current ? 'border-brand bg-brand-soft' : 'border-line bg-surface shadow-card'
              }`}
            >
              <p className="text-[13px] font-semibold text-fg">{optionMeta.label}</p>
              {current && <Check aria-hidden="true" size={16} className="text-brand-text" />}
            </button>
          )
        })}
      </div>
    </BottomSheet>
  )
}

export default function TravelStatusChip({ car, currentMemberId, canEdit }: TravelStatusChipProps) {
  const [open, setOpen] = useState(false)
  const meta = STATUS_META[car.travel_status]

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button type="button" onClick={() => canEdit && setOpen(true)} disabled={!canEdit} aria-label={`Stato viaggio: ${meta.label}${canEdit ? ', modifica' : ''}`}>
        <Chip tone={meta.tone}>
          {car.travel_status === 'arrivata' && <Check size={10} />}
          {meta.label}
        </Chip>
      </button>
      <span className="text-[10px] text-fg-muted">
        aggiornato {formatRelativeTime(car.travel_status_updated_at)}
      </span>

      <TravelStatusSheet car={car} currentMemberId={currentMemberId} open={open} onClose={() => setOpen(false)} />
    </div>
  )
}

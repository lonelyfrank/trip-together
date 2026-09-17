import { Check } from 'lucide-react'
import { useState } from 'react'
import BottomSheet from '../ui/BottomSheet'
import Chip from '../ui/Chip'
import { useRoomOptimistic } from '../../hooks/useRoomOptimistic'
import { mutate } from '../../lib/db'
import { resolveDelayReportsForCar, setCarTravelStatus } from '../../lib/mutations'
import { formatRelativeTime } from '../../lib/time'
import type { Car, TravelStatus } from '../../types'

const STATUS_META: Record<TravelStatus, { label: string; tone: 'muted' | 'amber' | 'teal' | 'alert' }> = {
  non_partita: { label: 'Non partita', tone: 'muted' },
  in_partenza: { label: 'In partenza', tone: 'amber' },
  in_viaggio: { label: 'In viaggio', tone: 'teal' },
  fermo: { label: 'Fermo', tone: 'alert' },
  arrivata: { label: 'Arrivata', tone: 'teal' },
}

const SELECTABLE: TravelStatus[] = ['in_partenza', 'in_viaggio', 'fermo', 'arrivata']

interface TravelStatusChipProps {
  car: Car
  currentMemberId: string
  canEdit: boolean
}

export default function TravelStatusChip({ car, currentMemberId, canEdit }: TravelStatusChipProps) {
  const [open, setOpen] = useState(false)
  const optimistic = useRoomOptimistic(car.room_id)
  const meta = STATUS_META[car.travel_status]

  function setStatus(status: TravelStatus) {
    const now = new Date().toISOString()
    setOpen(false)
    optimistic(
      'cars.setTravelStatus',
      (prev) => ({
        ...prev,
        cars: prev.cars.map((c) =>
          c.id === car.id
            ? { ...c, travel_status: status, travel_status_updated_at: now, travel_status_updated_by: currentMemberId }
            : c,
        ),
      }),
      () => setCarTravelStatus(car.id, status, currentMemberId, now),
      'Stato viaggio non aggiornato.',
    )

    if (status === 'arrivata') {
      mutate('delay_reports.resolveOnArrival', resolveDelayReportsForCar(car.id, now))
    }
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button onClick={() => canEdit && setOpen(true)} disabled={!canEdit}>
        <Chip tone={meta.tone}>
          {car.travel_status === 'arrivata' && <Check size={10} />}
          {meta.label}
        </Chip>
      </button>
      <span className="font-mono text-[10px] text-muted">
        aggiornato {formatRelativeTime(car.travel_status_updated_at)}
      </span>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Aggiorna stato viaggio">
        <div className="space-y-2">
          {SELECTABLE.map((status) => {
            const optionMeta = STATUS_META[status]
            return (
              <button
                key={status}
                onClick={() => setStatus(status)}
                className="flex w-full items-center justify-between rounded-2xl bg-ink px-4 py-3.5 transition-transform active:scale-[0.98]"
              >
                <p className="text-[13px] font-medium text-cream">{optionMeta.label}</p>
                <Chip tone={optionMeta.tone}>&nbsp;</Chip>
              </button>
            )
          })}
        </div>
      </BottomSheet>
    </div>
  )
}

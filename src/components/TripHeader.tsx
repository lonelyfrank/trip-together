import { Calendar, ChevronDown, MapPin } from 'lucide-react'
import { useState } from 'react'
import Chip from './ui/Chip'
import TripSwitcher from './TripSwitcher'
import { formatEventTime } from '../lib/format'
import type { RoomPhase } from '../lib/phase'
import type { Room } from '../types'

// Un solo livello di intestazione invece dei tre sovrapposti dei mockup
// (logo+tagline, titolo viaggio, titolo sezione): lì occupavano ~250px prima
// del contenuto. Titolo, contesto e stato stanno in una riga sola, e il
// titolo stesso è il punto di accesso al cambio evento.
const PHASE: Record<RoomPhase, { label: string; tone: 'muted' | 'ok' | 'warn' }> = {
  pre: { label: 'In programma', tone: 'warn' },
  in_corso: { label: 'Viaggio in corso', tone: 'ok' },
  concluso: { label: 'Concluso', tone: 'muted' },
}

interface TripHeaderProps {
  room: Room
  phase: RoomPhase
  memberCount: number
}

export default function TripHeader({ room, phase, memberCount }: TripHeaderProps) {
  const [switching, setSwitching] = useState(false)
  const meta = PHASE[phase]

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-4xl items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => setSwitching(true)}
            aria-haspopup="dialog"
            className="flex min-h-11 max-w-full items-center gap-1.5 text-left"
          >
            <h1 className="truncate font-serif text-xl leading-tight text-fg sm:text-2xl">{room.title}</h1>
            <ChevronDown aria-hidden="true" size={18} className="shrink-0 text-fg-muted" />
            <span className="sr-only">Cambia evento</span>
          </button>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-fg-muted">
            <span className="flex items-center gap-1">
              <Calendar aria-hidden="true" size={13} />
              {room.event_time ? formatEventTime(room.event_time) : 'Data da scegliere'}
            </span>
            <span className="flex items-center gap-1">
              <MapPin aria-hidden="true" size={13} />
              {room.destination_label || 'Destinazione da scegliere'}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Chip tone={meta.tone}>{meta.label}</Chip>
          <span className="font-mono text-[11px] text-fg-muted">
            {memberCount} {memberCount === 1 ? 'membro' : 'membri'} · #{room.invite_code}
          </span>
        </div>
      </div>
      <TripSwitcher open={switching} onClose={() => setSwitching(false)} currentRoomId={room.id} />
    </header>
  )
}

import { CalendarClock, Navigation, Share2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Chip from '../ui/Chip'
import { formatEventTime } from '../../lib/format'
import { shareOrCopy } from '../../lib/share'
import type { RoomPhase } from '../../lib/phase'
import type { Room } from '../../types'

// Al posto della "route card" dei mockup: mappa, chilometri, durata ed ETA
// richiederebbero un provider cartografico e un servizio di routing, che il
// progetto non ha. Qui restano i dati reali — quando si parte, da dove, e
// l'apertura del percorso nelle app di navigazione già supportate.

function countdown(target: number, now: number): string {
  const minutes = Math.round((target - now) / 60_000)
  if (minutes <= 0) return 'adesso'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours < 24) return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
  const days = Math.round(hours / 24)
  return `${days} ${days === 1 ? 'giorno' : 'giorni'}`
}

interface DepartureCardProps {
  room: Room
  phase: RoomPhase
  onOpenRoute: () => void
}

export default function DepartureCard({ room, phase, onOpenRoute }: DepartureCardProps) {
  const [now, setNow] = useState(() => Date.now())
  const [shared, setShared] = useState(false)

  const target = room.event_time ? Date.parse(room.event_time) : null
  const ticking = phase === 'pre' && target !== null && target > now

  useEffect(() => {
    if (!ticking) return
    // Un minuto basta: il countdown è espresso in minuti.
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [ticking])

  async function shareMeetingPoint() {
    const parts = [room.destination_label, room.event_time ? formatEventTime(room.event_time) : null].filter(Boolean)
    const result = await shareOrCopy({
      title: `Ritrovo · ${room.title}`,
      text: parts.length > 0 ? `Ci vediamo a ${parts.join(' · ')}` : `Ritrovo per "${room.title}"`,
      url: `${window.location.origin}/room/${room.id}/viaggio`,
    })
    if (result === 'copied') {
      setShared(true)
      setTimeout(() => setShared(false), 1500)
    }
  }

  const hasCoords = room.destination_lat !== null && room.destination_lng !== null

  return (
    <Card tone="highlight" className="!p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-widest text-fg-muted">
            {phase === 'concluso' ? 'Viaggio concluso' : ticking ? 'Partenza tra' : 'Ritrovo'}
          </p>
          <p className="mt-1.5 font-serif text-3xl leading-none text-fg">
            {ticking && target !== null
              ? countdown(target, now)
              : room.event_time
                ? formatEventTime(room.event_time)
                : 'Da decidere'}
          </p>
          {ticking && room.event_time && (
            <p className="mt-2 flex items-center gap-1.5 text-[13px] text-fg-muted">
              <CalendarClock aria-hidden="true" size={15} />
              {formatEventTime(room.event_time)}
            </p>
          )}
        </div>
        {phase === 'in_corso' && <Chip tone="ok">in viaggio</Chip>}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
        {hasCoords && (
          <Button size="sm" onClick={onOpenRoute}>
            <Navigation size={15} /> Apri percorso
          </Button>
        )}
        <Button variant="surface" size="sm" onClick={shareMeetingPoint}>
          <Share2 size={15} /> {shared ? 'Copiato!' : 'Condividi ritrovo'}
        </Button>
      </div>
    </Card>
  )
}

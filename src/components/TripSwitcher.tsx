import { ArrowUpRight, Calendar, ChevronRight, MapPin, UsersRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BottomSheet from './ui/BottomSheet'
import Button from './ui/Button'
import Chip from './ui/Chip'
import EmptyState from './ui/EmptyState'
import { SkeletonCard } from './ui/Skeleton'
import { useMyCrews } from '../hooks/useMyCrews'
import { useMyRooms } from '../hooks/useMyRooms'
import { formatEventTime } from '../lib/format'

// Con la navigazione legata alla stanza, cambiare evento non deve più passare
// dalla Home: lo switcher riusa useMyRooms/useMyCrews (già in cache) e resta
// un bottom sheet, l'unico pattern di overlay del progetto.
interface TripSwitcherProps {
  open: boolean
  onClose: () => void
  currentRoomId: string
}

export default function TripSwitcher({ open, onClose, currentRoomId }: TripSwitcherProps) {
  const navigate = useNavigate()
  const { summaries, isLoading } = useMyRooms()
  const { summaries: crews } = useMyCrews()

  const others = summaries.filter(({ room }) => room.id !== currentRoomId)
  const open_ = others.filter(({ room }) => room.status === 'open')
  const archived = others.filter(({ room }) => room.status === 'closed')

  function go(path: string) {
    onClose()
    navigate(path)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Cambia evento">
      <div className="space-y-5 pb-2">
        {isLoading ? (
          <div className="space-y-2"><SkeletonCard /><SkeletonCard /></div>
        ) : open_.length === 0 && archived.length === 0 ? (
          <EmptyState
            title="Questo è il tuo unico evento"
            hint="Creane un altro o entra con un invito per trovarli qui."
          />
        ) : (
          <>
            {open_.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-widest text-fg-muted">In programma</h3>
                <ul className="space-y-1.5">
                  {open_.map(({ room, memberCount }) => (
                    <li key={room.id}>
                      <button
                        type="button"
                        onClick={() => go(`/room/${room.id}/adesso`)}
                        className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left transition-transform active:scale-[0.98]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-fg">{room.title}</p>
                          <p className="mt-0.5 flex items-center gap-2 truncate text-[12px] text-fg-muted">
                            <Calendar aria-hidden="true" size={13} />
                            {room.event_time ? formatEventTime(room.event_time) : 'Data da scegliere'}
                            <MapPin aria-hidden="true" size={13} />
                            {room.destination_label || 'Destinazione da scegliere'}
                          </p>
                        </div>
                        <Chip tone="muted">{memberCount}</Chip>
                        <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-fg-muted" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {archived.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-widest text-fg-muted">Archiviati</h3>
                <ul className="space-y-1.5">
                  {archived.map(({ room }) => (
                    <li key={room.id}>
                      <button
                        type="button"
                        onClick={() => go(`/room/${room.id}/adesso`)}
                        className="flex w-full items-center gap-3 rounded-2xl border border-line p-3 text-left"
                      >
                        <p className="min-w-0 flex-1 truncate text-sm text-fg-muted">{room.title}</p>
                        <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-fg-muted" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {crews.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-widest text-fg-muted">Le tue comitive</h3>
            <ul className="space-y-1.5">
              {crews.map(({ crew, eventCount }) => (
                <li key={crew.id}>
                  <button
                    type="button"
                    onClick={() => go(`/crew/${crew.id}`)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-line p-3 text-left"
                  >
                    <UsersRound aria-hidden="true" size={18} className="shrink-0 text-accent" />
                    <p className="min-w-0 flex-1 truncate text-sm text-fg">{crew.name}</p>
                    <span className="shrink-0 text-[12px] text-fg-muted">{eventCount} eventi</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Button variant="surface" className="w-full" onClick={() => go('/')}>
          <ArrowUpRight size={16} /> Tutti i tuoi eventi
        </Button>
      </div>
    </BottomSheet>
  )
}

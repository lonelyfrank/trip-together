import { Calendar, ChevronRight, MapPin, Plus, Ticket, Users, UsersRound, Zap } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomSheet from '../components/ui/BottomSheet'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Chip from '../components/ui/Chip'
import ScreenHeader from '../components/ui/ScreenHeader'
import { useMyCrews } from '../hooks/useMyCrews'
import { useMyRooms } from '../hooks/useMyRooms'
import { tintForRoom } from '../lib/eventTint'
import { getMyName } from '../lib/localRooms'
import { createCrew, createRoomAndJoin } from '../lib/membership'

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleString('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type SheetMode = 'event' | 'crew' | null

export default function Home() {
  const navigate = useNavigate()
  const { summaries, loading: loadingRooms } = useMyRooms()
  const { summaries: crews, loading: loadingCrews } = useMyCrews()
  const myName = getMyName()

  const [sheet, setSheet] = useState<SheetMode>(null)
  const [title, setTitle] = useState('')
  const [name, setName] = useState(myName)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [joining, setJoining] = useState(false)
  const [joinCode, setJoinCode] = useState('')

  // Nella Home mostriamo solo gli eventi standalone; quelli dentro una comitiva
  // vivono nella pagina della rispettiva comitiva.
  const standalone = summaries.filter((s) => !s.room.crew_id)
  const openRooms = standalone.filter((s) => s.room.status === 'open')
  const closedRooms = standalone.filter((s) => s.room.status === 'closed')

  const loading = loadingRooms || loadingCrews
  const showOnboarding = !loading && summaries.length === 0 && crews.length === 0

  async function submitSheet(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !name.trim() || !sheet) return
    setSubmitting(true)
    setError(null)
    try {
      if (sheet === 'crew') {
        const crewId = await createCrew(title, name)
        navigate(`/crew/${crewId}`)
      } else {
        const roomId = await createRoomAndJoin(title, name)
        navigate(`/room/${roomId}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto')
    } finally {
      setSubmitting(false)
    }
  }

  function goToJoin(e: FormEvent) {
    e.preventDefault()
    if (!joinCode.trim()) return
    navigate(`/join/${joinCode.trim().toUpperCase()}`)
  }

  function openSheet(mode: 'event' | 'crew') {
    setName(getMyName())
    setTitle('')
    setError(null)
    setSheet(mode)
  }

  const joinForm = (
    <form onSubmit={goToJoin} className="flex flex-col gap-2">
      <input
        autoFocus
        className="rounded-lg border border-border-soft bg-surface px-3 py-2 uppercase text-cream placeholder:text-muted placeholder:normal-case"
        placeholder="Codice invito"
        value={joinCode}
        onChange={(e) => setJoinCode(e.target.value)}
      />
      <div className="flex gap-2">
        <Button type="submit" variant="teal" className="flex-1">
          Continua
        </Button>
        <Button type="button" variant="outline" onClick={() => setJoining(false)}>
          Annulla
        </Button>
      </div>
    </form>
  )

  const crewsSection = crews.length > 0 && (
    <div>
      <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Le tue comitive</p>
      <div className="space-y-2.5">
        {crews.map(({ crew, memberCount, eventCount }) => (
          <Card key={crew.id} tone="highlight" onClick={() => navigate(`/crew/${crew.id}`)}>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal/15">
                <UsersRound size={19} className="text-teal" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-serif text-[16px] leading-tight text-cream">{crew.name}</p>
                <p className="mt-0.5 font-mono text-[11px] text-muted">
                  {memberCount} partecipanti · {eventCount} event{eventCount === 1 ? 'o' : 'i'}
                </p>
              </div>
              <ChevronRight size={16} className="shrink-0 text-muted" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )

  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col bg-ink">
      {showOnboarding ? (
        <>
          <ScreenHeader eyebrow={myName ? `Ciao, ${myName}` : 'Trip Together'} title="Cosa vuoi fare?" />

          <div className="flex-1 space-y-3 px-4 pb-10 sm:px-6">
            {error && <p className="rounded-xl bg-coral/10 px-4 py-2 text-sm text-coral">{error}</p>}

            <Card tone="highlight" onClick={() => openSheet('event')}>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber/15">
                  <Zap size={19} className="text-amber" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-[16px] leading-tight text-cream">Crea un evento rapido</p>
                  <p className="mt-0.5 text-[12px] text-muted">Un singolo ritrovo: destinazione, auto, spese.</p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-muted" />
              </div>
            </Card>

            <Card tone="highlight" onClick={() => openSheet('crew')}>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal/15">
                  <UsersRound size={19} className="text-teal" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-[16px] leading-tight text-cream">Crea una comitiva</p>
                  <p className="mt-0.5 text-[12px] text-muted">Un gruppo stabile con più eventi nel tempo.</p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-muted" />
              </div>
            </Card>

            <Card onClick={() => setJoining(true)}>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface">
                  <Ticket size={19} className="text-muted" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-[16px] leading-tight text-cream">Ho un invito</p>
                  <p className="mt-0.5 text-[12px] text-muted">Entra in una stanza o comitiva con link o codice.</p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-muted" />
              </div>
            </Card>

            {joining && <div className="pt-1">{joinForm}</div>}
          </div>
        </>
      ) : (
        <>
          <ScreenHeader eyebrow="I tuoi eventi" title={myName ? `Ciao, ${myName}` : 'Trip Together'} />

          <div className="flex-1 space-y-5 px-4 pb-28 sm:px-6">
            {error && !sheet && <p className="rounded-xl bg-coral/10 px-4 py-2 text-sm text-coral">{error}</p>}

            {crewsSection}

            <div>
              <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Eventi in arrivo</p>
              {openRooms.length === 0 && (
                <p className="text-sm text-muted">Nessun evento singolo. Creane uno o entra con un codice.</p>
              )}
              <div className="space-y-2.5">
                {openRooms.map(({ room, memberCount, openBalance, radarActive }) => (
                  <Card key={room.id} onClick={() => navigate(`/room/${room.id}`)}>
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                        style={{ background: `${tintForRoom(room.id)}22` }}
                      >
                        <Users size={19} style={{ color: tintForRoom(room.id) }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-serif text-[16px] leading-tight text-cream">{room.title}</p>
                        <div className="mt-0.5 flex flex-col gap-0.5">
                          {room.event_time && (
                            <span className="flex items-center gap-1 font-mono text-[11px] text-muted">
                              <Calendar size={10} /> {formatEventTime(room.event_time)}
                            </span>
                          )}
                          {room.destination_label && (
                            <span className="flex items-center gap-1 truncate font-mono text-[11px] text-muted">
                              <MapPin size={10} /> {room.destination_label}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={16} className="shrink-0 text-muted" />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 pl-14">
                      <Chip>
                        {memberCount} member{memberCount === 1 ? 'o' : 'i'}
                      </Chip>
                      {openBalance && <Chip tone="alert">saldi aperti</Chip>}
                      {radarActive && <Chip tone="teal">radar attivo</Chip>}
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {closedRooms.length > 0 && (
              <div>
                <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Archiviati</p>
                <div className="space-y-2.5">
                  {closedRooms.map(({ room, memberCount }) => (
                    <Card key={room.id} tone="flat">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink">
                          <Users size={18} className="text-muted" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] text-cream">{room.title}</p>
                          <p className="mt-0.5 font-mono text-[11px] text-muted">{memberCount} membri · saldi chiusi</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {joining ? (
              joinForm
            ) : (
              <button
                onClick={() => setJoining(true)}
                className="flex items-center gap-1.5 font-mono text-[11px] text-muted underline underline-offset-2"
              >
                <Ticket size={12} /> Hai un codice invito?
              </button>
            )}
          </div>

          <div className="fixed inset-x-0 bottom-0 mx-auto flex max-w-lg gap-2 bg-gradient-to-t from-ink via-ink px-4 pb-8 pt-4 sm:px-6">
            <Button variant="surface" className="flex-1" onClick={() => openSheet('crew')}>
              <UsersRound size={16} /> Comitiva
            </Button>
            <Button className="flex-1" onClick={() => openSheet('event')}>
              <Plus size={16} /> Evento
            </Button>
          </div>
        </>
      )}

      <BottomSheet
        open={sheet !== null}
        onClose={() => setSheet(null)}
        title={sheet === 'crew' ? 'Nuova comitiva' : 'Nuovo evento'}
      >
        <form onSubmit={submitSheet} className="flex flex-col gap-3">
          {error && sheet && <p className="rounded-xl bg-coral/10 px-4 py-2 text-sm text-coral">{error}</p>}
          <input
            autoFocus
            className="rounded-lg border border-border-soft bg-ink px-3 py-2.5 text-cream placeholder:text-muted"
            placeholder={sheet === 'crew' ? 'Nome comitiva (es. I soliti otto)' : 'Nome evento (es. Ritrovo al Faro)'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="rounded-lg border border-border-soft bg-ink px-3 py-2.5 text-cream placeholder:text-muted"
            placeholder="Il tuo nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" disabled={submitting || !title.trim() || !name.trim()}>
            {submitting ? 'Creazione...' : sheet === 'crew' ? 'Crea comitiva' : 'Crea evento'}
          </Button>
          {sheet === 'event' && (
            <p className="text-center font-mono text-[10px] text-muted">
              Destinazione e data si impostano dentro l’evento.
            </p>
          )}
        </form>
      </BottomSheet>
    </div>
  )
}

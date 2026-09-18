import { ArrowLeft, Calendar, CalendarPlus, Check, ChevronRight, MapPin, Plus, Share2, UserRound, Users, UsersRound } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Avatar from '../components/ui/Avatar'
import BottomSheet from '../components/ui/BottomSheet'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Chip from '../components/ui/Chip'
import EmptyState from '../components/ui/EmptyState'
import ScreenHeader from '../components/ui/ScreenHeader'
import SectionHeader from '../components/ui/SectionHeader'
import TextField from '../components/ui/TextField'
import { SkeletonCard, SkeletonHeader } from '../components/ui/Skeleton'
import { useCrewData } from '../hooks/useCrewData'
import { tintForRoom } from '../lib/eventTint'
import { formatEventTime } from '../lib/format'
import { getMyName, getSavedCrewEntry } from '../lib/localRooms'
import { createRoomAndJoin, joinRoomAsMember } from '../lib/membership'
import { shareOrCopy } from '../lib/share'

export default function CrewPage() {
  const { crewId } = useParams<{ crewId: string }>()
  const navigate = useNavigate()
  const { isLoading, error: loadError, notFound, crew, members, events } = useCrewData(crewId)

  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shared, setShared] = useState(false)

  const entry = crewId ? getSavedCrewEntry(crewId) : null

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-svh max-w-4xl flex-col">
        <SkeletonHeader />
        <div className="flex-1 space-y-2.5 px-4 pb-10 sm:px-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="mx-auto flex min-h-svh max-w-4xl flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-danger">Non riusciamo a caricare la comitiva.</p>
        <p className="text-sm text-fg-muted">Controlla la connessione e riprova.</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Riprova
        </Button>
      </div>
    )
  }

  if (notFound || !crew || !entry) {
    return (
      <div className="mx-auto flex min-h-svh max-w-4xl flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-fg">Comitiva non trovata, o non ne fai parte.</p>
        <button onClick={() => navigate('/')} className="min-h-11 text-sm text-fg-muted underline">
          Torna alla home
        </button>
      </div>
    )
  }

  const myName = members.find((m) => m.id === entry.crewMemberId)?.display_name ?? getMyName()

  async function createEvent(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !crewId) return
    setSubmitting(true)
    setError(null)
    try {
      const roomId = await createRoomAndJoin(title, myName, crewId)
      navigate(`/room/${roomId}`)
    } catch (err) {
      console.error('[creazione evento comitiva]', err)
      setError('Non riusciamo a creare l’evento. Riprova tra un momento.')
    } finally {
      setSubmitting(false)
    }
  }

  async function openEvent(roomId: string, inviteCode: string) {
    // I membri della comitiva entrano negli eventi senza passare dal form codice.
    try {
      await joinRoomAsMember(roomId, inviteCode, myName)
      navigate(`/room/${roomId}`)
    } catch (err) {
      console.error('[ingresso evento comitiva]', err)
      setError(
        'Non riusciamo ad aprire l’evento. Potrebbe essere archiviato: chiedi un link di recupero a chi partecipava.',
      )
    }
  }

  async function invite() {
    const result = await shareOrCopy({
      title: crew!.name,
      text: `Unisciti alla comitiva "${crew!.name}" su Trip Together`,
      url: `${window.location.origin}/join/${crew!.invite_code}`,
    })
    if (result === 'copied') {
      setShared(true)
      setTimeout(() => setShared(false), 1500)
    }
  }

  const openEvents = events.filter((r) => r.status === 'open')
  const closedEvents = events.filter((r) => r.status === 'closed')

  return (
    <div className="mx-auto flex min-h-svh max-w-4xl flex-col">
      <div className="flex items-center justify-between gap-3 px-4 pt-3 sm:px-6">
        <button
          onClick={() => navigate('/')}
          className="flex min-h-11 items-center gap-1 text-[13px] text-fg-muted active:opacity-60"
        >
          <ArrowLeft aria-hidden="true" size={15} /> Home
        </button>
        <button
          type="button"
          onClick={() => navigate('/profilo')}
          aria-label="Apri il tuo profilo"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-fg-muted shadow-card"
        >
          <UserRound aria-hidden="true" size={19} />
        </button>
      </div>

      <ScreenHeader
        eyebrow={`Comitiva · #${crew.invite_code}`}
        title={crew.name}
        action={<Chip tone="ok">{members.length} partecipanti</Chip>}
      />

      <div className="page-content flex-1 space-y-7 px-4 sm:px-6">
        {error && !creating && (
          <p role="alert" className="rounded-2xl border border-danger/25 bg-danger/10 p-4 text-sm text-danger">
            {error}
          </p>
        )}

        <section aria-label="Partecipanti">
          <SectionHeader
            icon={UsersRound}
            title="Partecipanti"
            hint="Lo stesso gruppo a ogni evento"
          />
          <div className="flex flex-wrap gap-1.5">
            {members.map((m) => (
              <span
                key={m.id}
                className="flex items-center gap-1.5 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-[13px] text-fg shadow-card"
              >
                <Avatar name={m.display_name} seed={m.id} size="sm" />
                {m.display_name}
                {m.id === entry.crewMemberId && <span className="text-fg-muted">(tu)</span>}
              </span>
            ))}
          </div>
          <Button variant="surface" size="sm" className="mt-3 w-full sm:w-auto" onClick={invite}>
            {shared ? <Check size={14} /> : <Share2 size={14} />}
            {shared ? 'Link copiato!' : 'Invita nella comitiva'}
          </Button>
        </section>

        <section aria-label="Eventi">
          <SectionHeader icon={Calendar} title="Eventi" hint={`${openEvents.length} in programma`} />
          {openEvents.length === 0 ? (
            <EmptyState
              icon={CalendarPlus}
              title="Nessun evento in programma"
              hint="Crea il primo evento della comitiva: i partecipanti ci entrano senza reinvito."
              action={
                <Button variant="surface" size="sm" onClick={() => setCreating(true)}>
                  <Plus size={15} /> Crea evento
                </Button>
              }
            />
          ) : (
            <ul className="grid gap-2.5 md:grid-cols-2">
              {openEvents.map((room) => (
                <li key={room.id}>
                  <Card onClick={() => openEvent(room.id, room.invite_code)}>
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                        style={{ background: `${tintForRoom(room.id)}22` }}
                      >
                        <Users aria-hidden="true" size={19} style={{ color: tintForRoom(room.id) }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-serif text-[16px] leading-tight text-fg">{room.title}</p>
                        <p className="mt-1 flex flex-col gap-0.5 text-[12px] text-fg-muted">
                          <span className="flex items-center gap-1.5">
                            <Calendar aria-hidden="true" size={12} />
                            {room.event_time ? formatEventTime(room.event_time) : 'Data da scegliere'}
                          </span>
                          <span className="flex items-center gap-1.5 truncate">
                            <MapPin aria-hidden="true" size={12} />
                            {room.destination_label || 'Destinazione da scegliere'}
                          </span>
                        </p>
                      </div>
                      <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-fg-muted" />
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        {closedEvents.length > 0 && (
          <section aria-label="Eventi archiviati">
            <SectionHeader title="Archiviati" hint="Consultabili, non modificabili" />
            <ul className="grid gap-2 md:grid-cols-2">
              {closedEvents.map((room) => (
                <li key={room.id}>
                  <Card tone="flat" onClick={() => navigate(`/room/${room.id}`)}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-[14px] text-fg-muted">{room.title}</p>
                      <ChevronRight aria-hidden="true" size={15} className="shrink-0 text-fg-muted" />
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <BottomSheet open={creating} onClose={() => { if (!submitting) setCreating(false) }} title="Nuovo evento">
        <form onSubmit={createEvent} className="space-y-5" aria-busy={submitting}>
          {error && (
            <p role="alert" className="rounded-xl bg-danger/10 px-4 py-2 text-sm text-danger">
              {error}
            </p>
          )}
          <TextField
            label="Nome dell’evento"
            placeholder="Es. Mare a giugno"
            autoFocus
            required
            maxLength={80}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Button type="submit" className="w-full" disabled={submitting || !title.trim()}>
            {submitting ? 'Creazione in corso…' : 'Crea evento'}
          </Button>
        </form>
      </BottomSheet>

      <div className="bottom-actions fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-lg gap-3 bg-gradient-to-t from-canvas via-canvas px-4 pt-4 sm:px-6">
        <Button className="flex-1" onClick={() => setCreating(true)}>
          <Plus size={17} /> Nuovo evento
        </Button>
      </div>
    </div>
  )
}

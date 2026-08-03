import { ArrowLeft, Calendar, Check, ChevronRight, MapPin, Plus, Share2, Users } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BottomSheet from '../components/ui/BottomSheet'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Chip from '../components/ui/Chip'
import ScreenHeader from '../components/ui/ScreenHeader'
import { useCrewData } from '../hooks/useCrewData'
import { getMyName, getSavedCrewEntry } from '../lib/localRooms'
import { createRoomAndJoin, joinRoomAsMember } from '../lib/membership'
import { tintForRoom } from '../lib/eventTint'

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleString('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

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
    return <div className="flex min-h-svh items-center justify-center bg-ink text-muted">Caricamento...</div>
  }

  if (loadError) {
    return (
      <div className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-4 bg-ink px-6 text-center">
        <p className="text-coral">Errore nel caricamento della comitiva.</p>
        <p className="font-mono text-[11px] text-muted">{loadError.message}</p>
        <button onClick={() => window.location.reload()} className="text-sm text-cream underline">
          Riprova
        </button>
      </div>
    )
  }

  if (notFound || !crew || !entry) {
    return (
      <div className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-4 bg-ink px-6 text-center">
        <p className="text-cream">Comitiva non trovata o non ne fai parte.</p>
        <button onClick={() => navigate('/')} className="text-sm text-muted underline">
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
      setError(err instanceof Error ? err.message : 'Errore imprevisto')
    } finally {
      setSubmitting(false)
    }
  }

  async function openEvent(roomId: string, inviteCode: string) {
    // I membri della comitiva entrano negli eventi senza passare dal form codice.
    try {
      await joinRoomAsMember(roomId, inviteCode, myName)
    } catch {
      // se l'inserimento fallisce (es. già membro con vincolo) si prova comunque a entrare
    }
    navigate(`/room/${roomId}`)
  }

  async function invite() {
    const url = `${window.location.origin}/join/${crew!.invite_code}`
    const shareData = { title: crew!.name, text: `Unisciti alla comitiva "${crew!.name}"`, url }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch {
        /* annullata: ripiega sulla copia */
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setShared(true)
      setTimeout(() => setShared(false), 1500)
    } catch {
      /* niente clipboard: il codice resta visibile nell'header */
    }
  }

  const openEvents = events.filter((r) => r.status === 'open')
  const closedEvents = events.filter((r) => r.status === 'closed')

  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col bg-ink">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1 px-4 pt-3 font-mono text-[12px] text-muted active:opacity-60 sm:px-6"
      >
        <ArrowLeft size={13} /> home
      </button>
      <ScreenHeader
        eyebrow={`Comitiva · #${crew.invite_code}`}
        title={crew.name}
        action={<Chip tone="teal">{members.length} partecipanti</Chip>}
      />

      <div className="flex-1 space-y-5 px-4 pb-28 sm:px-6">
        <div>
          <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Partecipanti</p>
          <div className="flex flex-wrap gap-1.5">
            {members.map((m) => (
              <span
                key={m.id}
                className="flex items-center gap-1.5 rounded-full bg-surface/60 px-2.5 py-1 text-[12px] text-cream"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal text-[10px] font-semibold text-ink">
                  {m.display_name[0]?.toUpperCase()}
                </span>
                {m.display_name}
                {m.id === entry.crewMemberId && <span className="text-muted">(tu)</span>}
              </span>
            ))}
          </div>
          <Button variant="surface" size="sm" className="mt-3 w-full" onClick={invite}>
            {shared ? <Check size={14} /> : <Share2 size={14} />}
            {shared ? 'Link copiato!' : 'Invita nella comitiva'}
          </Button>
        </div>

        <div>
          <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Eventi</p>
          {openEvents.length === 0 && (
            <p className="text-sm text-muted">Nessun evento ancora. Creane uno per questa comitiva.</p>
          )}
          <div className="space-y-2.5">
            {openEvents.map((room) => (
              <Card key={room.id} onClick={() => openEvent(room.id, room.invite_code)}>
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
              </Card>
            ))}
          </div>
        </div>

        {closedEvents.length > 0 && (
          <div>
            <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Archiviati</p>
            <div className="space-y-2.5">
              {closedEvents.map((room) => (
                <Card key={room.id} tone="flat" onClick={() => openEvent(room.id, room.invite_code)}>
                  <p className="truncate text-[14px] text-cream">{room.title}</p>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomSheet open={creating} onClose={() => setCreating(false)} title="Nuovo evento">
        <form onSubmit={createEvent} className="flex flex-col gap-3">
          {error && <p className="rounded-xl bg-coral/10 px-4 py-2 text-sm text-coral">{error}</p>}
          <input
            autoFocus
            className="rounded-lg border border-border-soft bg-ink px-3 py-2.5 text-cream placeholder:text-muted"
            placeholder="Nome evento (es. Mare a giugno)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Button type="submit" disabled={submitting || !title.trim()}>
            {submitting ? 'Creazione...' : 'Crea evento'}
          </Button>
        </form>
      </BottomSheet>

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-lg bg-gradient-to-t from-ink via-ink px-4 pb-8 pt-4 sm:px-6">
        <Button className="w-full" onClick={() => setCreating(true)}>
          <Plus size={16} /> Crea evento
        </Button>
      </div>
    </div>
  )
}

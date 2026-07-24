import { ChevronRight, Clock, Plus, Users } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Chip from '../components/ui/Chip'
import ScreenHeader from '../components/ui/ScreenHeader'
import { useMyRooms } from '../hooks/useMyRooms'
import { getCrew, getMyName, saveRoomEntry, setMyName } from '../lib/localRooms'
import { generateRoomCode } from '../lib/roomCode'
import { ensureAnonymousSession, supabase } from '../lib/supabase'
import { tintForRoom } from '../lib/eventTint'

export default function Home() {
  const navigate = useNavigate()
  const { summaries, loading } = useMyRooms()
  const crew = getCrew()
  const myName = getMyName()

  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [name, setName] = useState(myName)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [joining, setJoining] = useState(false)
  const [joinCode, setJoinCode] = useState('')

  const openRooms = summaries.filter((s) => s.room.status === 'open')
  const closedRooms = summaries.filter((s) => s.room.status === 'closed')

  async function createRoom(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !name.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const session = await ensureAnonymousSession()
      const userId = session!.user.id
      const inviteCode = generateRoomCode()

      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({ invite_code: inviteCode, title: title.trim(), created_by: userId })
        .select()
        .single()
      if (roomError) throw roomError

      const { data: member, error: memberError } = await supabase
        .from('members')
        .insert({ room_id: room.id, display_name: name.trim(), auth_user_id: userId, role: 'creator' })
        .select()
        .single()
      if (memberError) throw memberError

      setMyName(name.trim())
      saveRoomEntry({ roomId: room.id, memberId: member.id, inviteCode })
      navigate(`/room/${room.id}`)
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

  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col bg-ink">
      <ScreenHeader eyebrow="I tuoi eventi" title={myName ? `Ciao, ${myName}` : 'Trip Together'} />

      <div className="flex-1 space-y-5 px-4 pb-28 sm:px-6">
        {error && (
          <p className="rounded-xl bg-coral/10 px-4 py-2 text-sm text-coral">{error}</p>
        )}

        {crew.length > 0 && (
          <Card tone="highlight">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-teal">
                <Users size={13} strokeWidth={2.5} />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em]">La tua comitiva</span>
              </div>
              <span className="font-mono text-[10px] text-muted">{crew.length} persone</span>
            </div>
            <div className="mb-3 flex -space-x-2">
              {crew.slice(0, 6).map((n, i) => (
                <div
                  key={n}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-highlight-to text-[11px] font-semibold text-ink"
                  style={{ background: i % 2 === 0 ? 'var(--color-amber)' : 'var(--color-teal)' }}
                >
                  {n[0].toUpperCase()}
                </div>
              ))}
              {crew.length > 6 && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-highlight-to bg-ink font-mono text-[10px] text-muted">
                  +{crew.length - 6}
                </div>
              )}
            </div>
            <p className="text-[11px] text-muted">
              Quando crei una stanza, ricordati di condividere il link con loro.
            </p>
          </Card>
        )}

        <div>
          <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">In arrivo</p>
          {loading && <p className="text-sm text-muted">Caricamento...</p>}
          {!loading && openRooms.length === 0 && (
            <p className="text-sm text-muted">Nessun evento ancora. Creane uno o entra con un codice.</p>
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
                    {room.destination_label && (
                      <p className="mt-0.5 flex items-center gap-1 truncate font-mono text-[11px] text-muted">
                        <Clock size={10} /> {room.destination_label}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-muted" />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5 pl-14">
                  <Chip>{memberCount} member{memberCount === 1 ? 'o' : 'i'}</Chip>
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
                      <p className="mt-0.5 font-mono text-[11px] text-muted">
                        {memberCount} membri · saldi chiusi
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {joining ? (
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
                Vai alla stanza
              </Button>
              <Button type="button" variant="outline" onClick={() => setJoining(false)}>
                Annulla
              </Button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setJoining(true)}
            className="font-mono text-[11px] text-muted underline underline-offset-2"
          >
            Hai un codice invito?
          </button>
        )}
      </div>

      {creating && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50" onClick={() => setCreating(false)}>
          <form
            onSubmit={createRoom}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-t-[28px] border-t border-border-strong bg-highlight-to px-6 pb-8 pt-3"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border-dashed" />
            <p className="mb-4 font-serif text-[18px] text-cream">Nuova stanza</p>
            <div className="flex flex-col gap-3">
              <input
                autoFocus
                className="rounded-lg border border-border-soft bg-ink px-3 py-2.5 text-cream placeholder:text-muted"
                placeholder="Nome evento (es. Ritrovo al Faro)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <input
                className="rounded-lg border border-border-soft bg-ink px-3 py-2.5 text-cream placeholder:text-muted"
                placeholder="Il tuo nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creazione...' : 'Crea stanza'}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-lg bg-gradient-to-t from-ink via-ink px-4 pb-8 pt-4 sm:px-6">
        <Button className="w-full" onClick={() => setCreating(true)}>
          <Plus size={16} /> Crea nuova stanza
        </Button>
      </div>
    </div>
  )
}

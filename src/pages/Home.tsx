import { ArrowUpRight, Calendar, ChevronRight, MapPin, Plus, Ticket, UserRound, UsersRound } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomSheet from '../components/ui/BottomSheet'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Chip from '../components/ui/Chip'
import ScreenHeader from '../components/ui/ScreenHeader'
import TextField from '../components/ui/TextField'
import { SkeletonCard, SkeletonHeader } from '../components/ui/Skeleton'
import { useMyCrews } from '../hooks/useMyCrews'
import { useMyRooms, type RoomSummary } from '../hooks/useMyRooms'
import { formatEventTime } from '../lib/format'
import { getMyName } from '../lib/localRooms'
import { createCrew, createRoomAndJoin } from '../lib/membership'

type SheetMode = 'event' | 'crew' | 'join' | null

export default function Home() {
  const navigate = useNavigate()
  const { summaries, isLoading: loadingRooms, error: roomsError } = useMyRooms()
  const { summaries: crews, isLoading: loadingCrews, error: crewsError } = useMyCrews()
  const myName = getMyName()
  const [sheet, setSheet] = useState<SheetMode>(null)
  const [title, setTitle] = useState('')
  const [name, setName] = useState(myName)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const loading = loadingRooms || loadingCrews
  const loadError = roomsError ?? crewsError
  const onboarding = !loading && !loadError && summaries.length === 0 && crews.length === 0

  // Include anche gli eventi delle comitive a cui si è già partecipato.
  const openRooms = summaries.filter(({ room }) => room.status === 'open')
  const nextEvent = openRooms
    .filter(({ room }) => room.event_time && Date.parse(room.event_time) >= Date.now())
    .sort((a, b) => Date.parse(a.room.event_time!) - Date.parse(b.room.event_time!))[0]
  const featured = nextEvent ?? openRooms[0]
  const otherEvents = openRooms.filter(({ room }) => room.id !== featured?.room.id)
  const closedRooms = summaries.filter(({ room }) => room.status === 'closed')

  function openSheet(mode: SheetMode) {
    setName(getMyName())
    setTitle('')
    setError(null)
    setSheet(mode)
  }

  async function submitSheet(event: FormEvent) {
    event.preventDefault()
    if (submitting || !title.trim() || !name.trim() || !sheet) return
    setSubmitting(true)
    setError(null)
    try {
      if (sheet === 'crew') navigate(`/crew/${await createCrew(title, name)}`)
      else navigate(`/room/${await createRoomAndJoin(title, name)}`)
    } catch {
      setError('Creazione non riuscita. Controlla la connessione e riprova.')
    } finally { setSubmitting(false) }
  }

  function goToJoin(event: FormEvent) {
    event.preventDefault()
    const code = joinCode.trim()
    if (code) navigate(`/join/${encodeURIComponent(code.toUpperCase())}`)
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-4xl flex-col bg-ink">
      {loading ? <SkeletonHeader /> : <ScreenHeader
        eyebrow="Trip Together · insieme, si parte"
        title={myName ? `Ciao, ${myName}` : 'La prossima avventura'}
        action={
          <button
            type="button"
            onClick={() => navigate('/profilo')}
            aria-label="Apri il tuo profilo"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-fg-muted shadow-card"
          >
            <UserRound aria-hidden="true" size={19} />
          </button>
        }
      />}
      <div className="page-content space-y-7 px-4 sm:px-6">
        {loading ? <><SkeletonCard /><SkeletonCard /></> : onboarding ? (
          <>
            <Card tone="highlight" className="relative overflow-hidden !p-6 sm:!p-8">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber/15 text-amber"><UsersRound size={26} /></div>
              <h2 className="max-w-md font-serif text-3xl leading-tight sm:text-4xl">Meno messaggi.<br />Più tempo insieme.</h2>
              <p className="mb-7 mt-4 max-w-md text-base leading-relaxed text-muted">Un unico posto per decidere dove andare, organizzare le auto e dividere le spese. Basta un invito.</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button onClick={() => openSheet('event')}><Plus size={18} /> Crea un evento</Button>
                <Button variant="outline" onClick={() => openSheet('join')}><Ticket size={18} /> Entra con un invito</Button>
              </div>
            </Card>
            <Card onClick={() => openSheet('crew')}>
              <div className="flex items-center gap-4">
                <UsersRound size={24} className="shrink-0 text-teal" />
                <div className="flex-1"><h2 className="font-semibold">Viaggiate spesso insieme?</h2><p className="mt-1 text-sm leading-relaxed text-muted">Crea una comitiva e ritrova lo stesso gruppo a ogni evento.</p></div>
                <ChevronRight size={18} className="shrink-0 text-muted" />
              </div>
            </Card>
          </>
        ) : (
          <>
            {loadError && <div role="alert" className="rounded-2xl border border-coral/25 bg-coral/10 p-4"><p className="text-sm text-coral">Non riusciamo a caricare tutti i tuoi eventi.</p><Button variant="outline" size="sm" className="mt-3" onClick={() => window.location.reload()}>Riprova</Button></div>}
            {featured ? (
              <section aria-label="Evento in evidenza">
                <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted">{nextEvent ? 'La prossima partenza' : 'Da organizzare insieme'}</p>
                <EventCard summary={featured} featured onOpen={() => navigate(`/room/${featured.room.id}`)} />
              </section>
            ) : !loadError && (
              <Card tone="highlight"><h2 className="font-serif text-xl">Il prossimo ritrovo inizia qui</h2><p className="mb-4 mt-2 text-sm text-muted">Scegli un nome e invita gli amici. Potrai aggiungere luogo e data insieme a loro.</p><Button onClick={() => openSheet('event')}><Plus size={18} /> Crea un evento</Button></Card>
            )}
            <div className="grid gap-7 md:grid-cols-2">
              <section className="space-y-3" aria-label="Altri eventi">
                <h2 className="text-xs font-medium uppercase tracking-widest text-muted">Altri eventi · {otherEvents.length}</h2>
                {otherEvents.map((summary) => <EventCard key={summary.room.id} summary={summary} onOpen={() => navigate(`/room/${summary.room.id}`)} />)}
                {otherEvents.length === 0 && <p className="text-sm leading-relaxed text-muted">Gli altri eventi a cui partecipi appariranno qui.</p>}
                <Button variant="outline" onClick={() => openSheet('join')}><Ticket size={16} /> Entra con un invito</Button>
              </section>
              <section className="space-y-3" aria-label="Comitive">
                <h2 className="text-xs font-medium uppercase tracking-widest text-muted">Le tue comitive</h2>
                {crews.map(({ crew, memberCount, eventCount }) => (
                  <Card key={crew.id} onClick={() => navigate(`/crew/${crew.id}`)}><div className="flex items-center gap-3"><UsersRound size={22} className="shrink-0 text-teal" /><div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{crew.name}</h3><p className="mt-1 text-sm text-muted">{memberCount} partecipanti · {eventCount} eventi</p></div><ChevronRight size={18} className="shrink-0 text-muted" /></div></Card>
                ))}
                {crews.length === 0 && <p className="text-sm leading-relaxed text-muted">Una comitiva tiene insieme gli amici e tutti i vostri eventi.</p>}
                <Button variant="outline" onClick={() => openSheet('crew')}><Plus size={16} /> Crea comitiva</Button>
              </section>
            </div>
            {closedRooms.length > 0 && <section className="space-y-3"><h2 className="text-xs font-medium uppercase tracking-widest text-muted">Eventi archiviati</h2><div className="grid gap-3 md:grid-cols-2">{closedRooms.map((summary) => <EventCard key={summary.room.id} summary={summary} onOpen={() => navigate(`/room/${summary.room.id}`)} />)}</div></section>}
          </>
        )}
      </div>
      {!loading && !onboarding && <div className="bottom-actions fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-lg gap-3 bg-gradient-to-t from-ink via-ink px-4 pt-4"><Button variant="surface" className="flex-1" onClick={() => openSheet('join')}><Ticket size={17} /> Invito</Button><Button className="flex-1" onClick={() => openSheet('event')}><Plus size={17} /> Nuovo evento</Button></div>}
      <BottomSheet open={sheet !== null} onClose={() => { if (!submitting) setSheet(null) }} title={sheet === 'join' ? 'Entra con un invito' : sheet === 'crew' ? 'Nuova comitiva' : 'Nuovo evento'}>
        {sheet === 'join' ? (
          <form onSubmit={goToJoin} className="space-y-5"><TextField label="Codice invito" hint="Trovi il codice nell’invito condiviso dai tuoi amici." autoFocus autoCapitalize="characters" autoComplete="off" required value={joinCode} onChange={(event) => setJoinCode(event.target.value)} /><Button type="submit" className="w-full" disabled={!joinCode.trim()}>Continua <ArrowUpRight size={17} /></Button></form>
        ) : (
          <form onSubmit={submitSheet} className="space-y-5" aria-busy={submitting}>
            {error && <p role="alert" className="rounded-xl bg-coral/10 p-3 text-sm text-coral">{error}</p>}
            <TextField label={sheet === 'crew' ? 'Nome della comitiva' : 'Nome dell’evento'} placeholder={sheet === 'crew' ? 'Es. I soliti otto' : 'Es. Domenica al lago'} autoFocus required maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} />
            <TextField label="Il tuo nome" autoComplete="given-name" required maxLength={40} value={name} onChange={(event) => setName(event.target.value)} />
            {sheet === 'event' && <p className="text-sm leading-relaxed text-muted">Luogo e data si possono scegliere dopo. Inizia dal gruppo.</p>}
            <Button type="submit" className="w-full" disabled={submitting || !title.trim() || !name.trim()}>{submitting ? 'Creazione in corso…' : sheet === 'crew' ? 'Crea comitiva' : 'Crea evento'}</Button>
          </form>
        )}
      </BottomSheet>
    </main>
  )
}

function EventCard({ summary: { room, memberCount }, featured = false, onOpen }: { summary: RoomSummary; featured?: boolean; onOpen: () => void }) {
  return <Card tone={featured ? 'highlight' : 'surface'} onClick={onOpen} className={featured ? '!p-6 sm:!p-8' : ''}>
    <div className="mb-4 flex items-center justify-between gap-3"><Chip tone={room.status === 'closed' ? 'muted' : 'teal'}>{room.status === 'closed' ? 'Archiviato' : 'In programma'}</Chip><span className="flex items-center gap-1.5 text-sm text-muted"><UsersRound size={15} />{memberCount}</span></div>
    <h3 className={`break-words font-serif ${featured ? 'text-3xl' : 'text-lg'}`}>{room.title}</h3>
    <div className="mt-4 space-y-2 text-sm text-muted"><p className="flex items-start gap-2"><Calendar size={17} className="mt-0.5 shrink-0" />{room.event_time ? formatEventTime(room.event_time) : 'Data da scegliere'}</p><p className="flex items-start gap-2"><MapPin size={17} className="mt-0.5 shrink-0" />{room.destination_label || 'Destinazione da scegliere'}</p></div>
    <div className={`mt-5 flex items-center justify-between border-t border-border-soft pt-4 text-sm font-medium ${featured ? 'text-amber' : 'text-cream'}`}><span>{room.status === 'closed' ? 'Consulta il riepilogo' : 'Apri evento'}</span><ArrowUpRight size={19} /></div>
  </Card>
}

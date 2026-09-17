import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import ArchiveSummary from '../components/room/ArchiveSummary'
import Button from '../components/ui/Button'
import AutoTab from '../components/room/AutoTab'
import BachecaTab from '../components/room/BachecaTab'
import RadarTab from '../components/room/RadarTab'
import SpeseTab from '../components/room/SpeseTab'
import StanzaTab from '../components/room/StanzaTab'
import TabBar, { type RoomTabId } from '../components/TabBar'
import Chip from '../components/ui/Chip'
import ScreenHeader from '../components/ui/ScreenHeader'
import { Skeleton, SkeletonCard, SkeletonHeader } from '../components/ui/Skeleton'
import { useRoomData } from '../hooks/useRoomData'
import { query } from '../lib/db'
import { getSavedRoomEntry } from '../lib/localRooms'
import { roomPhase, type RoomPhase } from '../lib/phase'
import { supabase } from '../lib/supabase'

const PHASE_EYEBROW: Record<RoomPhase, string> = {
  pre: 'Evento in programma',
  in_corso: 'In viaggio',
  concluso: 'Evento concluso',
}

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const tab: RoomTabId = requestedTab === 'auto' || requestedTab === 'bacheca' || requestedTab === 'spese' || requestedTab === 'radar' ? requestedTab : 'stanza'
  function setTab(nextTab: RoomTabId) {
    setSearchParams((previous) => { const next = new URLSearchParams(previous); next.set('tab', nextTab); return next })
  }
  const [checkedRoomId, setCheckedRoomId] = useState<string | null>(null)
  const checkedMembership = checkedRoomId === roomId

  useEffect(() => {
    if (!roomId) return
    const entry = getSavedRoomEntry(roomId)
    if (entry) {
      setCheckedRoomId(roomId)
      return
    }

    let cancelled = false
    query<{ invite_code: string }>(
      'rooms.inviteCodeById',
      supabase.from('rooms').select('invite_code').eq('id', roomId).maybeSingle(),
    ).then((res) => {
      if (cancelled) return
      if (res.kind === 'ok') navigate(`/join/${res.data.invite_code}`, { replace: true })
      else setCheckedRoomId(roomId) // stanza inesistente o errore: gestita dallo stato "notFound"/error
    }).catch(() => { if (!cancelled) setCheckedRoomId(roomId) })
    return () => { cancelled = true }
  }, [roomId, navigate])

  const data = useRoomData(checkedMembership ? roomId : undefined)
  const {
    sectionErrors,
    refetch,
    isLoading,
    error,
    room,
    members,
    cars,
    carPassengers,
    carExpenses,
    carCargo,
    delayReports,
    boardNotes,
    boardLinks,
    generalExpenses,
    generalExpenseParticipants,
    radarPositions,
    roomChecklistItems,
    stopProposals,
    stopProposalVotes,
    rideRequests,
  } = data

  if (!checkedMembership || isLoading) {
    return (
      <div className="mx-auto flex min-h-svh max-w-4xl flex-col bg-ink">
        <Skeleton className="mx-4 mt-3 h-3 w-24 sm:mx-6" />
        <SkeletonHeader />
        <div className="flex-1 space-y-2.5 px-4 pb-10 sm:px-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  // Errore di lettura (es. tabella mancante) ≠ stanza inesistente: stato distinto.
  if (error) {
    return (
      <div className="mx-auto flex min-h-svh max-w-4xl flex-col items-center justify-center gap-4 bg-ink px-6 text-center">
        <p className="text-coral">Non riusciamo a caricare questo evento.</p>
        <p className="text-sm text-muted">Controlla la connessione e riprova.</p>
        <button onClick={() => void refetch()} className="text-sm text-cream underline">
          Riprova
        </button>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="mx-auto flex min-h-svh max-w-4xl flex-col items-center justify-center gap-4 bg-ink px-6 text-center">
        <p className="text-cream">Evento non trovato.</p>
        <button onClick={() => navigate('/')} className="text-sm text-muted underline">
          Torna alla home
        </button>
      </div>
    )
  }

  const entry = getSavedRoomEntry(room.id)
  const currentMember = members.find((m) => m.id === entry?.memberId)
  const sectionError = tab === 'stanza' ? null : sectionErrors[tab]
  const dataIncomplete = !!(sectionErrors.auto || sectionErrors.spese)
    || generalExpenses.some((expense) => !expense.waived && (!expense.paid_by_member_id || !generalExpenseParticipants.some((participant) => participant.expense_id === expense.id)))
    || carExpenses.some((expense) => !expense.paid_by_member_id || !cars.some((car) => car.id === expense.car_id))
  const phase = roomPhase(room.status, cars.map((c) => c.travel_status))

  return (
    <div className="mx-auto flex min-h-svh max-w-4xl flex-col bg-ink">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1 px-4 pt-3 font-mono text-[12px] text-muted active:opacity-60 sm:px-6"
      >
        <ArrowLeft size={13} /> eventi
      </button>
      <ScreenHeader
        eyebrow={`${PHASE_EYEBROW[phase]} · #${room.invite_code}`}
        title={room.title}
        action={<Chip tone="teal">{members.length} membri</Chip>}
      />

      {room.status === 'closed' ? <ArchiveSummary data={data} /> : !currentMember ? (
        <div className="space-y-4 px-6 py-8"><p>La tua partecipazione non è stata trovata su questo dispositivo.</p><Button onClick={() => navigate(`/join/${room.invite_code}`)}>Rientra con l’invito</Button></div>
      ) : <>
        {dataIncomplete && tab === 'stanza' && <div role="alert" className="mx-4 mb-4 rounded-xl bg-coral/10 p-4 text-sm text-coral sm:mx-6">Alcuni dati non sono disponibili. Posti e saldi devono essere verificati.<button type="button" onClick={() => void refetch()} className="ml-2 min-h-11 underline">Riprova</button></div>}
        {sectionError ? <div role="alert" className="mx-4 space-y-3 rounded-2xl border border-coral/25 bg-coral/10 p-5 sm:mx-6"><p>Non riusciamo a caricare questa sezione.</p><p className="text-sm text-muted">I tuoi dati potrebbero essere presenti. Riprova prima di aggiungerne altri.</p><Button variant="outline" onClick={() => void refetch()}>Riprova</Button></div> : <>
          {tab === 'stanza' &&
            (
              <StanzaTab
                room={room}
                dataIncomplete={dataIncomplete}
                currentMember={currentMember}
                members={members}
                cars={cars}
                carPassengers={carPassengers}
                carExpenses={carExpenses}
                generalExpenses={generalExpenses}
                generalExpenseParticipants={generalExpenseParticipants}
                onGoToSpese={() => setTab('spese')}
                onGoToAuto={() => setTab('auto')}
                onClosed={() => navigate('/')}
              />
            )}
          {tab === 'auto' &&
            (
              <AutoTab
                roomId={room.id}
                currentMember={currentMember}
                members={members}
                cars={cars}
                carPassengers={carPassengers}
                carExpenses={carExpenses}
                carCargo={carCargo}
                delayReports={delayReports}
                stopProposals={stopProposals}
                stopProposalVotes={stopProposalVotes}
                rideRequests={rideRequests}
              />
            )}
          {tab === 'bacheca' &&
            (
              <BachecaTab
                roomId={room.id}
                currentMember={currentMember}
                members={members}
                boardNotes={boardNotes}
                boardLinks={boardLinks}
                roomChecklistItems={roomChecklistItems}
              />
            )}
          {tab === 'spese' &&
            (
              <SpeseTab
                roomId={room.id}
                currentMember={currentMember}
                members={members}
                cars={cars}
                carPassengers={carPassengers}
                carExpenses={carExpenses}
                generalExpenses={generalExpenses}
                generalExpenseParticipants={generalExpenseParticipants}
              />
            )}
          {tab === 'radar' &&
            (
              <RadarTab room={room} currentMember={currentMember} members={members} radarPositions={radarPositions} />
            )}

        </>}
        <TabBar active={tab} onChange={setTab} />
      </>}
    </div>
  )
}

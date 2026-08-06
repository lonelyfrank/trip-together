import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
  pre: 'Stanza attiva',
  in_corso: 'In viaggio',
  concluso: 'Evento concluso',
}

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<RoomTabId>('stanza')
  const [checkedMembership, setCheckedMembership] = useState(false)

  useEffect(() => {
    if (!roomId) return
    const entry = getSavedRoomEntry(roomId)
    if (entry) {
      setCheckedMembership(true)
      return
    }

    query<{ invite_code: string }>(
      'rooms.inviteCodeById',
      supabase.from('rooms').select('invite_code').eq('id', roomId).maybeSingle(),
    ).then((res) => {
      if (res.kind === 'ok') navigate(`/join/${res.data.invite_code}`, { replace: true })
      else setCheckedMembership(true) // stanza inesistente o errore: gestita dallo stato "notFound"/error
    })
  }, [roomId, navigate])

  const {
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
  } = useRoomData(checkedMembership ? roomId : undefined)

  if (!checkedMembership || isLoading) {
    return (
      <div className="mx-auto flex min-h-svh max-w-lg flex-col bg-ink">
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
      <div className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-4 bg-ink px-6 text-center">
        <p className="text-coral">Errore nel caricamento della stanza.</p>
        <p className="font-mono text-[11px] text-muted">{error.message}</p>
        <button onClick={() => window.location.reload()} className="text-sm text-cream underline">
          Riprova
        </button>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-4 bg-ink px-6 text-center">
        <p className="text-cream">Stanza non trovata.</p>
        <button onClick={() => navigate('/')} className="text-sm text-muted underline">
          Torna alla home
        </button>
      </div>
    )
  }

  const entry = getSavedRoomEntry(room.id)
  const currentMember = members.find((m) => m.id === entry?.memberId)
  const phase = roomPhase(room.status, cars.map((c) => c.travel_status))

  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col bg-ink">
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

      {tab === 'stanza' &&
        (currentMember ? (
          <StanzaTab
            room={room}
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
        ) : (
          <div className="px-4 py-8 text-center text-sm text-muted sm:px-6">Membro non trovato.</div>
        ))}
      {tab === 'auto' &&
        (currentMember ? (
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
        ) : (
          <div className="px-4 py-8 text-center text-sm text-muted sm:px-6">Membro non trovato.</div>
        ))}
      {tab === 'bacheca' &&
        (currentMember ? (
          <BachecaTab
            roomId={room.id}
            currentMember={currentMember}
            members={members}
            boardNotes={boardNotes}
            boardLinks={boardLinks}
            roomChecklistItems={roomChecklistItems}
          />
        ) : (
          <div className="px-4 py-8 text-center text-sm text-muted sm:px-6">Membro non trovato.</div>
        ))}
      {tab === 'spese' &&
        (currentMember ? (
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
        ) : (
          <div className="px-4 py-8 text-center text-sm text-muted sm:px-6">Membro non trovato.</div>
        ))}
      {tab === 'radar' &&
        (currentMember ? (
          <RadarTab room={room} currentMember={currentMember} members={members} radarPositions={radarPositions} />
        ) : (
          <div className="px-4 py-8 text-center text-sm text-muted sm:px-6">Membro non trovato.</div>
        ))}

      <TabBar active={tab} onChange={setTab} />
    </div>
  )
}

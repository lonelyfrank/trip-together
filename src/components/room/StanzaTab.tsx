import { Check, Share2 } from 'lucide-react'
import { useState } from 'react'
import Button from '../ui/Button'
import type {
  Car,
  CarExpense,
  CarPassenger,
  GeneralExpense,
  GeneralExpenseParticipant,
  Member,
  Room,
} from '../../types'
import CloseRoomSection from './CloseRoomSection'
import DestinationCard from './DestinationCard'
import ReadinessBanner from './ReadinessBanner'

interface StanzaTabProps {
  room: Room
  currentMember: Member
  members: Member[]
  cars: Car[]
  carPassengers: CarPassenger[]
  carExpenses: CarExpense[]
  generalExpenses: GeneralExpense[]
  generalExpenseParticipants: GeneralExpenseParticipant[]
  onGoToSpese: () => void
  onGoToAuto: () => void
  onClosed: () => void
}

function roleLabel(memberId: string, cars: Car[], carPassengers: CarPassenger[]) {
  if (cars.some((c) => c.driver_member_id === memberId)) return 'guida'
  if (carPassengers.some((cp) => cp.member_id === memberId)) return 'passeggero'
  return 'senza auto'
}

export default function StanzaTab({
  room,
  currentMember,
  members,
  cars,
  carPassengers,
  carExpenses,
  generalExpenses,
  generalExpenseParticipants,
  onGoToSpese,
  onGoToAuto,
  onClosed,
}: StanzaTabProps) {
  const [shared, setShared] = useState(false)

  const inviteUrl = `${window.location.origin}/join/${room.invite_code}`

  async function invite() {
    const shareData = {
      title: room.title,
      text: `Unisciti a "${room.title}" su Trip Together`,
      url: inviteUrl,
    }
    // Condivisione nativa dove disponibile (mobile), altrimenti copia negli appunti.
    if (navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch {
        // annullata dall'utente o non consentita: ripiega sulla copia
      }
    }
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setShared(true)
      setTimeout(() => setShared(false), 1500)
    } catch {
      // clipboard non disponibile: nessuna azione, l'utente vede comunque il codice nell'header
    }
  }

  return (
    <div className="space-y-3 px-4 pb-28 sm:px-6">
      <ReadinessBanner
        room={room}
        currentMember={currentMember}
        members={members}
        cars={cars}
        carPassengers={carPassengers}
        onGoToAuto={onGoToAuto}
      />

      <DestinationCard room={room} />

      <div>
        <p className="mb-2.5 mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          Partecipanti · {members.length}
        </p>
        <div className="space-y-1.5">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl bg-surface/50 px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber text-[11px] font-semibold text-ink">
                  {m.display_name[0]?.toUpperCase()}
                </div>
                <span className="text-[13.5px] text-cream">
                  {m.display_name}
                  {m.id === currentMember.id && <span className="text-muted"> (tu)</span>}
                </span>
              </div>
              <span className="font-mono text-[10px] text-muted">{roleLabel(m.id, cars, carPassengers)}</span>
            </div>
          ))}
        </div>
      </div>

      <Button variant="surface" className="w-full" onClick={invite}>
        {shared ? <Check size={15} /> : <Share2 size={15} />}
        {shared ? 'Link copiato!' : 'Invita amici'}
      </Button>

      <CloseRoomSection
        room={room}
        currentMember={currentMember}
        cars={cars}
        carPassengers={carPassengers}
        carExpenses={carExpenses}
        generalExpenses={generalExpenses}
        generalExpenseParticipants={generalExpenseParticipants}
        onGoToSpese={onGoToSpese}
        onClosed={onClosed}
      />
    </div>
  )
}

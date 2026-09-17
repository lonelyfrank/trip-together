import { Check, LifeBuoy, Share2 } from 'lucide-react'
import { useState } from 'react'
import Button from '../ui/Button'
import { roomPhase } from '../../lib/phase'
import { encodeResumeToken } from '../../lib/resumeToken'
import { shareOrCopy } from '../../lib/share'
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
import PersonalSummary from './PersonalSummary'

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
  dataIncomplete: boolean
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
  dataIncomplete,
}: StanzaTabProps) {
  const [shared, setShared] = useState(false)
  const [recoveryCopiedFor, setRecoveryCopiedFor] = useState<string | null>(null)

  const phase = roomPhase(room.status, cars.map((c) => c.travel_status))
  const inviteUrl = `${window.location.origin}/join/${room.invite_code}`

  async function invite() {
    const result = await shareOrCopy({
      title: room.title,
      text: `Unisciti a "${room.title}" su Trip Together`,
      url: inviteUrl,
    })
    if (result === 'copied') {
      setShared(true)
      setTimeout(() => setShared(false), 1500)
    }
  }

  // Recovery sociale: chiunque nella stanza può generare e condividere il
  // link di recupero di un membro (anche il proprio, come backup) — non
  // serve un account per farlo, basta vedere la lista partecipanti.
  async function shareRecoveryLink(member: Member) {
    const token = encodeResumeToken({ roomId: room.id, memberId: member.id, inviteCode: room.invite_code })
    const url = `${window.location.origin}/resume/${token}`
    const result = await shareOrCopy({
      title: 'Link di recupero',
      text: `Link di recupero per ${member.display_name} su "${room.title}"`,
      url,
    })
    if (result === 'copied') {
      setRecoveryCopiedFor(member.id)
      setTimeout(() => setRecoveryCopiedFor(null), 1500)
    }
  }

  return (
    <div className="page-content grid items-start gap-5 px-4 sm:px-6 md:grid-cols-2">
      <div className="space-y-5">
        <PersonalSummary
          room={room}
          currentMember={currentMember}
          members={members}
          cars={cars}
          carPassengers={carPassengers}
          carExpenses={carExpenses}
          generalExpenses={generalExpenses}
          generalExpenseParticipants={generalExpenseParticipants}
          dataIncomplete={dataIncomplete}
          onGoToAuto={onGoToAuto}
          onGoToSpese={onGoToSpese}
        />

        <DestinationCard room={room} />
      </div>

      <div className="space-y-5">
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-muted">
            Partecipanti · {members.length}
          </h2>
          <div className="space-y-1.5">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-xl bg-surface/50 px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber text-[11px] font-semibold text-ink">
                    {m.display_name[0]?.toUpperCase()}
                  </div>
                  <span className="text-[13px] text-cream">
                    {m.display_name}
                    {m.id === currentMember.id && <span className="text-muted"> (tu)</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-[10px] text-muted">{roleLabel(m.id, cars, carPassengers)}</span>
                  <button
                    onClick={() => shareRecoveryLink(m)}
                    title={`Link di recupero per ${m.display_name}`}
                    aria-label={`Link di recupero per ${m.display_name}`}
                    className="flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors active:text-teal"
                  >
                    {recoveryCopiedFor === m.id ? <Check size={14} className="text-teal" /> : <LifeBuoy size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {phase === 'pre' && (
          <Button variant="surface" className="w-full" onClick={invite}>
            {shared ? <Check size={15} /> : <Share2 size={15} />}
            {shared ? 'Link copiato!' : 'Invita amici'}
          </Button>
        )}

        {!dataIncomplete && <details className="rounded-2xl border border-border-soft p-4"><summary className="text-sm text-muted">Opzioni dell’evento</summary><CloseRoomSection
          room={room}
          currentMember={currentMember}
          cars={cars}
          carPassengers={carPassengers}
          carExpenses={carExpenses}
          generalExpenses={generalExpenses}
          generalExpenseParticipants={generalExpenseParticipants}
          onGoToSpese={onGoToSpese}
          onClosed={onClosed}
        /></details>}
      </div>
    </div>
  )
}

import { Check, ChevronRight, LifeBuoy, Share2, UsersRound } from 'lucide-react'
import { useState } from 'react'
import Avatar from '../ui/Avatar'
import BottomSheet from '../ui/BottomSheet'
import Button from '../ui/Button'
import Card from '../ui/Card'
import CardTitle from '../ui/CardTitle'
import Chip from '../ui/Chip'
import { encodeResumeToken } from '../../lib/resumeToken'
import { shareOrCopy } from '../../lib/share'
import type { Car, CarPassenger, Member, Room } from '../../types'

// "Membri del gruppo" del mockup: una griglia di volti con il ruolo di
// ciascuno. I ruoli sono quelli che il database conosce davvero — chi ha
// creato l'evento, chi guida, chi non ha ancora confermato — non incarichi
// inventati come "Alloggio" o "Snack".
function roleOf(member: Member, cars: Car[], carPassengers: CarPassenger[]) {
  if (!member.confirmed) return { label: 'In attesa', tone: 'warn' as const }
  if (member.role === 'creator') return { label: 'Organizza', tone: 'ok' as const }
  if (cars.some((c) => c.driver_member_id === member.id)) return { label: 'Autista', tone: 'info' as const }
  if (carPassengers.some((cp) => cp.member_id === member.id)) return { label: 'Passeggero', tone: 'muted' as const }
  return { label: 'Senza auto', tone: 'muted' as const }
}

interface MembersSectionProps {
  room: Room
  currentMember: Member
  members: Member[]
  cars: Car[]
  carPassengers: CarPassenger[]
  canInvite: boolean
}

export default function MembersSection({
  room,
  currentMember,
  members,
  cars,
  carPassengers,
  canInvite,
}: MembersSectionProps) {
  const [shared, setShared] = useState(false)
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const [recoveryCopiedFor, setRecoveryCopiedFor] = useState<string | null>(null)

  const confirmedCount = members.filter((m) => m.confirmed).length

  async function invite() {
    const result = await shareOrCopy({
      title: room.title,
      text: `Unisciti a "${room.title}" su Trip Together`,
      url: `${window.location.origin}/join/${room.invite_code}`,
    })
    if (result === 'copied') {
      setShared(true)
      setTimeout(() => setShared(false), 1500)
    }
  }

  // Recovery sociale: chiunque nella stanza può generare e condividere il link
  // di recupero di un membro (anche il proprio, come backup) — non serve un
  // account per farlo, basta vedere la lista partecipanti.
  async function shareRecoveryLink(member: Member) {
    const token = encodeResumeToken({ roomId: room.id, memberId: member.id, inviteCode: room.invite_code })
    const result = await shareOrCopy({
      title: 'Link di recupero',
      text: `Link di recupero per ${member.display_name} su "${room.title}"`,
      url: `${window.location.origin}/resume/${token}`,
    })
    if (result === 'copied') {
      setRecoveryCopiedFor(member.id)
      setTimeout(() => setRecoveryCopiedFor(null), 1500)
    }
  }

  return (
    <Card>
      <CardTitle
        as="h2"
        icon={UsersRound}
        title="Membri del gruppo"
        action={
          <span className="text-[11.5px] font-bold text-brand-text">
            {confirmedCount} di {members.length} confermati
          </span>
        }
      />
      <ul className="grid grid-cols-3 gap-x-2 gap-y-3 sm:grid-cols-6">
        {members.map((m) => {
          const role = roleOf(m, cars, carPassengers)
          return (
            <li key={m.id} className="flex min-w-0 flex-col items-center gap-1 text-center">
              <Avatar
                name={m.display_name}
                seed={m.id}
                size="lg"
                className={m.confirmed ? '' : 'opacity-60'}
              />
              <span className="w-full truncate text-[12px] font-bold text-fg">
                {m.display_name}
                {m.id === currentMember.id && <span className="font-medium text-fg-muted"> (tu)</span>}
              </span>
              <Chip tone={role.tone} className="!px-2 !py-0.5 !text-[9.5px]">
                {role.label}
              </Chip>
            </li>
          )
        })}
      </ul>

      <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-line pt-3">
        {canInvite && (
          <Button size="sm" variant="soft" onClick={invite}>
            {shared ? <Check size={14} /> : <Share2 size={14} />}
            {shared ? 'Link copiato!' : 'Invita amici'}
          </Button>
        )}
        <Button
          size="sm"
          variant="surface"
          className={canInvite ? '' : 'col-span-2'}
          onClick={() => setRecoveryOpen(true)}
        >
          <LifeBuoy size={14} /> Link di recupero
        </Button>
      </div>

      <BottomSheet open={recoveryOpen} onClose={() => setRecoveryOpen(false)} title="Link di recupero">
        <p className="mb-3 text-[13px] leading-relaxed text-fg-muted">
          Chi cambia telefono o cancella il browser rientra con il suo link, senza account.
        </p>
        <ul className="space-y-1.5">
          {members.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => shareRecoveryLink(m)}
                className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl bg-canvas px-3.5 py-2 text-left"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <Avatar name={m.display_name} seed={m.id} size="sm" />
                  <span className="truncate text-[13px] font-semibold text-fg">
                    {m.display_name}
                    {m.id === currentMember.id && <span className="font-normal text-fg-muted"> (tu)</span>}
                  </span>
                </span>
                {recoveryCopiedFor === m.id ? (
                  <span className="flex shrink-0 items-center gap-1 text-[12px] font-bold text-brand-text">
                    <Check aria-hidden="true" size={14} /> Copiato
                  </span>
                ) : (
                  <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-fg-muted" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </Card>
  )
}

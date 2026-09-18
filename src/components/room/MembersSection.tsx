import { Check, LifeBuoy, Share2 } from 'lucide-react'
import { useState } from 'react'
import Avatar from '../ui/Avatar'
import Button from '../ui/Button'
import Chip from '../ui/Chip'
import SectionHeader from '../ui/SectionHeader'
import { encodeResumeToken } from '../../lib/resumeToken'
import { shareOrCopy } from '../../lib/share'
import type { Car, CarPassenger, Member, Room } from '../../types'

// Estratto da StanzaTab: la lista partecipanti appartiene alla sezione Gruppo,
// non alla panoramica dell'evento.

function roleLabel(memberId: string, cars: Car[], carPassengers: CarPassenger[]): string {
  if (cars.some((c) => c.driver_member_id === memberId)) return 'guida'
  if (carPassengers.some((cp) => cp.member_id === memberId)) return 'passeggero'
  return 'senza auto'
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
    <section aria-label="Partecipanti">
      <SectionHeader
        title="Membri del gruppo"
        hint={`${confirmedCount} di ${members.length} hanno confermato`}
      />
      <ul className="space-y-1.5">
        {members.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5 shadow-card"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar name={m.display_name} seed={m.id} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-fg">
                  {m.display_name}
                  {m.id === currentMember.id && <span className="font-normal text-fg-muted"> (tu)</span>}
                </p>
                <p className="text-[12px] text-fg-muted">{roleLabel(m.id, cars, carPassengers)}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {m.confirmed ? (
                <Chip tone="ok">
                  <Check aria-hidden="true" size={11} /> ok
                </Chip>
              ) : (
                <Chip tone="warn">in attesa</Chip>
              )}
              <button
                type="button"
                onClick={() => shareRecoveryLink(m)}
                title={`Link di recupero per ${m.display_name}`}
                aria-label={`Link di recupero per ${m.display_name}`}
                className="flex h-11 w-11 items-center justify-center rounded-full text-fg-muted transition-colors active:text-accent"
              >
                {recoveryCopiedFor === m.id ? (
                  <Check size={15} className="text-accent" />
                ) : (
                  <LifeBuoy size={15} />
                )}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {canInvite && (
        <Button variant="surface" className="mt-3 w-full" onClick={invite}>
          {shared ? <Check size={15} /> : <Share2 size={15} />}
          {shared ? 'Link copiato!' : 'Invita amici'}
        </Button>
      )}
    </section>
  )
}

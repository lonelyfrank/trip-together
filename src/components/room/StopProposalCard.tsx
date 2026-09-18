import { Clock, Fuel, HelpCircle, Utensils } from 'lucide-react'
import { useEffect, useState } from 'react'
import Card from '../ui/Card'
import Chip from '../ui/Chip'
import { useRoomOptimistic } from '../../hooks/useRoomOptimistic'
import { upsertStopProposalVote } from '../../lib/mutations'
import { computeOutcome, remainingFraction } from '../../lib/proposals'
import type { Member, StopProposal, StopProposalVote } from '../../types'

const TYPE_META: Record<StopProposal['type'], { label: string; icon: typeof Fuel }> = {
  benzina: { label: 'Benzina', icon: Fuel },
  cibo_bagno: { label: 'Cibo/bagno', icon: Utensils },
  attesa: { label: 'Attesa', icon: Clock },
  altro: { label: 'Altro', icon: HelpCircle },
}

const OUTCOME_META = {
  pending: { label: 'In corso', tone: 'amber' as const },
  accepted: { label: 'Accettata', tone: 'teal' as const },
  rejected: { label: 'Rifiutata', tone: 'muted' as const },
  expired: { label: 'Scaduta', tone: 'muted' as const },
}

interface StopProposalCardProps {
  proposal: StopProposal
  votes: StopProposalVote[]
  eligibleMembers: Member[]
  currentMemberId: string
}

export default function StopProposalCard({ proposal, votes, eligibleMembers, currentMemberId }: StopProposalCardProps) {
  const [, setTick] = useState(0)
  const optimistic = useRoomOptimistic(proposal.room_id)

  const outcome = computeOutcome(proposal, votes, eligibleMembers.length)
  useEffect(() => {
    if (outcome !== 'pending') return
    const id = setInterval(() => setTick((t) => t + 1), 3000)
    return () => clearInterval(id)
  }, [outcome])

  const meta = TYPE_META[proposal.type]
  const Icon = meta.icon
  const outcomeMeta = OUTCOME_META[outcome]
  const fraction = remainingFraction(proposal, Date.now())
  const yes = votes.filter((v) => v.vote === 'yes').length
  const no = votes.filter((v) => v.vote === 'no').length
  const myVote = votes.find((v) => v.member_id === currentMemberId)?.vote
  const canVote = outcome === 'pending' && eligibleMembers.some((m) => m.id === currentMemberId)

  function castVote(vote: 'yes' | 'no') {
    const now = new Date().toISOString()
    optimistic(
      'stop_proposal_votes.cast',
      (prev) => {
        const others = prev.stopProposalVotes.filter(
          (v) => !(v.proposal_id === proposal.id && v.member_id === currentMemberId),
        )
        return {
          ...prev,
          stopProposalVotes: [...others, { proposal_id: proposal.id, member_id: currentMemberId, vote, voted_at: now }],
        }
      },
      () => upsertStopProposalVote(proposal.id, currentMemberId, vote),
      'Voto non registrato.',
    )
  }

  return (
    <Card tone={outcome === 'pending' ? 'highlight' : 'flat'}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-fg">
          <Icon size={14} />
          <span className="text-[13px] font-medium">{meta.label}</span>
        </div>
        <Chip tone={outcomeMeta.tone}>{outcomeMeta.label}</Chip>
      </div>

      {proposal.note && <p className="mb-2 text-[12px] text-fg-muted">{proposal.note}</p>}

      {outcome === 'pending' && (
        <div className="mb-2 h-1 overflow-hidden rounded-full bg-canvas">
          <div className="h-full bg-warn transition-all" style={{ width: `${fraction * 100}%` }} />
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-fg-muted">
          {yes} sì · {no} no · {eligibleMembers.length} aventi diritto
        </span>
        {canVote && (
          <div className="flex gap-1.5">
            <button
              onClick={() => castVote('yes')}
              className={`rounded-full px-3 py-1 text-[11px] ${myVote === 'yes' ? 'bg-accent text-on-accent' : 'bg-canvas text-fg-muted'}`}
            >
              Sì
            </button>
            <button
              onClick={() => castVote('no')}
              className={`rounded-full px-3 py-1 text-[11px] ${myVote === 'no' ? 'bg-danger text-on-accent' : 'bg-canvas text-fg-muted'}`}
            >
              No
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}

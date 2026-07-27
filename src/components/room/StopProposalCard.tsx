import { Clock, Fuel, HelpCircle, Utensils } from 'lucide-react'
import { useEffect, useState } from 'react'
import Card from '../ui/Card'
import Chip from '../ui/Chip'
import { computeOutcome, remainingFraction } from '../../lib/proposals'
import { supabase } from '../../lib/supabase'
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

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 3000)
    return () => clearInterval(id)
  }, [])

  const meta = TYPE_META[proposal.type]
  const Icon = meta.icon
  const outcome = computeOutcome(proposal, votes, eligibleMembers.length)
  const outcomeMeta = OUTCOME_META[outcome]
  const fraction = remainingFraction(proposal, Date.now())
  const yes = votes.filter((v) => v.vote === 'yes').length
  const no = votes.filter((v) => v.vote === 'no').length
  const myVote = votes.find((v) => v.member_id === currentMemberId)?.vote
  const canVote = outcome === 'pending' && eligibleMembers.some((m) => m.id === currentMemberId)

  async function castVote(vote: 'yes' | 'no') {
    await supabase
      .from('stop_proposal_votes')
      .upsert({ proposal_id: proposal.id, member_id: currentMemberId, vote }, { onConflict: 'proposal_id,member_id' })
  }

  return (
    <Card tone={outcome === 'pending' ? 'highlight' : 'flat'}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-cream">
          <Icon size={14} />
          <span className="text-[13px] font-medium">{meta.label}</span>
        </div>
        <Chip tone={outcomeMeta.tone}>{outcomeMeta.label}</Chip>
      </div>

      {proposal.note && <p className="mb-2 text-[12px] text-muted">{proposal.note}</p>}

      {outcome === 'pending' && (
        <div className="mb-2 h-1 overflow-hidden rounded-full bg-ink">
          <div className="h-full bg-amber transition-all" style={{ width: `${fraction * 100}%` }} />
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-muted">
          {yes} sì · {no} no · {eligibleMembers.length} aventi diritto
        </span>
        {canVote && (
          <div className="flex gap-1.5">
            <button
              onClick={() => castVote('yes')}
              className={`rounded-full px-3 py-1 text-[11px] ${myVote === 'yes' ? 'bg-teal text-ink' : 'bg-ink text-muted'}`}
            >
              Sì
            </button>
            <button
              onClick={() => castVote('no')}
              className={`rounded-full px-3 py-1 text-[11px] ${myVote === 'no' ? 'bg-coral text-ink' : 'bg-ink text-muted'}`}
            >
              No
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}

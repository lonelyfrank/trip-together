import { Plus } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import BottomSheet from '../ui/BottomSheet'
import Button from '../ui/Button'
import { mutate } from '../../lib/db'
import { supabase } from '../../lib/supabase'
import type { Member, StopProposal, StopProposalType, StopProposalVote } from '../../types'
import StopProposalCard from './StopProposalCard'

const TYPE_LABELS: Record<StopProposalType, string> = {
  benzina: 'Benzina',
  cibo_bagno: 'Cibo/bagno',
  attesa: 'Attesa',
  altro: 'Altro',
}

const TYPES: StopProposalType[] = ['benzina', 'cibo_bagno', 'attesa', 'altro']

interface StopProposalsSectionProps {
  roomId: string
  carId: string | null
  currentMember: Member
  eligibleMembers: Member[]
  proposals: StopProposal[]
  votes: StopProposalVote[]
  canPropose: boolean
  title: string
}

export default function StopProposalsSection({
  roomId,
  carId,
  currentMember,
  eligibleMembers,
  proposals,
  votes,
  canPropose,
  title,
}: StopProposalsSectionProps) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<StopProposalType | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!type) return
    setSaving(true)
    try {
      await mutate(
        'stop_proposals.insert',
        supabase.from('stop_proposals').insert({
          room_id: roomId,
          car_id: carId,
          proposed_by: currentMember.id,
          type,
          note: note.trim() || null,
        }),
      )
      setType(null)
      setNote('')
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  if (proposals.length === 0 && !canPropose) return null

  return (
    <div className="space-y-2">
      {proposals.length > 0 && (
        <>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{title}</p>
          <div className="space-y-2">
            {proposals.map((p) => (
              <StopProposalCard
                key={p.id}
                proposal={p}
                votes={votes.filter((v) => v.proposal_id === p.id)}
                eligibleMembers={eligibleMembers}
                currentMemberId={currentMember.id}
              />
            ))}
          </div>
        </>
      )}

      {canPropose && (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border-soft py-2 text-[12px] font-medium text-cream transition-transform active:scale-[0.98]"
        >
          <Plus size={13} /> Proponi sosta
        </button>
      )}

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Proponi una sosta">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-full px-3 py-1.5 text-[12px] ${type === t ? 'bg-amber text-ink' : 'bg-ink text-muted'}`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          <input
            className="rounded-lg border border-border-soft bg-ink px-3 py-2 text-[13px] text-cream placeholder:text-muted"
            placeholder="Nota breve (opzionale)"
            maxLength={80}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button type="submit" variant="teal" disabled={!type || saving}>
            Proponi (scade tra 15 min)
          </Button>
        </form>
      </BottomSheet>
    </div>
  )
}

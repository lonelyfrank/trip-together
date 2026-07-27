import type { StopProposal, StopProposalVote } from '../types'

export type ProposalOutcome = 'pending' | 'accepted' | 'rejected' | 'expired'

/** Calcolato lato client ad ogni render — nessun cron necessario per l'MVP. */
export function computeOutcome(
  proposal: StopProposal,
  votes: StopProposalVote[],
  eligibleCount: number,
): ProposalOutcome {
  const yes = votes.filter((v) => v.vote === 'yes').length
  const no = votes.filter((v) => v.vote === 'no').length
  const majority = Math.floor(eligibleCount / 2) + 1

  if (yes >= majority) return 'accepted'
  if (no >= majority) return 'rejected'
  if (Date.now() > new Date(proposal.expires_at).getTime()) return 'expired'
  return 'pending'
}

export function remainingFraction(proposal: StopProposal, now: number): number {
  const start = new Date(proposal.created_at).getTime()
  const end = new Date(proposal.expires_at).getTime()
  if (end <= start) return 0
  const fraction = (end - now) / (end - start)
  return Math.max(0, Math.min(1, fraction))
}

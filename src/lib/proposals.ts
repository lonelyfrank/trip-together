import type { StopProposal, StopProposalVote } from '../types'

export type ProposalOutcome = 'pending' | 'accepted' | 'rejected' | 'expired'

// L'esito è derivato da voti e scadenza: nessuno status persistito o cron.
// Le proposte concluse restano visibili solo fino a 15 minuti dopo la scadenza.
export function computeOutcome(
  proposal: StopProposal,
  votes: StopProposalVote[],
  eligibleCount: number,
  now = Date.now(),
): ProposalOutcome {
  const yes = votes.filter((v) => v.vote === 'yes').length
  const no = votes.filter((v) => v.vote === 'no').length
  const majority = Math.floor(eligibleCount / 2) + 1

  if (yes >= majority) return 'accepted'
  if (no >= majority) return 'rejected'
  if (now >= new Date(proposal.expires_at).getTime()) return 'expired'
  return 'pending'
}

export function remainingFraction(proposal: StopProposal, now: number): number {
  const start = new Date(proposal.created_at).getTime()
  const end = new Date(proposal.expires_at).getTime()
  if (end <= start) return 0
  const fraction = (end - now) / (end - start)
  return Math.max(0, Math.min(1, fraction))
}

export const PROPOSAL_RETENTION_MS = 15 * 60_000

export function isProposalVisible(proposal: StopProposal, votes: StopProposalVote[], eligibleCount: number, now = Date.now()): boolean {
  return computeOutcome(proposal, votes, eligibleCount, now) === 'pending'
    || now < Date.parse(proposal.expires_at) + PROPOSAL_RETENTION_MS
}

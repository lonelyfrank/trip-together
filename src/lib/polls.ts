import type { RoomPoll, RoomPollOption, RoomPollVote } from '../types'

// Spoglio di un sondaggio. Come per le proposte di sosta, l'esito è derivato
// dai voti e dalla scadenza: nessuno `status` persistito che possa dire il
// contrario di quello che dicono le righe.

export interface PollOptionTally {
  option: RoomPollOption
  votes: number
  /** Quota sui voti espressi, non sui membri: 0 quando non ha votato nessuno. */
  fraction: number
  voterIds: string[]
  /** Più opzioni insieme quando c'è parità: un pareggio non ha un vincitore. */
  leading: boolean
}

export interface PollTally {
  open: boolean
  totalVotes: number
  /** Membri che non hanno ancora votato: quanti mancano, non chi sono. */
  missingVotes: number
  myOptionId: string | null
  options: PollOptionTally[]
}

/** Aperto finché la scadenza è nulla o futura. Chiudere = scriverla adesso. */
export function isPollOpen(poll: RoomPoll, now = Date.now()): boolean {
  return !poll.closes_at || Date.parse(poll.closes_at) > now
}

export function tallyPoll(
  poll: RoomPoll,
  options: RoomPollOption[],
  votes: RoomPollVote[],
  memberCount: number,
  currentMemberId: string,
  now = Date.now(),
): PollTally {
  const pollOptions = options.filter((option) => option.poll_id === poll.id)
  const pollVotes = votes.filter((vote) => vote.poll_id === poll.id)
  const best = pollOptions.reduce(
    (max, option) => Math.max(max, pollVotes.filter((vote) => vote.option_id === option.id).length),
    0,
  )

  return {
    open: isPollOpen(poll, now),
    totalVotes: pollVotes.length,
    // Chi è entrato dopo la chiusura non risulta "mancante" in negativo.
    missingVotes: Math.max(memberCount - pollVotes.length, 0),
    myOptionId: pollVotes.find((vote) => vote.member_id === currentMemberId)?.option_id ?? null,
    options: pollOptions.map((option) => {
      const voterIds = pollVotes.filter((vote) => vote.option_id === option.id).map((vote) => vote.member_id)
      return {
        option,
        votes: voterIds.length,
        fraction: pollVotes.length > 0 ? voterIds.length / pollVotes.length : 0,
        voterIds,
        leading: best > 0 && voterIds.length === best,
      }
    }),
  }
}

/**
 * I sondaggi aperti per primi, poi i chiusi dal più recente: una decisione da
 * prendere conta più di una già presa, che resta consultabile sotto.
 */
export function sortPolls(polls: RoomPoll[], now = Date.now()): RoomPoll[] {
  return [...polls].sort((a, b) => {
    const openA = isPollOpen(a, now)
    if (openA !== isPollOpen(b, now)) return openA ? -1 : 1
    return Date.parse(b.created_at) - Date.parse(a.created_at)
  })
}

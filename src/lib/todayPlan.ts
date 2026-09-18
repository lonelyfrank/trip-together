import type { Car, CarPassenger, Member, Room, StopProposal, StopProposalVote } from '../types'
import { computeOutcome } from './proposals.ts'

// "Piano di oggi" dei mockup, ricavato dai soli fatti che il database conosce
// già: l'orario dell'evento, quando ogni auto ha cambiato stato e le soste
// accettate dal gruppo. Nessun itinerario inventato — quello arriverà con la
// tabella `activities`.

export type PlanState = 'done' | 'now' | 'next'

export interface PlanEntry {
  id: string
  /** ISO, oppure null quando l'orario non è ancora stato deciso. */
  at: string | null
  label: string
  detail?: string
  state: PlanState
}

interface TodayPlanInput {
  room: Room
  cars: Car[]
  carPassengers: CarPassenger[]
  members: Member[]
  stopProposals: StopProposal[]
  stopProposalVotes: StopProposalVote[]
}

const DEPARTED: Car['travel_status'][] = ['in_partenza', 'in_viaggio', 'fermo', 'arrivata']

const STOP_LABEL: Record<StopProposal['type'], string> = {
  benzina: 'Sosta benzina',
  cibo_bagno: 'Sosta cibo o bagno',
  attesa: 'Sosta di attesa',
  altro: 'Sosta',
}

export function todayPlan(
  { room, cars, carPassengers, members, stopProposals, stopProposalVotes }: TodayPlanInput,
  now = Date.now(),
): PlanEntry[] {
  const nameOf = (memberId: string | null) =>
    members.find((m) => m.id === memberId)?.display_name ?? 'un amico'
  const entries: PlanEntry[] = []

  entries.push({
    id: 'ritrovo',
    at: room.event_time,
    label: 'Ritrovo',
    detail: room.destination_label ?? undefined,
    // Senza orario il ritrovo resta il prossimo passo, non un passo compiuto.
    state: room.event_time && Date.parse(room.event_time) <= now ? 'done' : 'next',
  })

  for (const car of cars) {
    if (!DEPARTED.includes(car.travel_status)) continue
    const driver = nameOf(car.driver_member_id)
    entries.push(
      car.travel_status === 'arrivata'
        ? { id: `arrivo-${car.id}`, at: car.travel_status_updated_at, label: `Arrivo · auto di ${driver}`, state: 'done' }
        : {
            id: `partenza-${car.id}`,
            at: car.travel_status_updated_at,
            label: `In viaggio · auto di ${driver}`,
            detail: car.travel_status === 'fermo' ? 'ferma in questo momento' : undefined,
            state: car.travel_status === 'fermo' ? 'now' : 'done',
          },
    )
  }

  for (const proposal of stopProposals) {
    const votes = stopProposalVotes.filter((v) => v.proposal_id === proposal.id)
    // Una proposta di auto la votano conducente e passeggeri di quell'auto;
    // una proposta di comitiva la vota tutto il gruppo.
    const eligible = proposal.car_id
      ? cars.filter((c) => c.id === proposal.car_id).length +
        carPassengers.filter((p) => p.car_id === proposal.car_id).length
      : members.length
    if (computeOutcome(proposal, votes, eligible, now) !== 'accepted') continue
    entries.push({
      id: `sosta-${proposal.id}`,
      at: proposal.created_at,
      label: STOP_LABEL[proposal.type],
      detail: proposal.note ?? undefined,
      state: 'now',
    })
  }

  // Gli orari mancanti vanno in fondo: un passo senza orario non può precedere
  // uno già avvenuto.
  return entries.sort((a, b) => {
    if (a.at === b.at) return a.id < b.id ? -1 : 1
    if (a.at === null) return 1
    if (b.at === null) return -1
    return Date.parse(a.at) - Date.parse(b.at)
  })
}

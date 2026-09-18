import type { PostgrestError } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { COLLECTION_ORDER, orderCollection } from '../lib/collectionOrder'
import { firstError, query, rows, single } from '../lib/db'
import { roomRefresh, ROOM_POLL_MS } from '../lib/roomRefresh'
import { ensureAnonymousSession, supabase } from '../lib/supabase'
import type {
  Activity,
  ActivityParticipant,
  BoardLink,
  BoardNote,
  Car,
  CarCargoItem,
  CarExpense,
  CarPassenger,
  DelayReport,
  ExpenseSettlement,
  GeneralExpense,
  GeneralExpenseParticipant,
  Member,
  RadarPosition,
  RideRequest,
  Room,
  RoomChecklistItem,
  RoomPoll,
  RoomPollOption,
  RoomPollVote,
  StopProposal,
  StopProposalVote,
} from '../types'

export interface RoomPayload {
  error: PostgrestError | null
  sectionErrors: Partial<Record<'auto' | 'spese' | 'bacheca' | 'radar' | 'attivita' | 'sondaggi', PostgrestError | null>>
  room: Room | null
  members: Member[]
  cars: Car[]
  carPassengers: CarPassenger[]
  carExpenses: CarExpense[]
  carCargo: CarCargoItem[]
  delayReports: DelayReport[]
  generalExpenses: GeneralExpense[]
  generalExpenseParticipants: GeneralExpenseParticipant[]
  boardNotes: BoardNote[]
  boardLinks: BoardLink[]
  radarPositions: RadarPosition[]
  roomChecklistItems: RoomChecklistItem[]
  stopProposals: StopProposal[]
  stopProposalVotes: StopProposalVote[]
  rideRequests: RideRequest[]
  activities: Activity[]
  activityParticipants: ActivityParticipant[]
  polls: RoomPoll[]
  pollOptions: RoomPollOption[]
  pollVotes: RoomPollVote[]
  settlements: ExpenseSettlement[]
}

const EMPTY_PAYLOAD: RoomPayload = {
  error: null,
  sectionErrors: {},
  room: null,
  members: [],
  cars: [],
  carPassengers: [],
  carExpenses: [],
  carCargo: [],
  delayReports: [],
  generalExpenses: [],
  generalExpenseParticipants: [],
  boardNotes: [],
  boardLinks: [],
  radarPositions: [],
  roomChecklistItems: [],
  stopProposals: [],
  stopProposalVotes: [],
  rideRequests: [],
  activities: [],
  activityParticipants: [],
  polls: [],
  pollOptions: [],
  pollVotes: [],
  settlements: [],
}

export const roomDataKey = (roomId: string) => ['room-data', roomId] as const

// Config unica: tabella → collezione nel payload + colonne di primary key.
// Guida sia le sottoscrizioni realtime (tutte filtrate per room_id) sia le
// patch mirate della cache. `id` dove non indicato.
type CollectionKey = Exclude<keyof RoomPayload, 'error' | 'room' | 'sectionErrors'>
const TABLES: { table: string; key: CollectionKey; pk: string[] }[] = [
  { table: 'members', key: 'members', pk: ['id'] },
  { table: 'cars', key: 'cars', pk: ['id'] },
  { table: 'car_passengers', key: 'carPassengers', pk: ['id'] },
  { table: 'car_expenses', key: 'carExpenses', pk: ['id'] },
  { table: 'car_cargo', key: 'carCargo', pk: ['id'] },
  { table: 'delay_reports', key: 'delayReports', pk: ['id'] },
  { table: 'general_expenses', key: 'generalExpenses', pk: ['id'] },
  { table: 'general_expense_participants', key: 'generalExpenseParticipants', pk: ['id'] },
  { table: 'board_notes', key: 'boardNotes', pk: ['id'] },
  { table: 'board_links', key: 'boardLinks', pk: ['id'] },
  { table: 'radar_positions', key: 'radarPositions', pk: ['member_id'] },
  { table: 'room_checklist_items', key: 'roomChecklistItems', pk: ['id'] },
  { table: 'stop_proposals', key: 'stopProposals', pk: ['id'] },
  { table: 'stop_proposal_votes', key: 'stopProposalVotes', pk: ['proposal_id', 'member_id'] },
  { table: 'ride_requests', key: 'rideRequests', pk: ['id'] },
  { table: 'activities', key: 'activities', pk: ['id'] },
  { table: 'activity_participants', key: 'activityParticipants', pk: ['activity_id', 'member_id'] },
  { table: 'room_polls', key: 'polls', pk: ['id'] },
  { table: 'room_poll_options', key: 'pollOptions', pk: ['id'] },
  { table: 'room_poll_votes', key: 'pollVotes', pk: ['poll_id', 'member_id'] },
  { table: 'expense_settlements', key: 'settlements', pk: ['id'] },
]
const BY_TABLE = new Map(TABLES.map((t) => [t.table, t]))

function roomList(table: string, roomId: string) {
  let request = supabase.from(table).select('*').eq('room_id', roomId)
  for (const column of COLLECTION_ORDER[table]) request = request.order(column, { ascending: true, nullsFirst: false })
  return request
}

async function fetchRoomData(id: string): Promise<RoomPayload> {
  await ensureAnonymousSession()
  const [
    roomQ,
    membersQ,
    carsQ,
    carPassengersQ,
    carExpensesQ,
    carCargoQ,
    delayReportsQ,
    generalExpensesQ,
    generalExpenseParticipantsQ,
    boardNotesQ,
    boardLinksQ,
    radarQ,
    roomChecklistQ,
    stopProposalsQ,
    stopProposalVotesQ,
    rideRequestsQ,
    activitiesQ,
    activityParticipantsQ,
    pollsQ,
    pollOptionsQ,
    pollVotesQ,
    settlementsQ,
  ] = await Promise.all([
    query<Room>('rooms.byId', supabase.from('rooms').select('*').eq('id', id).maybeSingle()),
    query<Member[]>('members.byRoom', roomList('members', id)),
    query<Car[]>('cars.byRoom', roomList('cars', id)),
    query<CarPassenger[]>('car_passengers.byRoom', roomList('car_passengers', id)),
    query<CarExpense[]>('car_expenses.byRoom', roomList('car_expenses', id)),
    query<CarCargoItem[]>('car_cargo.byRoom', roomList('car_cargo', id)),
    query<DelayReport[]>('delay_reports.byRoom', roomList('delay_reports', id)),
    query<GeneralExpense[]>('general_expenses.byRoom', roomList('general_expenses', id)),
    query<GeneralExpenseParticipant[]>(
      'general_expense_participants.byRoom',
      roomList('general_expense_participants', id),
    ),
    query<BoardNote[]>('board_notes.byRoom', roomList('board_notes', id)),
    query<BoardLink[]>('board_links.byRoom', roomList('board_links', id)),
    query<RadarPosition[]>('radar_positions.byRoom', roomList('radar_positions', id)),
    query<RoomChecklistItem[]>(
      'room_checklist_items.byRoom',
      roomList('room_checklist_items', id),
    ),
    query<StopProposal[]>('stop_proposals.byRoom', roomList('stop_proposals', id)),
    query<StopProposalVote[]>(
      'stop_proposal_votes.byRoom',
      roomList('stop_proposal_votes', id),
    ),
    query<RideRequest[]>('ride_requests.byRoom', roomList('ride_requests', id)),
    query<Activity[]>('activities.byRoom', roomList('activities', id)),
    query<ActivityParticipant[]>(
      'activity_participants.byRoom',
      roomList('activity_participants', id),
    ),
    query<RoomPoll[]>('room_polls.byRoom', roomList('room_polls', id)),
    query<RoomPollOption[]>('room_poll_options.byRoom', roomList('room_poll_options', id)),
    query<RoomPollVote[]>('room_poll_votes.byRoom', roomList('room_poll_votes', id)),
    query<ExpenseSettlement[]>('expense_settlements.byRoom', roomList('expense_settlements', id)),
  ])

  return {
    // Gli errori di una funzionalità non nascondono l'intero evento, ma non
    // possono essere interpretati come liste vuote o saldi a zero.
    error: firstError(roomQ, membersQ, carsQ),
    sectionErrors: {
      auto: firstError(carPassengersQ, carCargoQ, carExpensesQ, delayReportsQ, stopProposalsQ, stopProposalVotesQ, rideRequestsQ),
      spese: firstError(carPassengersQ, carExpensesQ, generalExpensesQ, generalExpenseParticipantsQ, settlementsQ),
      bacheca: firstError(boardNotesQ, boardLinksQ, roomChecklistQ),
      radar: firstError(radarQ),
      attivita: firstError(activitiesQ, activityParticipantsQ),
      sondaggi: firstError(pollsQ, pollOptionsQ, pollVotesQ),
    },
    room: single(roomQ),
    members: rows(membersQ),
    cars: rows(carsQ),
    carPassengers: rows(carPassengersQ),
    carExpenses: rows(carExpensesQ),
    carCargo: rows(carCargoQ),
    delayReports: rows(delayReportsQ),
    generalExpenses: rows(generalExpensesQ),
    generalExpenseParticipants: rows(generalExpenseParticipantsQ),
    boardNotes: rows(boardNotesQ),
    boardLinks: rows(boardLinksQ),
    radarPositions: rows(radarQ),
    roomChecklistItems: rows(roomChecklistQ),
    stopProposals: rows(stopProposalsQ),
    stopProposalVotes: rows(stopProposalVotesQ),
    rideRequests: rows(rideRequestsQ),
    activities: rows(activitiesQ),
    activityParticipants: rows(activityParticipantsQ),
    polls: rows(pollsQ),
    pollOptions: rows(pollOptionsQ),
    pollVotes: rows(pollVotesQ),
    settlements: rows(settlementsQ),
  }
}

// Righe realtime non tipizzate dal client: any è intenzionale.
type Row = Record<string, any>

/** Applica un singolo evento realtime alla cache, senza refetch. */
function applyChange(
  prev: RoomPayload,
  table: string,
  eventType: 'INSERT' | 'UPDATE' | 'DELETE',
  newRow: Row,
  oldRow: Row,
): RoomPayload {
  if (table === 'rooms') {
    if (eventType === 'DELETE') return { ...prev, room: null }
    return { ...prev, room: newRow as Room }
  }

  const cfg = BY_TABLE.get(table)
  if (!cfg) return prev

  const list = prev[cfg.key] as Row[]
  const idOf = (r: Row) => cfg.pk.map((k) => r?.[k]).join('|')

  if (eventType === 'INSERT') {
    if (list.some((x) => idOf(x) === idOf(newRow))) return prev
    return { ...prev, [cfg.key]: orderCollection(table, [...list, newRow]) }
  }
  if (eventType === 'UPDATE') {
    return { ...prev, [cfg.key]: orderCollection(table, list.map((x) => (idOf(x) === idOf(newRow) ? newRow : x))) }
  }
  return { ...prev, [cfg.key]: list.filter((x) => idOf(x) !== idOf(oldRow)) }
}

export function useRoomData(roomId: string | undefined) {
  const queryClient = useQueryClient()

  const { data, isLoading, error: queryError, refetch } = useQuery({
    queryKey: roomId ? roomDataKey(roomId) : ['room-data', 'none'],
    queryFn: () => fetchRoomData(roomId!),
    enabled: !!roomId,
  })

  useEffect(() => {
    if (!roomId) return

    const invalidate = () => queryClient.invalidateQueries({ queryKey: roomDataKey(roomId) })

    const refresh = roomRefresh(() => { void invalidate() }, () => !document.hidden)
    const patch = (table: string) => (payload: { eventType: string; new: Row; old: Row }) => {
      refresh.onEvent()
      queryClient.setQueryData(roomDataKey(roomId), (prev?: RoomPayload) =>
        prev ? applyChange(prev, table, payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE', payload.new, payload.old) : prev,
      )
    }

    // UN canale, tutte le sottoscrizioni filtrate per room_id: un evento tocca
    // solo la sua collezione (patch mirata), niente refetch totale.
    let channel = supabase
      .channel(`room-data:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, patch('rooms'))
    for (const { table } of TABLES) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `room_id=eq.${roomId}` },
        patch(table),
      )
    }

    // SUBSCRIBED precede talvolta l'ascolto effettivo della replica. Rileggiamo
    // anche alla sua prima conferma per recuperare le modifiche in quel varco.
    channel.on('system', {}, (payload) => {
      if (payload.extension === 'postgres_changes' && payload.status === 'ok') void invalidate()
    }).subscribe()

    // La rilettura copre i periodi in cui il canale tace, senza fare 16 query
    // ogni 20 secondi anche in background o mentre arrivano già eventi.
    const pollId = setInterval(refresh.poll, ROOM_POLL_MS)
    document.addEventListener('visibilitychange', refresh.onVisible)

    return () => {
      clearInterval(pollId)
      document.removeEventListener('visibilitychange', refresh.onVisible)
      supabase.removeChannel(channel)
    }
  }, [roomId, queryClient])

  return { isLoading: !!roomId && isLoading, ...(data ?? EMPTY_PAYLOAD), error: queryError ?? data?.error ?? null, refetch }
}

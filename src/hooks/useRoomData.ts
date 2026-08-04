import type { PostgrestError } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { firstError, query, rows, single } from '../lib/db'
import { supabase } from '../lib/supabase'
import type {
  BoardLink,
  BoardNote,
  Car,
  CarCargoItem,
  CarExpense,
  CarPassenger,
  DelayReport,
  GeneralExpense,
  GeneralExpenseParticipant,
  Member,
  RadarPosition,
  RideRequest,
  Room,
  RoomChecklistItem,
  StopProposal,
  StopProposalVote,
} from '../types'

interface RoomPayload {
  error: PostgrestError | null
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
}

const EMPTY_PAYLOAD: RoomPayload = {
  error: null,
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
}

export const roomDataKey = (roomId: string) => ['room-data', roomId] as const

// Config unica: tabella → collezione nel payload + colonne di primary key.
// Guida sia le sottoscrizioni realtime (tutte filtrate per room_id) sia le
// patch mirate della cache. `id` dove non indicato.
type CollectionKey = Exclude<keyof RoomPayload, 'error' | 'room'>
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
]
const BY_TABLE = new Map(TABLES.map((t) => [t.table, t]))

async function fetchRoomData(id: string): Promise<RoomPayload> {
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
  ] = await Promise.all([
    query<Room>('rooms.byId', supabase.from('rooms').select('*').eq('id', id).maybeSingle()),
    query<Member[]>('members.byRoom', supabase.from('members').select('*').eq('room_id', id)),
    query<Car[]>('cars.byRoom', supabase.from('cars').select('*').eq('room_id', id)),
    query<CarPassenger[]>('car_passengers.byRoom', supabase.from('car_passengers').select('*').eq('room_id', id)),
    query<CarExpense[]>('car_expenses.byRoom', supabase.from('car_expenses').select('*').eq('room_id', id)),
    query<CarCargoItem[]>('car_cargo.byRoom', supabase.from('car_cargo').select('*').eq('room_id', id)),
    query<DelayReport[]>('delay_reports.byRoom', supabase.from('delay_reports').select('*').eq('room_id', id)),
    query<GeneralExpense[]>('general_expenses.byRoom', supabase.from('general_expenses').select('*').eq('room_id', id)),
    query<GeneralExpenseParticipant[]>(
      'general_expense_participants.byRoom',
      supabase.from('general_expense_participants').select('*').eq('room_id', id),
    ),
    query<BoardNote[]>('board_notes.byRoom', supabase.from('board_notes').select('*').eq('room_id', id)),
    query<BoardLink[]>('board_links.byRoom', supabase.from('board_links').select('*').eq('room_id', id)),
    query<RadarPosition[]>('radar_positions.byRoom', supabase.from('radar_positions').select('*').eq('room_id', id)),
    query<RoomChecklistItem[]>(
      'room_checklist_items.byRoom',
      supabase.from('room_checklist_items').select('*').eq('room_id', id),
    ),
    query<StopProposal[]>('stop_proposals.byRoom', supabase.from('stop_proposals').select('*').eq('room_id', id)),
    query<StopProposalVote[]>(
      'stop_proposal_votes.byRoom',
      supabase.from('stop_proposal_votes').select('*').eq('room_id', id),
    ),
    query<RideRequest[]>('ride_requests.byRoom', supabase.from('ride_requests').select('*').eq('room_id', id)),
  ])

  return {
    // Solo le query essenziali determinano lo stato d'errore della stanza: le
    // tabelle-feature che falliscono (o la cui colonna manca) degradano a vuoto
    // — l'errore è comunque loggato da query(), quindi mai silenzioso.
    error: firstError(roomQ, membersQ, carsQ),
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
    return { ...prev, [cfg.key]: [...list, newRow] }
  }
  if (eventType === 'UPDATE') {
    return { ...prev, [cfg.key]: list.map((x) => (idOf(x) === idOf(newRow) ? newRow : x)) }
  }
  return { ...prev, [cfg.key]: list.filter((x) => idOf(x) !== idOf(oldRow)) }
}

export function useRoomData(roomId: string | undefined) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: roomId ? roomDataKey(roomId) : ['room-data', 'none'],
    queryFn: () => fetchRoomData(roomId!),
    enabled: !!roomId,
  })

  useEffect(() => {
    if (!roomId) return

    const invalidate = () => queryClient.invalidateQueries({ queryKey: roomDataKey(roomId) })

    const patch = (table: string) => (payload: { eventType: string; new: Row; old: Row }) => {
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

    // Alla RI-connessione del canale si può aver perso qualche evento: un solo
    // refetch di riconciliazione come fallback (non ad ogni evento).
    let wasSubscribed = false
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        if (wasSubscribed) invalidate()
        wasSubscribed = true
      }
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, queryClient])

  return { isLoading: !!roomId && isLoading, ...(data ?? EMPTY_PAYLOAD) }
}

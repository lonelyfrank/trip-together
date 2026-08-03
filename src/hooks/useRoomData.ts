import type { PostgrestError } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'react'
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

interface RoomData {
  isLoading: boolean
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

const EMPTY: RoomData = {
  isLoading: true,
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

export function useRoomData(roomId: string | undefined) {
  const [data, setData] = useState<RoomData>(EMPTY)

  const loadAll = useCallback(async (id: string) => {
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
      query<CarPassenger[]>(
        'car_passengers.byRoom',
        supabase.from('car_passengers').select('*, cars!inner(room_id)').eq('cars.room_id', id),
      ),
      query<CarExpense[]>(
        'car_expenses.byRoom',
        supabase.from('car_expenses').select('*, cars!inner(room_id)').eq('cars.room_id', id),
      ),
      query<CarCargoItem[]>(
        'car_cargo.byRoom',
        supabase.from('car_cargo').select('*, cars!inner(room_id)').eq('cars.room_id', id),
      ),
      query<DelayReport[]>(
        'delay_reports.byRoom',
        supabase.from('delay_reports').select('*, cars!inner(room_id)').eq('cars.room_id', id),
      ),
      query<GeneralExpense[]>('general_expenses.byRoom', supabase.from('general_expenses').select('*').eq('room_id', id)),
      query<GeneralExpenseParticipant[]>(
        'general_expense_participants.byRoom',
        supabase
          .from('general_expense_participants')
          .select('*, general_expenses!inner(room_id)')
          .eq('general_expenses.room_id', id),
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
        supabase.from('stop_proposal_votes').select('*, stop_proposals!inner(room_id)').eq('stop_proposals.room_id', id),
      ),
      query<RideRequest[]>('ride_requests.byRoom', supabase.from('ride_requests').select('*').eq('room_id', id)),
    ])

    setData({
      isLoading: false,
      error: firstError(
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
      ),
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
    })
  }, [])

  useEffect(() => {
    if (!roomId) return
    loadAll(roomId)
  }, [roomId, loadAll])

  useEffect(() => {
    if (!roomId) return

    // Alcune tabelle (car_expenses, car_cargo, car_passengers, general_expense_participants)
    // non hanno room_id diretto: alla scala di un gruppo di amici è più semplice ricaricare
    // tutto ad ogni evento che filtrare lato client per car_id/expense_id di questa stanza.
    const channel = supabase
      .channel(`room-data:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, () =>
        loadAll(roomId),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `room_id=eq.${roomId}` }, () =>
        loadAll(roomId),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cars', filter: `room_id=eq.${roomId}` }, () =>
        loadAll(roomId),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'car_passengers' }, () => loadAll(roomId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'car_expenses' }, () => loadAll(roomId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'car_cargo' }, () => loadAll(roomId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delay_reports' }, () => loadAll(roomId))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'general_expenses', filter: `room_id=eq.${roomId}` },
        () => loadAll(roomId),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'general_expense_participants' }, () =>
        loadAll(roomId),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'board_notes', filter: `room_id=eq.${roomId}` },
        () => loadAll(roomId),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'board_links', filter: `room_id=eq.${roomId}` },
        () => loadAll(roomId),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'radar_positions', filter: `room_id=eq.${roomId}` },
        () => loadAll(roomId),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_checklist_items', filter: `room_id=eq.${roomId}` },
        () => loadAll(roomId),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stop_proposals', filter: `room_id=eq.${roomId}` },
        () => loadAll(roomId),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stop_proposal_votes' }, () => loadAll(roomId))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ride_requests', filter: `room_id=eq.${roomId}` },
        () => loadAll(roomId),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, loadAll])

  return data
}

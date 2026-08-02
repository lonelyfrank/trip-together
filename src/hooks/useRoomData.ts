import { useCallback, useEffect, useState } from 'react'
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
  loading: boolean
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
  loading: true,
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
      roomRes,
      membersRes,
      carsRes,
      carPassengersRes,
      carExpensesRes,
      carCargoRes,
      delayReportsRes,
      generalExpensesRes,
      generalExpenseParticipantsRes,
      boardNotesRes,
      boardLinksRes,
      radarRes,
      roomChecklistRes,
      stopProposalsRes,
      stopProposalVotesRes,
      rideRequestsRes,
    ] = await Promise.all([
      supabase.from('rooms').select('*').eq('id', id).maybeSingle(),
      supabase.from('members').select('*').eq('room_id', id),
      supabase.from('cars').select('*').eq('room_id', id),
      supabase.from('car_passengers').select('*, cars!inner(room_id)').eq('cars.room_id', id),
      supabase.from('car_expenses').select('*, cars!inner(room_id)').eq('cars.room_id', id),
      supabase.from('car_cargo').select('*, cars!inner(room_id)').eq('cars.room_id', id),
      supabase.from('delay_reports').select('*, cars!inner(room_id)').eq('cars.room_id', id),
      supabase.from('general_expenses').select('*').eq('room_id', id),
      supabase
        .from('general_expense_participants')
        .select('*, general_expenses!inner(room_id)')
        .eq('general_expenses.room_id', id),
      supabase.from('board_notes').select('*').eq('room_id', id),
      supabase.from('board_links').select('*').eq('room_id', id),
      supabase.from('radar_positions').select('*').eq('room_id', id),
      supabase.from('room_checklist_items').select('*').eq('room_id', id),
      supabase.from('stop_proposals').select('*').eq('room_id', id),
      supabase
        .from('stop_proposal_votes')
        .select('*, stop_proposals!inner(room_id)')
        .eq('stop_proposals.room_id', id),
      supabase.from('ride_requests').select('*').eq('room_id', id),
    ])

    setData({
      loading: false,
      room: roomRes.data ?? null,
      members: membersRes.data ?? [],
      cars: carsRes.data ?? [],
      carPassengers: carPassengersRes.data ?? [],
      carExpenses: carExpensesRes.data ?? [],
      carCargo: carCargoRes.data ?? [],
      delayReports: delayReportsRes.data ?? [],
      generalExpenses: generalExpensesRes.data ?? [],
      generalExpenseParticipants: generalExpenseParticipantsRes.data ?? [],
      boardNotes: boardNotesRes.data ?? [],
      boardLinks: boardLinksRes.data ?? [],
      radarPositions: radarRes.data ?? [],
      roomChecklistItems: roomChecklistRes.data ?? [],
      stopProposals: stopProposalsRes.data ?? [],
      stopProposalVotes: stopProposalVotesRes.data ?? [],
      rideRequests: rideRequestsRes.data ?? [],
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

import { supabase } from '../supabase'
import type { DelayReason, StopProposalType, TravelStatus } from '../../types'

// Builder Supabase centralizzati per le mutazioni di una stanza.
// I componenti passano il risultato a mutate / mutateNotify / useRoomOptimistic.

// ─── Stanza ─────────────────────────────────────────────────────────────

export function updateRoomDestination(
  roomId: string,
  destination: { label: string | null; lat: number | null; lng: number | null },
) {
  return supabase
    .from('rooms')
    .update({
      destination_label: destination.label,
      destination_lat: destination.lat,
      destination_lng: destination.lng,
    })
    .eq('id', roomId)
}

export function updateRoomEventTime(roomId: string, eventTimeIso: string | null) {
  return supabase.from('rooms').update({ event_time: eventTimeIso }).eq('id', roomId)
}

export function closeRoom(roomId: string) {
  return supabase.from('rooms').update({ status: 'closed' }).eq('id', roomId)
}

export function deleteCarsByRoom(roomId: string) {
  return supabase.from('cars').delete().eq('room_id', roomId)
}

export function deleteGeneralExpensesByRoom(roomId: string) {
  return supabase.from('general_expenses').delete().eq('room_id', roomId)
}

export function deleteBoardNotesByRoom(roomId: string) {
  return supabase.from('board_notes').delete().eq('room_id', roomId)
}

export function deleteBoardLinksByRoom(roomId: string) {
  return supabase.from('board_links').delete().eq('room_id', roomId)
}

export function deleteRadarPositionsByRoom(roomId: string) {
  return supabase.from('radar_positions').delete().eq('room_id', roomId)
}

// ─── Membri ─────────────────────────────────────────────────────────────

export function confirmMemberPresence(memberId: string) {
  return supabase
    .from('members')
    .update({ confirmed: true, confirmed_at: new Date().toISOString() })
    .eq('id', memberId)
}

// ─── Bacheca ────────────────────────────────────────────────────────────

export function insertBoardNote(roomId: string, text: string, pinned: boolean) {
  return supabase.from('board_notes').insert({ room_id: roomId, text: text.trim(), pinned })
}

export function toggleBoardNotePin(noteId: string, pinned: boolean) {
  return supabase.from('board_notes').update({ pinned }).eq('id', noteId)
}

export function insertBoardLink(roomId: string, label: string, url: string) {
  return supabase.from('board_links').insert({ room_id: roomId, label: label.trim(), url: url.trim() })
}

// ─── Checklist ────────────────────────────────────────────────────────────

export function insertChecklistItem(roomId: string, title: string, createdBy: string) {
  return supabase
    .from('room_checklist_items')
    .insert({ room_id: roomId, title: title.trim(), created_by: createdBy })
}

export function assignChecklistItem(itemId: string, memberId: string) {
  return supabase.from('room_checklist_items').update({ assigned_to: memberId }).eq('id', itemId)
}

export function updateChecklistItemStatus(itemId: string, status: 'da_portare' | 'portato') {
  return supabase.from('room_checklist_items').update({ status }).eq('id', itemId)
}

// ─── Auto ─────────────────────────────────────────────────────────────────

export function insertCar(roomId: string, driverMemberId: string, seatsTotal: number) {
  return supabase.from('cars').insert({ room_id: roomId, driver_member_id: driverMemberId, seats_total: seatsTotal })
}

export function deleteCar(carId: string) {
  return supabase.from('cars').delete().eq('id', carId)
}

export function deleteCarPassengerByMember(memberId: string) {
  return supabase.from('car_passengers').delete().eq('member_id', memberId)
}

export function insertCarPassenger(carId: string, memberId: string) {
  return supabase.from('car_passengers').insert({ car_id: carId, member_id: memberId })
}

export function setCarTravelStatus(carId: string, status: TravelStatus, updatedBy: string, updatedAt: string) {
  return supabase
    .from('cars')
    .update({ travel_status: status, travel_status_updated_at: updatedAt, travel_status_updated_by: updatedBy })
    .eq('id', carId)
}

export function insertCarCargoItem(carId: string, item: string) {
  return supabase.from('car_cargo').insert({ car_id: carId, item: item.trim(), packed: false })
}

export function toggleCarCargoPacked(cargoId: string, packed: boolean) {
  return supabase.from('car_cargo').update({ packed }).eq('id', cargoId)
}

// ─── Ritardi ──────────────────────────────────────────────────────────────

export function insertDelayReport(
  carId: string,
  reason: DelayReason,
  minutesEstimate: number | null,
  reportedBy: string,
) {
  return supabase.from('delay_reports').insert({
    car_id: carId,
    reason,
    minutes_estimate: minutesEstimate,
    reported_by: reportedBy,
  })
}

export function resolveDelayReport(delayId: string, resolvedAt: string) {
  return supabase.from('delay_reports').update({ resolved_at: resolvedAt }).eq('id', delayId)
}

export function resolveDelayReportsForCar(carId: string, resolvedAt: string) {
  return supabase.from('delay_reports').update({ resolved_at: resolvedAt }).eq('car_id', carId).is('resolved_at', null)
}

// ─── Spese ────────────────────────────────────────────────────────────────

export function insertGeneralExpense(
  roomId: string,
  label: string,
  amount: number,
  paidByMemberId: string,
) {
  return supabase
    .from('general_expenses')
    .insert({ room_id: roomId, label: label.trim(), amount, paid_by_member_id: paidByMemberId })
    .select()
    .single()
}

export function insertGeneralExpenseParticipants(expenseId: string, memberIds: string[]) {
  return supabase
    .from('general_expense_participants')
    .insert(memberIds.map((memberId) => ({ expense_id: expenseId, member_id: memberId })))
}

export function waiveGeneralExpense(expenseId: string, waivedByMemberId: string) {
  return supabase
    .from('general_expenses')
    .update({ waived: true, waived_by_member_id: waivedByMemberId })
    .eq('id', expenseId)
}

// ─── Proposte sosta ───────────────────────────────────────────────────────

export function insertStopProposal(
  roomId: string,
  carId: string | null,
  proposedBy: string,
  type: StopProposalType,
  note: string | null,
) {
  return supabase.from('stop_proposals').insert({
    room_id: roomId,
    car_id: carId,
    proposed_by: proposedBy,
    type,
    note,
  })
}

export function upsertStopProposalVote(proposalId: string, memberId: string, vote: 'yes' | 'no') {
  return supabase
    .from('stop_proposal_votes')
    .upsert({ proposal_id: proposalId, member_id: memberId, vote }, { onConflict: 'proposal_id,member_id' })
}

// ─── Richieste passaggio ──────────────────────────────────────────────────

export function insertRideRequest(roomId: string, memberId: string) {
  return supabase.from('ride_requests').insert({ room_id: roomId, member_id: memberId })
}

export function cancelRideRequest(requestId: string) {
  return supabase.from('ride_requests').update({ status: 'cancelled' }).eq('id', requestId)
}

export function matchRideRequest(requestId: string, carId: string) {
  return supabase.from('ride_requests').update({ status: 'matched', matched_car_id: carId }).eq('id', requestId)
}

// ─── Radar ────────────────────────────────────────────────────────────────

export function upsertRadarPosition(memberId: string, roomId: string, lat: number, lng: number, updatedAt: string) {
  return supabase
    .from('radar_positions')
    .upsert({ member_id: memberId, room_id: roomId, lat, lng, updated_at: updatedAt }, { onConflict: 'member_id' })
}

export function deleteRadarPosition(memberId: string) {
  return supabase.from('radar_positions').delete().eq('member_id', memberId)
}

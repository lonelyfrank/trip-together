import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import type { ActivityCategory, ActivityStatus, DelayReason, StopProposalType, TravelStatus } from '../../types'

// Builder Supabase centralizzati per le mutazioni di una stanza.
// I componenti passano il risultato a mutate / mutateNotify / useRoomOptimistic.
//
// Ogni builder è avvolto da op(): un Op porta con sé nome + argomenti (primitivi,
// serializzabili) oltre alla funzione run() che esegue davvero la chiamata
// Supabase. È il prerequisito per la coda offline (src/lib/offlineQueue.ts): un
// Op può essere rieseguito subito (online) o salvato come {name, args} in
// localStorage e ricostruito via getOpRegistry() al ritorno online. queueable:
// false esclude esplicitamente un builder dalla coda (usato dal radar: una
// posizione mancata va scartata, non accodata).

export interface Op<T = null> {
  name: string
  args: unknown[]
  queueable?: boolean
  run: () => PromiseLike<{ data?: T | null; error: PostgrestError | null }>
}

type OpFactory<A extends unknown[], T> = (...args: A) => Op<T>

const registry: Record<string, OpFactory<any[], any>> = {}

export function getOpRegistry(): Record<string, OpFactory<any[], any>> {
  return registry
}

function op<A extends unknown[], T = null>(
  name: string,
  run: (...args: A) => PromiseLike<{ data?: T | null; error: PostgrestError | null }>,
  opts?: { queueable?: boolean },
): OpFactory<A, T> {
  const factory: OpFactory<A, T> = (...args: A) => ({
    name,
    args,
    queueable: opts?.queueable,
    run: () => run(...args),
  })
  registry[name] = factory
  return factory
}

// ─── Stanza ─────────────────────────────────────────────────────────────

export const updateRoomDestination = op(
  'rooms.updateDestination',
  (roomId: string, destination: { label: string | null; lat: number | null; lng: number | null }) =>
    supabase
      .from('rooms')
      .update({
        destination_label: destination.label,
        destination_lat: destination.lat,
        destination_lng: destination.lng,
      })
      .eq('id', roomId),
)

export const updateRoomEventTime = op('rooms.updateEventTime', (roomId: string, eventTimeIso: string | null) =>
  supabase.from('rooms').update({ event_time: eventTimeIso }).eq('id', roomId),
)

export const closeRoom = op('rooms.close', (roomId: string) =>
  supabase.from('rooms').update({ status: 'closed' }).eq('id', roomId).select('id').single(),
  { queueable: false },
)

export const deleteCarsByRoom = op('cars.deleteByRoom', (roomId: string) =>
  supabase.from('cars').delete().eq('room_id', roomId),
)

export const deleteGeneralExpensesByRoom = op('general_expenses.deleteByRoom', (roomId: string) =>
  supabase.from('general_expenses').delete().eq('room_id', roomId),
)

export const deleteBoardNotesByRoom = op('board_notes.deleteByRoom', (roomId: string) =>
  supabase.from('board_notes').delete().eq('room_id', roomId),
)

export const deleteBoardLinksByRoom = op('board_links.deleteByRoom', (roomId: string) =>
  supabase.from('board_links').delete().eq('room_id', roomId),
)

export const deleteRadarPositionsByRoom = op('radar_positions.deleteByRoom', (roomId: string) =>
  supabase.from('radar_positions').delete().eq('room_id', roomId),
)

// ─── Membri ─────────────────────────────────────────────────────────────

export const confirmMemberPresence = op('members.confirmPresence', (memberId: string) =>
  supabase
    .from('members')
    .update({ confirmed: true, confirmed_at: new Date().toISOString() })
    .eq('id', memberId),
)

// ─── Bacheca ────────────────────────────────────────────────────────────

export const insertBoardNote = op('board_notes.insert', (roomId: string, text: string, pinned: boolean) =>
  supabase.from('board_notes').insert({ room_id: roomId, text: text.trim(), pinned }),
)

export const toggleBoardNotePin = op('board_notes.togglePin', (noteId: string, pinned: boolean) =>
  supabase.from('board_notes').update({ pinned }).eq('id', noteId),
)

export const insertBoardLink = op('board_links.insert', (roomId: string, label: string, url: string) =>
  supabase.from('board_links').insert({ room_id: roomId, label: label.trim(), url: url.trim() }),
)

// ─── Checklist ────────────────────────────────────────────────────────────

export const insertChecklistItem = op(
  'room_checklist_items.insert',
  (roomId: string, title: string, createdBy: string) =>
    supabase.from('room_checklist_items').insert({ room_id: roomId, title: title.trim(), created_by: createdBy }),
)

export const assignChecklistItem = op('room_checklist_items.assign', (itemId: string, memberId: string) =>
  supabase.from('room_checklist_items').update({ assigned_to: memberId }).eq('id', itemId),
)

export const updateChecklistItemStatus = op(
  'room_checklist_items.updateStatus',
  (itemId: string, status: 'da_portare' | 'portato') =>
    supabase.from('room_checklist_items').update({ status }).eq('id', itemId),
)

// ─── Auto ─────────────────────────────────────────────────────────────────

export const insertCar = op('cars.insert', (roomId: string, driverMemberId: string, seatsTotal: number) =>
  supabase.from('cars').insert({ room_id: roomId, driver_member_id: driverMemberId, seats_total: seatsTotal }),
)

export const deleteCar = op('cars.delete', (carId: string) => supabase.from('cars').delete().eq('id', carId))

export const deleteCarPassengerByMember = op('car_passengers.deleteByMember', (memberId: string) =>
  supabase.from('car_passengers').delete().eq('member_id', memberId),
)

export const insertCarPassenger = op('car_passengers.insert', (carId: string, memberId: string) =>
  // Il vincolo unico su member_id rende il cambio auto una sola scrittura:
  // se fallisce, il posto precedente resta assegnato.
  supabase.from('car_passengers').upsert({ car_id: carId, member_id: memberId }, { onConflict: 'member_id' }),
)

export const setCarTravelStatus = op(
  'cars.travelStatus',
  (carId: string, status: TravelStatus, updatedBy: string, updatedAt: string) =>
    supabase
      .from('cars')
      .update({ travel_status: status, travel_status_updated_at: updatedAt, travel_status_updated_by: updatedBy })
      .eq('id', carId),
)

export const insertCarCargoItem = op('car_cargo.insert', (carId: string, item: string) =>
  supabase.from('car_cargo').insert({ car_id: carId, item: item.trim(), packed: false }),
)

export const toggleCarCargoPacked = op('car_cargo.togglePacked', (cargoId: string, packed: boolean) =>
  supabase.from('car_cargo').update({ packed }).eq('id', cargoId),
)

// ─── Ritardi ──────────────────────────────────────────────────────────────

export const insertDelayReport = op(
  'delay_reports.insert',
  (carId: string, reason: DelayReason, minutesEstimate: number | null, reportedBy: string) =>
    supabase.from('delay_reports').insert({
      car_id: carId,
      reason,
      minutes_estimate: minutesEstimate,
      reported_by: reportedBy,
    }),
)

export const resolveDelayReport = op('delay_reports.resolve', (delayId: string, resolvedAt: string) =>
  supabase.from('delay_reports').update({ resolved_at: resolvedAt }).eq('id', delayId),
)

export const resolveDelayReportsForCar = op(
  'delay_reports.resolveForCar',
  (carId: string, resolvedAt: string) =>
    supabase
      .from('delay_reports')
      .update({ resolved_at: resolvedAt })
      .eq('car_id', carId)
      .is('resolved_at', null),
)

// ─── Spese ────────────────────────────────────────────────────────────────

// Prende l'id già generato lato client (invece di .select().single()) così la
// creazione della spesa e l'inserimento dei partecipanti restano due Op
// indipendenti, rieseguibili separatamente dalla coda offline senza che il
// secondo dipenda su un dato restituito dal primo.
export const insertGeneralExpense = op(
  'general_expenses.insert',
  (id: string, roomId: string, label: string, amount: number, paidByMemberId: string) =>
    supabase
      .from('general_expenses')
      .insert({ id, room_id: roomId, label: label.trim(), amount, paid_by_member_id: paidByMemberId }),
)

export const insertGeneralExpenseParticipants = op(
  'general_expense_participants.insert',
  (expenseId: string, memberIds: string[]) =>
    supabase
      .from('general_expense_participants')
      .upsert([...new Set(memberIds)].map((memberId) => ({ expense_id: expenseId, member_id: memberId })), { onConflict: 'expense_id,member_id' }),
)

export const waiveGeneralExpense = op('general_expenses.waive', (expenseId: string, waivedByMemberId: string) =>
  supabase
    .from('general_expenses')
    .update({ waived: true, waived_by_member_id: waivedByMemberId })
    .eq('id', expenseId),
)

// ─── Proposte sosta ───────────────────────────────────────────────────────

export const insertStopProposal = op(
  'stop_proposals.insert',
  (roomId: string, carId: string | null, proposedBy: string, type: StopProposalType, note: string | null) =>
    supabase.from('stop_proposals').insert({
      room_id: roomId,
      car_id: carId,
      proposed_by: proposedBy,
      type,
      note,
    }),
)

export const upsertStopProposalVote = op(
  'stop_proposal_votes.upsert',
  (proposalId: string, memberId: string, vote: 'yes' | 'no') =>
    supabase
      .from('stop_proposal_votes')
      .upsert({ proposal_id: proposalId, member_id: memberId, vote }, { onConflict: 'proposal_id,member_id' }),
)

// ─── Richieste passaggio ──────────────────────────────────────────────────

export const insertRideRequest = op('ride_requests.insert', (roomId: string, memberId: string) =>
  supabase.from('ride_requests').insert({ room_id: roomId, member_id: memberId }),
)

export const cancelRideRequest = op('ride_requests.cancel', (requestId: string) =>
  supabase.from('ride_requests').update({ status: 'cancelled' }).eq('id', requestId),
)

export const matchRideRequest = op('ride_requests.match', (requestId: string, carId: string) =>
  supabase.from('ride_requests').update({ status: 'matched', matched_car_id: carId }).eq('id', requestId),
)

// ─── Radar ────────────────────────────────────────────────────────────────
// queueable: false — mai accodato offline, coerente col vincolo di dominio
// (il radar è sempre opt-in esplicito, una posizione mancata va scartata).

export const upsertRadarPosition = op(
  'radar_positions.upsert',
  (memberId: string, roomId: string, lat: number, lng: number, updatedAt: string) =>
    supabase
      .from('radar_positions')
      .upsert({ member_id: memberId, room_id: roomId, lat, lng, updated_at: updatedAt }, { onConflict: 'member_id' }),
  { queueable: false },
)

export const deleteRadarPosition = op(
  'radar_positions.delete',
  (memberId: string) => supabase.from('radar_positions').delete().eq('member_id', memberId),
  { queueable: false },
)

// ─── Attività (itinerario) ────────────────────────────────────────────────
// L'id è generato lato client come per le spese: così creare la tappa e
// iscriversi restano due Op indipendenti, rieseguibili separatamente dalla
// coda offline senza che la seconda dipenda da un dato restituito dalla prima.

export const insertActivity = op(
  'activities.insert',
  (
    id: string,
    roomId: string,
    createdBy: string,
    fields: {
      title: string
      startsAt: string | null
      category: ActivityCategory
      placeLabel: string | null
      pricePerPerson: number | null
      durationMinutes: number | null
      note: string | null
    },
  ) =>
    supabase.from('activities').insert({
      id,
      room_id: roomId,
      created_by: createdBy,
      title: fields.title.trim(),
      starts_at: fields.startsAt,
      category: fields.category,
      place_label: fields.placeLabel?.trim() || null,
      price_per_person: fields.pricePerPerson,
      duration_minutes: fields.durationMinutes,
      note: fields.note?.trim() || null,
    }),
)

export const setActivityStatus = op(
  'activities.setStatus',
  (activityId: string, status: ActivityStatus) =>
    supabase.from('activities').update({ status }).eq('id', activityId),
)

export const deleteActivity = op('activities.delete', (activityId: string) =>
  supabase.from('activities').delete().eq('id', activityId),
)

// Aderire è il voto: non esiste una tabella di voti separata, l'interesse del
// gruppo è la lista dei partecipanti. L'upsert rende il doppio tocco innocuo.
export const joinActivity = op('activity_participants.join', (activityId: string, memberId: string) =>
  supabase
    .from('activity_participants')
    .upsert({ activity_id: activityId, member_id: memberId }, { onConflict: 'activity_id,member_id' }),
)

export const leaveActivity = op('activity_participants.leave', (activityId: string, memberId: string) =>
  supabase
    .from('activity_participants')
    .delete()
    .eq('activity_id', activityId)
    .eq('member_id', memberId),
)

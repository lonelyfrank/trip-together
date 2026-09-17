export type RoomStatus = 'open' | 'closed'
export type MemberRole = 'creator' | 'guest'
export type CrewMemberRole = 'creator' | 'member'

export interface Crew {
  id: string
  invite_code: string
  name: string
  created_by: string
  created_at: string
}

export interface CrewMember {
  id: string
  crew_id: string
  display_name: string
  auth_user_id: string | null
  role: CrewMemberRole
  created_at: string
}

export interface Room {
  id: string
  invite_code: string
  title: string
  crew_id: string | null
  destination_label: string | null
  destination_lat: number | null
  destination_lng: number | null
  event_time: string | null
  status: RoomStatus
  created_by: string
  created_at: string
}

export interface Member {
  id: string
  room_id: string
  display_name: string
  auth_user_id: string | null
  role: MemberRole
  confirmed: boolean
  confirmed_at: string | null
  created_at: string
}

export type TravelStatus = 'non_partita' | 'in_partenza' | 'in_viaggio' | 'fermo' | 'arrivata'

export interface Car {
  id: string
  room_id: string
  driver_member_id: string
  seats_total: number
  travel_status: TravelStatus
  travel_status_updated_at: string
  travel_status_updated_by: string | null
  created_at: string
}

export interface CarPassenger {
  id: string
  car_id: string
  member_id: string
}

export type DelayReason = 'traffico' | 'benzina' | 'dimenticanza' | 'altro'

export interface DelayReport {
  id: string
  car_id: string
  reason: DelayReason
  minutes_estimate: number | null
  reported_by: string
  created_at: string
  resolved_at: string | null
}

export interface CarExpense {
  id: string
  car_id: string
  label: string
  amount: number
  paid_by_member_id: string | null
  created_at: string
}

export interface CarCargoItem {
  id: string
  car_id: string
  item: string
  packed: boolean
  created_at: string
}

export interface GeneralExpense {
  id: string
  room_id: string
  label: string
  amount: number
  paid_by_member_id: string | null
  waived: boolean
  waived_by_member_id: string | null
  created_at: string
}

export interface GeneralExpenseParticipant {
  id: string
  expense_id: string
  member_id: string
}

export interface BoardNote {
  id: string
  room_id: string
  text: string
  pinned: boolean
  created_at: string
}

export interface BoardLink {
  id: string
  room_id: string
  label: string
  url: string
  created_at: string
}

export interface RadarPosition {
  member_id: string
  room_id: string
  lat: number
  lng: number
  updated_at: string
}

export type StopProposalType = 'benzina' | 'cibo_bagno' | 'attesa' | 'altro'
export type StopProposalStatus = 'pending' | 'accepted' | 'rejected' | 'expired'

export interface StopProposal {
  id: string
  room_id: string
  car_id: string | null
  proposed_by: string
  type: StopProposalType
  note: string | null
  status: StopProposalStatus
  created_at: string
  expires_at: string
}

export interface StopProposalVote {
  proposal_id: string
  member_id: string
  vote: 'yes' | 'no'
  voted_at: string
}

export type RideRequestStatus = 'pending' | 'matched' | 'cancelled'

export interface RideRequest {
  id: string
  room_id: string
  member_id: string
  status: RideRequestStatus
  created_at: string
  matched_car_id: string | null
}

export type ChecklistItemStatus = 'da_portare' | 'portato'

export interface RoomChecklistItem {
  id: string
  room_id: string
  title: string
  assigned_to: string | null
  status: ChecklistItemStatus
  created_by: string
  created_at: string
}

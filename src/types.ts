export type RoomStatus = 'open' | 'closed'
export type MemberRole = 'creator' | 'guest'

export interface Room {
  id: string
  invite_code: string
  title: string
  destination_label: string | null
  destination_lat: number | null
  destination_lng: number | null
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

export interface CarExpense {
  id: string
  car_id: string
  label: string
  amount: number
  paid_by_member_id: string | null
}

export interface CarCargoItem {
  id: string
  car_id: string
  item: string
  packed: boolean
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
}

export interface RadarPosition {
  member_id: string
  room_id: string
  lat: number
  lng: number
  updated_at: string
}

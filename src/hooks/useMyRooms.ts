import type { PostgrestError } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import { query, rows } from '../lib/db'
import { getSavedRooms } from '../lib/localRooms'
import { ensureAnonymousSession, supabase } from '../lib/supabase'
import type { Room } from '../types'

export interface RoomSummary {
  room: Room
  memberId: string
  memberCount: number
  openBalance: boolean
  radarActive: boolean
}

const RADAR_ACTIVE_WINDOW_MS = 5 * 60_000

interface MyRoomsPayload {
  summaries: RoomSummary[]
  error: PostgrestError | null
}

async function fetchMyRooms(): Promise<MyRoomsPayload> {
  const entries = getSavedRooms()
  if (entries.length === 0) return { summaries: [], error: null }
  await ensureAnonymousSession()

  const roomIds = entries.map((e) => e.roomId)
  const cutoff = new Date(Date.now() - RADAR_ACTIVE_WINDOW_MS).toISOString()

  const [roomsQ, membersQ, carExpensesQ, generalExpensesQ, radarQ] = await Promise.all([
    query<Room[]>('rooms.mine', supabase.from('rooms').select('*').in('id', roomIds).order('created_at', { ascending: false }).order('id')),
    query<{ id: string; room_id: string }[]>(
      'members.mine',
      supabase.from('members').select('id, room_id').in('room_id', roomIds).order('created_at').order('id'),
    ),
    // any: l'embed cars!inner è tipizzato come array da supabase-js, ma a runtime
    // (to-one) è un oggetto; si legge e.cars.room_id come nell'implementazione originale.
    query<any[]>(
      'car_expenses.mine',
      supabase.from('car_expenses').select('car_id, cars!inner(room_id)').in('cars.room_id', roomIds).order('created_at').order('id'),
    ),
    query<{ room_id: string; waived: boolean }[]>(
      'general_expenses.mine',
      supabase.from('general_expenses').select('room_id, waived').in('room_id', roomIds).order('created_at').order('id'),
    ),
    query<{ room_id: string; updated_at: string }[]>(
      'radar_positions.mine',
      supabase.from('radar_positions').select('room_id, updated_at').in('room_id', roomIds).order('member_id').gt('updated_at', cutoff),
    ),
  ])

  // La lista in sé è quella delle stanze: un suo errore è lo stato d'errore
  // dell'hook; le query di arricchimento degradano silenziose (già loggate).
  if (roomsQ.kind === 'fail') return { summaries: [], error: roomsQ.error }

  const roomIdsWithCarExpenses = new Set(rows(carExpensesQ).map((e) => e.cars.room_id))
  const members = rows(membersQ)
  const generalExpenses = rows(generalExpensesQ)
  const radar = rows(radarQ)

  const summaries: RoomSummary[] = rows(roomsQ)
    .map((room) => {
      const entry = entries.find((e) => e.roomId === room.id)!
      return {
        room,
        memberId: entry.memberId,
        memberCount: members.filter((m) => m.room_id === room.id).length,
        openBalance:
          generalExpenses.some((e) => e.room_id === room.id && !e.waived) || roomIdsWithCarExpenses.has(room.id),
        radarActive: radar.some((r) => r.room_id === room.id),
      }
    })

  return { summaries, error: null }
}

export function useMyRooms() {
  const { data, isLoading, error: queryError } = useQuery({ queryKey: ['my-rooms'], queryFn: fetchMyRooms })
  return { summaries: data?.summaries ?? [], isLoading, error: queryError ?? data?.error ?? null }
}

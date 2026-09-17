import type { PostgrestError } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import { query, rows } from '../lib/db'
import { getSavedRooms } from '../lib/localRooms'
import { ensureAnonymousSession, supabase } from '../lib/supabase'
import type { Room } from '../types'

export interface RoomSummary {
  room: Room
  memberCount: number
}

interface MyRoomsPayload {
  summaries: RoomSummary[]
  error: PostgrestError | null
}

async function fetchMyRooms(): Promise<MyRoomsPayload> {
  const entries = getSavedRooms()
  if (entries.length === 0) return { summaries: [], error: null }
  await ensureAnonymousSession()

  const roomIds = entries.map((e) => e.roomId)

  const [roomsQ, membersQ] = await Promise.all([
    query<Room[]>('rooms.mine', supabase.from('rooms').select('*').in('id', roomIds).order('created_at', { ascending: false }).order('id')),
    query<{ id: string; room_id: string }[]>(
      'members.mine',
      supabase.from('members').select('id, room_id').in('room_id', roomIds).order('created_at').order('id'),
    ),
  ])

  // La lista in sé è quella delle stanze: un suo errore è lo stato d'errore
  // dell'hook; le query di arricchimento degradano silenziose (già loggate).
  if (roomsQ.kind === 'fail') return { summaries: [], error: roomsQ.error }

  const members = rows(membersQ)
  const summaries: RoomSummary[] = rows(roomsQ).map((room) => ({
    room,
    memberCount: members.filter((m) => m.room_id === room.id).length,
  }))

  return { summaries, error: null }
}

export function useMyRooms() {
  const { data, isLoading, error: queryError } = useQuery({ queryKey: ['my-rooms'], queryFn: fetchMyRooms })
  return { summaries: data?.summaries ?? [], isLoading, error: queryError ?? data?.error ?? null }
}

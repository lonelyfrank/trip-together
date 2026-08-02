import { useEffect, useState } from 'react'
import { getSavedRooms } from '../lib/localRooms'
import { supabase } from '../lib/supabase'
import type { Room } from '../types'

export interface RoomSummary {
  room: Room
  memberId: string
  memberCount: number
  openBalance: boolean
  radarActive: boolean
}

const RADAR_ACTIVE_WINDOW_MS = 5 * 60_000

export function useMyRooms() {
  const [summaries, setSummaries] = useState<RoomSummary[]>([])
  const [loading, setLoading] = useState(true)

  async function reload() {
    const entries = getSavedRooms()
    if (entries.length === 0) {
      setSummaries([])
      setLoading(false)
      return
    }

    const roomIds = entries.map((e) => e.roomId)
    const cutoff = new Date(Date.now() - RADAR_ACTIVE_WINDOW_MS).toISOString()

    const [roomsRes, membersRes, carExpensesRes, generalExpensesRes, radarRes] = await Promise.all([
      supabase.from('rooms').select('*').in('id', roomIds),
      supabase.from('members').select('id, room_id').in('room_id', roomIds),
      supabase.from('car_expenses').select('car_id, cars!inner(room_id)').in('cars.room_id', roomIds),
      supabase.from('general_expenses').select('room_id, waived').in('room_id', roomIds),
      supabase.from('radar_positions').select('room_id, updated_at').in('room_id', roomIds).gt('updated_at', cutoff),
    ])

    const roomIdsWithCarExpenses = new Set(
      (carExpensesRes.data ?? []).map((e: any) => e.cars.room_id as string),
    )

    const results: RoomSummary[] = (roomsRes.data ?? [])
      .map((room: Room) => {
        const entry = entries.find((e) => e.roomId === room.id)!
        const memberCount = (membersRes.data ?? []).filter((m) => m.room_id === room.id).length
        const hasOpenGeneralExpense = (generalExpensesRes.data ?? []).some(
          (e) => e.room_id === room.id && !e.waived,
        )
        const hasCarExpenseActivity = roomIdsWithCarExpenses.has(room.id)
        const radarActive = (radarRes.data ?? []).some((r) => r.room_id === room.id)

        return {
          room,
          memberId: entry.memberId,
          memberCount,
          openBalance: hasOpenGeneralExpense || hasCarExpenseActivity,
          radarActive,
        }
      })
      .sort((a, b) => (a.room.created_at < b.room.created_at ? 1 : -1))

    setSummaries(results)
    setLoading(false)
  }

  useEffect(() => {
    reload()
  }, [])

  return { summaries, loading }
}

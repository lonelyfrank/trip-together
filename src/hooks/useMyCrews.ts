import type { PostgrestError } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import { query, rows } from '../lib/db'
import { getSavedCrews } from '../lib/localRooms'
import { ensureAnonymousSession, supabase } from '../lib/supabase'
import type { Crew } from '../types'

export interface CrewSummary {
  crew: Crew
  memberCount: number
  eventCount: number
}

interface MyCrewsPayload {
  summaries: CrewSummary[]
  error: PostgrestError | null
}

async function fetchMyCrews(): Promise<MyCrewsPayload> {
  const entries = getSavedCrews()
  if (entries.length === 0) return { summaries: [], error: null }
  await ensureAnonymousSession()

  const crewIds = entries.map((e) => e.crewId)
  const [crewsQ, membersQ, roomsQ] = await Promise.all([
    query<Crew[]>('crews.mine', supabase.from('crews').select('*').in('id', crewIds)),
    query<{ id: string; crew_id: string }[]>(
      'crew_members.mine',
      supabase.from('crew_members').select('id, crew_id').in('crew_id', crewIds),
    ),
    query<{ id: string; crew_id: string }[]>(
      'rooms.byCrews',
      supabase.rpc('list_crew_events'),
    ),
  ])

  if (crewsQ.kind === 'fail') return { summaries: [], error: crewsQ.error }

  const members = rows(membersQ)
  const events = rows(roomsQ)
  const summaries: CrewSummary[] = rows(crewsQ)
    .map((crew) => ({
      crew,
      memberCount: members.filter((m) => m.crew_id === crew.id).length,
      eventCount: events.filter((r) => r.crew_id === crew.id).length,
    }))
    .sort((a, b) => (a.crew.created_at < b.crew.created_at ? 1 : -1))

  return { summaries, error: null }
}

export function useMyCrews() {
  const { data, isLoading, error: queryError } = useQuery({ queryKey: ['my-crews'], queryFn: fetchMyCrews })
  return { summaries: data?.summaries ?? [], isLoading, error: queryError ?? data?.error ?? null }
}

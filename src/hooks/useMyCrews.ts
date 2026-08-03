import type { PostgrestError } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { query, rows } from '../lib/db'
import { getSavedCrews } from '../lib/localRooms'
import { supabase } from '../lib/supabase'
import type { Crew } from '../types'

export interface CrewSummary {
  crew: Crew
  memberCount: number
  eventCount: number
}

export function useMyCrews() {
  const [summaries, setSummaries] = useState<CrewSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<PostgrestError | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const entries = getSavedCrews()
      if (entries.length === 0) {
        if (!cancelled) {
          setSummaries([])
          setError(null)
          setIsLoading(false)
        }
        return
      }

      const crewIds = entries.map((e) => e.crewId)
      const [crewsQ, membersQ, roomsQ] = await Promise.all([
        query<Crew[]>('crews.mine', supabase.from('crews').select('*').in('id', crewIds)),
        query<{ id: string; crew_id: string }[]>(
          'crew_members.mine',
          supabase.from('crew_members').select('id, crew_id').in('crew_id', crewIds),
        ),
        query<{ id: string; crew_id: string }[]>(
          'rooms.byCrews',
          supabase.from('rooms').select('id, crew_id').in('crew_id', crewIds),
        ),
      ])
      if (cancelled) return

      if (crewsQ.kind === 'fail') {
        setError(crewsQ.error)
        setIsLoading(false)
        return
      }

      const members = rows(membersQ)
      const events = rows(roomsQ)
      const results: CrewSummary[] = rows(crewsQ)
        .map((crew) => ({
          crew,
          memberCount: members.filter((m) => m.crew_id === crew.id).length,
          eventCount: events.filter((r) => r.crew_id === crew.id).length,
        }))
        .sort((a, b) => (a.crew.created_at < b.crew.created_at ? 1 : -1))

      setSummaries(results)
      setError(null)
      setIsLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { summaries, isLoading, error }
}

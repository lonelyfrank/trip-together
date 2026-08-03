import { useEffect, useState } from 'react'
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const entries = getSavedCrews()
      if (entries.length === 0) {
        if (!cancelled) {
          setSummaries([])
          setLoading(false)
        }
        return
      }

      const crewIds = entries.map((e) => e.crewId)
      const [crewsRes, membersRes, roomsRes] = await Promise.all([
        supabase.from('crews').select('*').in('id', crewIds),
        supabase.from('crew_members').select('id, crew_id').in('crew_id', crewIds),
        supabase.from('rooms').select('id, crew_id').in('crew_id', crewIds),
      ])
      if (cancelled) return

      const results: CrewSummary[] = (crewsRes.data ?? [])
        .map((crew: Crew) => ({
          crew,
          memberCount: (membersRes.data ?? []).filter((m) => m.crew_id === crew.id).length,
          eventCount: (roomsRes.data ?? []).filter((r) => r.crew_id === crew.id).length,
        }))
        .sort((a, b) => (a.crew.created_at < b.crew.created_at ? 1 : -1))

      setSummaries(results)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { summaries, loading }
}

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Crew, CrewMember, Room } from '../types'

interface CrewData {
  loading: boolean
  notFound: boolean
  crew: Crew | null
  members: CrewMember[]
  events: Room[]
}

const EMPTY: CrewData = { loading: true, notFound: false, crew: null, members: [], events: [] }

export function useCrewData(crewId: string | undefined) {
  const [data, setData] = useState<CrewData>(EMPTY)

  const loadAll = useCallback(async (id: string) => {
    const [crewRes, membersRes, eventsRes] = await Promise.all([
      supabase.from('crews').select('*').eq('id', id).maybeSingle(),
      supabase.from('crew_members').select('*').eq('crew_id', id),
      supabase.from('rooms').select('*').eq('crew_id', id).order('created_at', { ascending: false }),
    ])

    setData({
      loading: false,
      notFound: !crewRes.data,
      crew: crewRes.data ?? null,
      members: membersRes.data ?? [],
      events: eventsRes.data ?? [],
    })
  }, [])

  useEffect(() => {
    if (!crewId) return
    loadAll(crewId)
  }, [crewId, loadAll])

  useEffect(() => {
    if (!crewId) return
    const channel = supabase
      .channel(`crew-data:${crewId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crews', filter: `id=eq.${crewId}` }, () =>
        loadAll(crewId),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crew_members', filter: `crew_id=eq.${crewId}` },
        () => loadAll(crewId),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `crew_id=eq.${crewId}` }, () =>
        loadAll(crewId),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [crewId, loadAll])

  return data
}

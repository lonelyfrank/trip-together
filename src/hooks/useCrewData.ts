import type { PostgrestError } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'react'
import { firstError, query, rows, single } from '../lib/db'
import { supabase } from '../lib/supabase'
import type { Crew, CrewMember, Room } from '../types'

interface CrewData {
  isLoading: boolean
  error: PostgrestError | null
  notFound: boolean
  crew: Crew | null
  members: CrewMember[]
  events: Room[]
}

const EMPTY: CrewData = {
  isLoading: true,
  error: null,
  notFound: false,
  crew: null,
  members: [],
  events: [],
}

export function useCrewData(crewId: string | undefined) {
  const [data, setData] = useState<CrewData>(EMPTY)

  const loadAll = useCallback(async (id: string) => {
    const [crewQ, membersQ, eventsQ] = await Promise.all([
      query<Crew>('crews.byId', supabase.from('crews').select('*').eq('id', id).maybeSingle()),
      query<CrewMember[]>('crew_members.byCrew', supabase.from('crew_members').select('*').eq('crew_id', id)),
      query<Room[]>(
        'rooms.byCrew',
        supabase.from('rooms').select('*').eq('crew_id', id).order('created_at', { ascending: false }),
      ),
    ])

    const error = firstError(crewQ, membersQ, eventsQ)
    setData({
      isLoading: false,
      error,
      notFound: !error && crewQ.kind === 'empty',
      crew: single(crewQ),
      members: rows(membersQ),
      events: rows(eventsQ),
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

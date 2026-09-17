import type { PostgrestError } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { firstError, query, rows, single } from '../lib/db'
import { ensureAnonymousSession, supabase } from '../lib/supabase'
import type { Crew, CrewMember, Room } from '../types'

interface CrewPayload {
  error: PostgrestError | null
  notFound: boolean
  crew: Crew | null
  members: CrewMember[]
  events: Room[]
}

const EMPTY_PAYLOAD: CrewPayload = { error: null, notFound: false, crew: null, members: [], events: [] }

export const crewDataKey = (crewId: string) => ['crew-data', crewId] as const

async function fetchCrewData(id: string): Promise<CrewPayload> {
  await ensureAnonymousSession()
  const [crewQ, membersQ, eventsQ] = await Promise.all([
    query<Crew>('crews.byId', supabase.from('crews').select('*').eq('id', id).maybeSingle()),
    query<CrewMember[]>('crew_members.byCrew', supabase.from('crew_members').select('*').eq('crew_id', id)),
    query<Room[]>(
      'rooms.byCrew',
      supabase.rpc('list_crew_events', { p_crew_id: id }),
    ),
  ])

  const error = firstError(crewQ, membersQ, eventsQ)
  return {
    error,
    notFound: !error && crewQ.kind === 'empty',
    crew: single(crewQ),
    members: rows(membersQ),
    events: rows(eventsQ),
  }
}

export function useCrewData(crewId: string | undefined) {
  const queryClient = useQueryClient()

  const { data, isLoading, error: queryError } = useQuery({
    queryKey: crewId ? crewDataKey(crewId) : ['crew-data', 'none'],
    queryFn: () => fetchCrewData(crewId!),
    enabled: !!crewId,
  })

  useEffect(() => {
    if (!crewId) return
    const invalidate = () => queryClient.invalidateQueries({ queryKey: crewDataKey(crewId) })

    const channel = supabase
      .channel(`crew-data:${crewId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crews', filter: `id=eq.${crewId}` }, invalidate)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crew_members', filter: `crew_id=eq.${crewId}` },
        invalidate,
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `crew_id=eq.${crewId}` }, invalidate)

    let cancelled = false
    void ensureAnonymousSession().then(() => {
      if (!cancelled) channel.subscribe()
    }).catch((error) => console.error('[realtime comitiva]', error))

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [crewId, queryClient])

  return { isLoading: !!crewId && isLoading, ...(data ?? EMPTY_PAYLOAD), error: queryError ?? data?.error ?? null }
}

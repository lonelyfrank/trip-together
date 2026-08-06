import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { saveRoomEntry, setMyName } from '../lib/localRooms'
import { decodeResumeToken } from '../lib/resumeToken'
import { ensureAnonymousSession, supabase } from '../lib/supabase'

type Status = 'checking' | 'invalid'

export default function Resume() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('checking')

  useEffect(() => {
    const payload = token ? decodeResumeToken(token) : null
    if (!payload) {
      setStatus('invalid')
      return
    }
    let cancelled = false
    ;(async () => {
      await ensureAnonymousSession()
      const { data, error } = await supabase
        .from('members')
        .select('id, display_name')
        .eq('id', payload.memberId)
        .eq('room_id', payload.roomId)
        .maybeSingle()
      if (cancelled) return
      if (error || !data) {
        setStatus('invalid')
        return
      }
      saveRoomEntry({ roomId: payload.roomId, memberId: payload.memberId, inviteCode: payload.inviteCode })
      setMyName(data.display_name)
      navigate(`/room/${payload.roomId}`, { replace: true })
    })()
    return () => {
      cancelled = true
    }
  }, [token, navigate])

  if (status === 'invalid') {
    return (
      <div className="mx-auto flex min-h-svh max-w-lg flex-col bg-ink px-6 py-10 text-center">
        <p className="text-cream">Link di recupero non valido: il membro non esiste più in questa stanza.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-sm text-muted underline">
          Torna alla home
        </button>
      </div>
    )
  }

  return <div className="flex min-h-svh items-center justify-center bg-ink text-muted">Recupero identità...</div>
}

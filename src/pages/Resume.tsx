import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { claimRoomMember } from '../lib/membership'
import { decodeResumeToken } from '../lib/resumeToken'

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
      try {
        await claimRoomMember(payload.roomId, payload.memberId, payload.inviteCode)
        if (!cancelled) navigate(`/room/${payload.roomId}`, { replace: true })
      } catch (error) {
        console.error('[recupero partecipazione]', error)
        if (!cancelled) setStatus('invalid')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, navigate])

  if (status === 'invalid') {
    return (
      <div className="mx-auto flex min-h-svh max-w-lg flex-col bg-canvas px-6 py-10 text-center">
        <p className="text-fg">Non riusciamo a recuperare la partecipazione. Controlla la connessione e il link ricevuto, poi riprova.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-sm text-fg-muted underline">
          Torna alla home
        </button>
      </div>
    )
  }

  return <div className="flex min-h-svh items-center justify-center bg-canvas text-fg-muted">Recupero identità...</div>
}

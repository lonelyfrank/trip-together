import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/ui/Button'
import ScreenHeader from '../components/ui/ScreenHeader'
import { getMyName } from '../lib/localRooms'
import { joinCrewAsMember, joinRoomAsMember, resolveInviteCode, type ResolvedInvite } from '../lib/membership'

export default function Join() {
  const { inviteCode } = useParams<{ inviteCode: string }>()
  const navigate = useNavigate()
  const [name, setName] = useState(getMyName())
  const [resolved, setResolved] = useState<ResolvedInvite | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!inviteCode) return
    let cancelled = false
    resolveInviteCode(inviteCode)
      .then((r) => !cancelled && setResolved(r))
      .catch(() => !cancelled && setResolved({ type: 'none' }))
    return () => {
      cancelled = true
    }
  }, [inviteCode])

  async function handleJoin(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !resolved || resolved.type === 'none') return
    setSubmitting(true)
    setError(null)
    try {
      if (resolved.type === 'room') {
        await joinRoomAsMember(resolved.id, resolved.inviteCode, name)
        navigate(`/room/${resolved.id}`)
      } else {
        await joinCrewAsMember(resolved.id, resolved.inviteCode, name)
        navigate(`/crew/${resolved.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto')
    } finally {
      setSubmitting(false)
    }
  }

  if (resolved === null) {
    return <div className="flex min-h-svh items-center justify-center bg-ink text-muted">Verifica del codice...</div>
  }

  if (resolved.type === 'none') {
    return (
      <div className="mx-auto flex min-h-svh max-w-lg flex-col bg-ink px-6 py-10 text-center">
        <p className="text-cream">Nessuna stanza o comitiva trovata con il codice "{inviteCode}".</p>
        <button onClick={() => navigate('/')} className="mt-4 text-sm text-muted underline">
          Torna alla home
        </button>
      </div>
    )
  }

  const isCrew = resolved.type === 'crew'

  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col bg-ink">
      <ScreenHeader
        eyebrow={`Codice ${inviteCode}`}
        title={isCrew ? 'Entra nella comitiva' : 'Entra nella stanza'}
      />
      <form onSubmit={handleJoin} className="flex flex-col gap-3 px-4 sm:px-6">
        {error && <p className="rounded-xl bg-coral/10 px-4 py-2 text-sm text-coral">{error}</p>}
        <input
          autoFocus
          className="rounded-lg border border-border-soft bg-surface px-3 py-2.5 text-cream placeholder:text-muted"
          placeholder="Il tuo nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" disabled={submitting || !name.trim()}>
          {submitting ? 'Ingresso...' : isCrew ? 'Entra nella comitiva' : 'Entra nella stanza'}
        </Button>
      </form>
    </div>
  )
}

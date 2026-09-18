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
    setResolved(null)
    setError(null)
    let cancelled = false
    resolveInviteCode(inviteCode)
      .then((r) => !cancelled && setResolved(r))
      .catch((err) => { console.error('[verifica invito]', err); if (!cancelled) setError('Non riusciamo a verificare l’invito. Controlla la connessione e riprova.') })
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
      console.error('[ingresso]', err)
      setError('Non riusciamo a completare l’ingresso. Controlla l’invito e riprova.')
    } finally {
      setSubmitting(false)
    }
  }

  if (resolved === null && error) {
    return <div className="mx-auto flex min-h-svh max-w-lg flex-col justify-center gap-4 px-6 text-center"><p role="alert">{error}</p><Button onClick={() => window.location.reload()}>Riprova</Button></div>
  }

  if (resolved === null) {
    return <div className="flex min-h-svh items-center justify-center bg-canvas text-fg-muted">Verifica del codice...</div>
  }

  if (resolved.type === 'none') {
    return (
      <div className="mx-auto flex min-h-svh max-w-lg flex-col bg-canvas px-6 py-10 text-center">
        <p className="text-fg">Nessuna stanza o comitiva trovata con il codice "{inviteCode}".</p>
        <button onClick={() => navigate('/')} className="mt-4 text-sm text-fg-muted underline">
          Torna alla home
        </button>
      </div>
    )
  }

  const isCrew = resolved.type === 'crew'

  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col bg-canvas">
      <ScreenHeader
        eyebrow={`Codice ${inviteCode}`}
        title={isCrew ? 'Entra nella comitiva' : 'Entra nella stanza'}
      />
      <form onSubmit={handleJoin} className="flex flex-col gap-3 px-4 sm:px-6">
        {error && <p className="rounded-xl bg-danger/10 px-4 py-2 text-sm text-danger">{error}</p>}
        <input
          autoFocus
          required
          maxLength={40}
          aria-label="Il tuo nome"
          className="rounded-lg border border-line bg-surface px-3 py-2.5 text-fg placeholder:text-fg-muted"
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

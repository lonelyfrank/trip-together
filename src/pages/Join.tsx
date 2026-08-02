import { type FormEvent, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/ui/Button'
import ScreenHeader from '../components/ui/ScreenHeader'
import { getMyName } from '../lib/localRooms'
import { joinRoomByInviteCode } from '../lib/membership'

export default function Join() {
  const { inviteCode } = useParams<{ inviteCode: string }>()
  const navigate = useNavigate()
  const [name, setName] = useState(getMyName())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  async function handleJoin(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !inviteCode) return
    setSubmitting(true)
    setError(null)
    try {
      const result = await joinRoomByInviteCode(inviteCode, name)
      if ('notFound' in result) {
        setNotFound(true)
        return
      }
      navigate(`/room/${result.roomId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto')
    } finally {
      setSubmitting(false)
    }
  }

  if (notFound) {
    return (
      <div className="mx-auto flex min-h-svh max-w-lg flex-col bg-ink px-6 py-10 text-center">
        <p className="text-cream">Nessuna stanza trovata con il codice "{inviteCode}".</p>
        <button onClick={() => navigate('/')} className="mt-4 text-sm text-muted underline">
          Torna alla home
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col bg-ink">
      <ScreenHeader eyebrow={`Codice ${inviteCode}`} title="Entra nella stanza" />
      <form onSubmit={handleJoin} className="flex flex-col gap-3 px-4 sm:px-6">
        {error && <p className="rounded-xl bg-coral/10 px-4 py-2 text-sm text-coral">{error}</p>}
        <input
          autoFocus
          className="rounded-lg border border-border-soft bg-surface px-3 py-2.5 text-cream placeholder:text-muted"
          placeholder="Il tuo nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Ingresso...' : 'Entra nella stanza'}
        </Button>
      </form>
    </div>
  )
}

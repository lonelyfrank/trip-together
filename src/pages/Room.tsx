import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ScreenHeader from '../components/ui/ScreenHeader'
import { getSavedRoomEntry } from '../lib/localRooms'
import { supabase } from '../lib/supabase'
import type { Room } from '../types'

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!roomId) return
    let cancelled = false

    async function load() {
      const { data } = await supabase.from('rooms').select('*').eq('id', roomId).maybeSingle()
      if (cancelled) return

      if (!data) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const entry = getSavedRoomEntry(roomId!)
      if (!entry) {
        navigate(`/join/${data.invite_code}`, { replace: true })
        return
      }

      setRoom(data)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [roomId, navigate])

  if (loading) {
    return <div className="flex min-h-svh items-center justify-center bg-ink text-muted">Caricamento...</div>
  }

  if (notFound || !room) {
    return (
      <div className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-4 bg-ink px-6 text-center">
        <p className="text-cream">Stanza non trovata.</p>
        <button onClick={() => navigate('/')} className="text-sm text-muted underline">
          Torna alla home
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col bg-ink">
      <ScreenHeader eyebrow={`Stanza attiva · #${room.invite_code}`} title={room.title} />
      <div className="px-4 text-sm text-muted sm:px-6">
        Le tab (Stanza, Auto, Bacheca, Spese, Radar) arrivano nei prossimi step — questa è solo la
        guardia di ingresso: se non sei ancora membro, sei rimandato a <code>/join/{room.invite_code}</code>.
      </div>
    </div>
  )
}

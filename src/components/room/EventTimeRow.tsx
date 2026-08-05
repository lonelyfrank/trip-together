import { Calendar, Plus } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import Button from '../ui/Button'
import { mutate } from '../../lib/db'
import { updateRoomEventTime } from '../../lib/mutations'
import type { Room } from '../../types'

interface EventTimeRowProps {
  room: Room
}

/**
 * Data e ora dell'evento: salvataggio indipendente dalla posizione, così un
 * problema qui (es. colonna event_time assente) non blocca il salvataggio
 * della destinazione. Campo del tutto opzionale.
 */
export default function EventTimeRow({ room }: EventTimeRowProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(room.event_time?.slice(0, 16) ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function persist(eventTimeIso: string | null) {
    setSaving(true)
    setError(null)
    try {
      const { error: err } = await mutate(
        'rooms.updateEventTime',
        updateRoomEventTime(room.id, eventTimeIso),
      )
      if (err) {
        setError(
          /event_time/.test(err.message)
            ? 'Manca la colonna event_time: esegui la migration 006_readiness.sql su Supabase.'
            : err.message,
        )
        return
      }
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    await persist(value ? new Date(value).toISOString() : null)
  }

  function startEditing() {
    setValue(room.event_time?.slice(0, 16) ?? '')
    setError(null)
    setEditing(true)
  }

  if (editing) {
    return (
      <form onSubmit={save} className="mt-2 flex flex-col gap-2">
        <label className="flex items-center gap-2 rounded-lg border border-border-soft bg-ink px-3 py-2">
          <Calendar size={13} className="shrink-0 text-muted" />
          <input
            type="datetime-local"
            autoFocus
            className="w-full bg-transparent text-[13px] text-cream outline-none"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        {error && (
          <p className="rounded-lg bg-coral/10 px-3 py-2 font-mono text-[10px] leading-relaxed text-coral">{error}</p>
        )}
        <div className="flex items-center gap-2">
          <Button type="submit" variant="teal" size="sm" disabled={saving}>
            {saving ? 'Salvataggio...' : 'Salva data'}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
            Annulla
          </Button>
          {room.event_time && (
            <button
              type="button"
              onClick={() => persist(null)}
              className="ml-auto font-mono text-[10px] text-muted underline"
            >
              rimuovi
            </button>
          )}
        </div>
      </form>
    )
  }

  if (room.event_time) {
    return (
      <button
        onClick={startEditing}
        className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-muted active:opacity-60"
      >
        <Calendar size={11} />
        {new Date(room.event_time).toLocaleString('it-IT', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })}
        <span className="underline">modifica</span>
      </button>
    )
  }

  return (
    <button
      onClick={startEditing}
      className="mt-1.5 flex items-center gap-1 font-mono text-[11px] text-muted active:opacity-60"
    >
      <Plus size={11} /> Aggiungi data e ora
    </button>
  )
}

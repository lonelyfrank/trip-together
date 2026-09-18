import { Calendar, Plus } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import Button from '../ui/Button'
import { mutate } from '../../lib/db'
import { fromDatetimeLocal, toDatetimeLocal } from '../../lib/format'
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
  const [value, setValue] = useState(toDatetimeLocal(room.event_time))
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
        console.error('[salvataggio data evento]', err)
        setError('Non riusciamo a salvare la data. Riprova tra un momento.')
        return
      }
      setEditing(false)
    } catch (err) {
      console.error('[salvataggio data evento]', err)
      setError('Non riusciamo a salvare la data. Controlla la connessione e riprova.')
    } finally {
      setSaving(false)
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    await persist(fromDatetimeLocal(value))
  }

  function startEditing() {
    setValue(toDatetimeLocal(room.event_time))
    setError(null)
    setEditing(true)
  }

  if (editing) {
    return (
      <form onSubmit={save} className="mt-2 flex flex-col gap-2">
        <label className="flex items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2">
          <Calendar size={13} className="shrink-0 text-fg-muted" />
          <input
            type="datetime-local"
            autoFocus
            className="w-full bg-transparent text-[13px] text-fg outline-none"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        {error && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 font-mono text-[10px] leading-relaxed text-danger">{error}</p>
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
              className="ml-auto font-mono text-[10px] text-fg-muted underline"
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
        className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-fg-muted active:opacity-60"
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
      className="mt-1.5 flex items-center gap-1 font-mono text-[11px] text-fg-muted active:opacity-60"
    >
      <Plus size={11} /> Aggiungi data e ora
    </button>
  )
}

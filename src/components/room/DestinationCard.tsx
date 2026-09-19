import { Check, Crosshair, MapPin } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import Button from '../ui/Button'
import Card from '../ui/Card'
import EventTimeRow from './EventTimeRow'
import WeatherStrip from './WeatherStrip'
import { mutate } from '../../lib/db'
import { parseMapInput } from '../../lib/mapLinks'
import { updateRoomDestination } from '../../lib/mutations'
import type { Room } from '../../types'

interface DestinationCardProps {
  room: Room
}

type LinkStatus =
  | { kind: 'idle' }
  | { kind: 'ok'; lat: number; lng: number }
  | { kind: 'shortlink' }
  | { kind: 'error' }

export default function DestinationCard({ room }: DestinationCardProps) {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(room.destination_label ?? '')
  const [lat, setLat] = useState<number | null>(room.destination_lat)
  const [lng, setLng] = useState<number | null>(room.destination_lng)
  const [linkInput, setLinkInput] = useState('')
  const [linkStatus, setLinkStatus] = useState<LinkStatus>({ kind: 'idle' })
  const [locating, setLocating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const hasCoords = room.destination_lat !== null && room.destination_lng !== null

  function applyLink(value: string) {
    setLinkInput(value)
    if (!value.trim()) {
      setLinkStatus({ kind: 'idle' })
      return
    }
    const result = parseMapInput(value)
    if (result.ok) {
      setLat(result.value.lat)
      setLng(result.value.lng)
      if (result.value.label && !label.trim()) setLabel(result.value.label)
      setLinkStatus({ kind: 'ok', lat: result.value.lat, lng: result.value.lng })
    } else {
      setLinkStatus({ kind: result.reason === 'shortlink' ? 'shortlink' : 'error' })
    }
  }

  function useMyLocation() {
    if (!('geolocation' in navigator)) {
      setLinkStatus({ kind: 'error' })
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude)
        setLng(pos.coords.longitude)
        setLinkStatus({ kind: 'ok', lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      () => {
        setLinkStatus({ kind: 'error' })
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    )
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      // Solo la posizione: la data/ora ha un salvataggio separato (EventTimeRow),
      // così non blocca mai il salvataggio della destinazione.
      const { error } = await mutate(
        'rooms.updateDestination',
        updateRoomDestination(room.id, {
          label: label.trim() || null,
          lat,
          lng,
        }),
      )

      if (error) {
        setSaveError(error.message)
        return
      }

      setEditing(false)
      setLinkInput('')
      setLinkStatus({ kind: 'idle' })
    } finally {
      setSaving(false)
    }
  }

  function startEditing() {
    setLabel(room.destination_label ?? '')
    setLat(room.destination_lat)
    setLng(room.destination_lng)
    setLinkInput('')
    setLinkStatus({ kind: 'idle' })
    setSaveError(null)
    setEditing(true)
  }

  return (
    <Card tone="highlight">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-warn">
          <MapPin size={13} strokeWidth={2.5} />
          <span className="text-[11px] font-bold">Destinazione</span>
        </div>
        {!editing && (
          <button onClick={startEditing} className="text-[10.5px] text-fg-muted underline">
            modifica
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={save} className="flex flex-col gap-2.5">
          <input
            autoFocus
            className="rounded-lg border border-line bg-canvas px-3 py-2 text-fg placeholder:text-fg-muted"
            placeholder="Nome del posto (es. Spiaggia del Faro)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <input
              className="rounded-lg border border-line bg-canvas px-3 py-2 text-[13px] text-fg placeholder:text-fg-muted"
              placeholder="Incolla un link di Google/Apple Maps o coordinate"
              value={linkInput}
              onChange={(e) => applyLink(e.target.value)}
              inputMode="url"
            />
            {linkStatus.kind === 'ok' && (
              <p className="flex items-center gap-1 text-[10.5px] text-brand-text">
                <Check size={11} /> Posizione trovata: {linkStatus.lat.toFixed(5)}, {linkStatus.lng.toFixed(5)}
              </p>
            )}
            {linkStatus.kind === 'shortlink' && (
              <p className="text-[10.5px] text-warn">
                È un link accorciato: aprilo, poi incolla il link completo (o le coordinate).
              </p>
            )}
            {linkStatus.kind === 'error' && (
              <p className="text-[10.5px] text-danger-text">Link non riconosciuto. Prova con le coordinate "lat, lng".</p>
            )}
          </div>

          <Button variant="outline" className="w-full" onClick={useMyLocation} disabled={locating}>
            <Crosshair size={13} /> {locating ? 'Rilevamento...' : 'Usa la mia posizione attuale'}
          </Button>

          {lat !== null && lng !== null && linkStatus.kind === 'idle' && (
            <p className="text-[10.5px] text-fg-muted">
              Coordinate attuali: {lat.toFixed(5)}, {lng.toFixed(5)}
            </p>
          )}

          {saveError && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-[10.5px] leading-relaxed text-danger-text">
              {saveError}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" variant="teal" size="sm" disabled={saving}>
              {saving ? 'Salvataggio...' : 'Salva'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
              Annulla
            </Button>
          </div>
        </form>
      ) : room.destination_label || hasCoords ? (
        <>
          <p className="font-serif text-[19px] leading-snug text-fg">
            {room.destination_label || 'Destinazione senza nome'}
          </p>
          <EventTimeRow room={room} />
          {hasCoords && (
            <WeatherStrip lat={room.destination_lat!} lng={room.destination_lng!} eventTime={room.event_time} />
          )}
        </>
      ) : (
        <>
          <p className="text-[13px] text-fg-muted">Nessuna destinazione impostata ancora.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={startEditing}>
            <MapPin size={13} /> Imposta destinazione
          </Button>
        </>
      )}

    </Card>
  )
}

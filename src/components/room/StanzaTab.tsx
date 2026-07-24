import { Check, MapPin, Navigation, Plus } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { supabase } from '../../lib/supabase'
import type {
  Car,
  CarExpense,
  CarPassenger,
  GeneralExpense,
  GeneralExpenseParticipant,
  Member,
  Room,
} from '../../types'
import MapSheet from '../MapSheet'
import CloseRoomSection from './CloseRoomSection'

interface StanzaTabProps {
  room: Room
  currentMember: Member
  members: Member[]
  cars: Car[]
  carPassengers: CarPassenger[]
  carExpenses: CarExpense[]
  generalExpenses: GeneralExpense[]
  generalExpenseParticipants: GeneralExpenseParticipant[]
  onGoToSpese: () => void
  onClosed: () => void
}

function roleLabel(memberId: string, cars: Car[], carPassengers: CarPassenger[]) {
  if (cars.some((c) => c.driver_member_id === memberId)) return 'guida'
  if (carPassengers.some((cp) => cp.member_id === memberId)) return 'passeggero'
  return 'senza auto'
}

export default function StanzaTab({
  room,
  currentMember,
  members,
  cars,
  carPassengers,
  carExpenses,
  generalExpenses,
  generalExpenseParticipants,
  onGoToSpese,
  onClosed,
}: StanzaTabProps) {
  const [mapOpen, setMapOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(room.destination_label ?? '')
  const [lat, setLat] = useState(room.destination_lat?.toString() ?? '')
  const [lng, setLng] = useState(room.destination_lng?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const hasCoords = room.destination_lat !== null && room.destination_lng !== null

  async function saveDestination(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await supabase
        .from('rooms')
        .update({
          destination_label: label.trim() || null,
          destination_lat: lat.trim() ? Number(lat) : null,
          destination_lng: lng.trim() ? Number(lng) : null,
        })
        .eq('id', room.id)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function copyInviteLink() {
    navigator.clipboard.writeText(`${window.location.origin}/join/${room.invite_code}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-3 px-4 pb-28 sm:px-6">
      <Card tone="highlight">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-amber">
            <MapPin size={13} strokeWidth={2.5} />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em]">Destinazione</span>
          </div>
          {!editing && (
            <button onClick={() => setEditing(true)} className="font-mono text-[10px] text-muted underline">
              modifica
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={saveDestination} className="flex flex-col gap-2">
            <input
              autoFocus
              className="rounded-lg border border-border-soft bg-ink px-3 py-2 text-cream placeholder:text-muted"
              placeholder="Nome del posto (es. Spiaggia del Faro)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <div className="flex gap-2">
              <input
                className="w-1/2 rounded-lg border border-border-soft bg-ink px-3 py-2 text-cream placeholder:text-muted"
                placeholder="Latitudine"
                inputMode="decimal"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
              />
              <input
                className="w-1/2 rounded-lg border border-border-soft bg-ink px-3 py-2 text-cream placeholder:text-muted"
                placeholder="Longitudine"
                inputMode="decimal"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="teal" size="sm" disabled={saving}>
                Salva
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
                Annulla
              </Button>
            </div>
          </form>
        ) : room.destination_label || hasCoords ? (
          <>
            <p className="font-serif text-[19px] leading-snug text-cream">
              {room.destination_label || 'Destinazione senza nome'}
            </p>
            {hasCoords && (
              <Button className="mt-3 w-full" onClick={() => setMapOpen(true)}>
                <Navigation size={14} /> Avvia percorso
              </Button>
            )}
          </>
        ) : (
          <p className="text-[13px] text-muted">Nessuna destinazione impostata ancora.</p>
        )}
      </Card>

      <div>
        <p className="mb-2.5 mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Partecipanti</p>
        <div className="space-y-1.5">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl bg-surface/50 px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber text-[11px] font-semibold text-ink">
                  {m.display_name[0]?.toUpperCase()}
                </div>
                <span className="text-[13.5px] text-cream">{m.display_name}</span>
              </div>
              <span className="font-mono text-[10px] text-muted">{roleLabel(m.id, cars, carPassengers)}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={copyInviteLink}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border-soft py-3 text-[13px] font-medium text-cream transition-transform active:scale-[0.98]"
      >
        {copied ? <Check size={15} /> : <Plus size={15} />}
        {copied ? 'Link copiato!' : 'Invita amici'}
      </button>

      {hasCoords && (
        <MapSheet open={mapOpen} onClose={() => setMapOpen(false)} lat={room.destination_lat!} lng={room.destination_lng!} />
      )}

      <CloseRoomSection
        room={room}
        currentMember={currentMember}
        cars={cars}
        carPassengers={carPassengers}
        carExpenses={carExpenses}
        generalExpenses={generalExpenses}
        generalExpenseParticipants={generalExpenseParticipants}
        onGoToSpese={onGoToSpese}
        onClosed={onClosed}
      />
    </div>
  )
}

import { AlertTriangle, Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { mutate } from '../../lib/db'
import { readinessWindow } from '../../lib/readiness'
import { supabase } from '../../lib/supabase'
import type { Car, CarPassenger, Member, Room } from '../../types'

interface ReadinessBannerProps {
  room: Room
  currentMember: Member
  members: Member[]
  cars: Car[]
  carPassengers: CarPassenger[]
  onGoToAuto: () => void
}

export default function ReadinessBanner({ room, currentMember, members, cars, carPassengers, onGoToAuto }: ReadinessBannerProps) {
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const win = readinessWindow(room.event_time)
  if (win === 'none') return null

  const assignedIds = new Set([...cars.map((c) => c.driver_member_id), ...carPassengers.map((cp) => cp.member_id)])
  const confirmedCount = members.filter((m) => m.confirmed).length
  const withoutCarCount = members.filter((m) => !assignedIds.has(m.id)).length
  const amIWithoutCar = !assignedIds.has(currentMember.id)

  async function confirmPresence() {
    await mutate(
      'members.confirmPresence',
      supabase
        .from('members')
        .update({ confirmed: true, confirmed_at: new Date().toISOString() })
        .eq('id', currentMember.id),
    )
  }

  return (
    <Card tone={win === 't2' ? 'surface' : 'highlight'} className={win === 't2' ? 'border-coral/25 bg-coral/10' : ''}>
      <div className="mb-2 flex items-center gap-1.5">
        <AlertTriangle size={13} className={win === 't2' ? 'text-coral' : 'text-amber'} />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cream">
          {win === 't2' ? 'Si parte tra meno di 2 ore' : 'Si parte tra meno di 24 ore'}
        </span>
      </div>

      <p className="mb-1 text-[12.5px] text-muted">
        {confirmedCount}/{members.length} confermati
        {withoutCarCount > 0 && ` · ${withoutCarCount} senza auto assegnata`}
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        {!currentMember.confirmed && (
          <Button size="sm" variant="teal" onClick={confirmPresence}>
            <Check size={12} /> Conferma la tua presenza
          </Button>
        )}
        {amIWithoutCar && (
          <Button size="sm" variant="outline" onClick={onGoToAuto}>
            Cerca un passaggio
          </Button>
        )}
      </div>
    </Card>
  )
}

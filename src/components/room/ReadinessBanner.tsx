import { AlertTriangle, Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { useRoomOptimistic } from '../../hooks/useRoomOptimistic'
import { confirmMemberPresence } from '../../lib/mutations'
import { readinessWindow } from '../../lib/readiness'
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
  const optimistic = useRoomOptimistic(room.id)
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
    await optimistic('members.confirmPresence', (prev) => ({ ...prev,
      members: prev.members.map((m) => m.id === currentMember.id ? { ...m, confirmed: true, confirmed_at: new Date().toISOString() } : m),
    }), () => confirmMemberPresence(currentMember.id), 'Conferma non salvata. Riprova.')
  }

  return (
    <Card tone={win === 't2' ? 'surface' : 'highlight'} className={win === 't2' ? 'border-danger/25 bg-danger/10' : ''}>
      <div className="mb-2 flex items-center gap-1.5">
        <AlertTriangle size={13} className={win === 't2' ? 'text-danger' : 'text-warn'} />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg">
          {win === 't2' ? 'Si parte tra meno di 2 ore' : 'Si parte tra meno di 24 ore'}
        </span>
      </div>

      <p className="mb-1 text-[13px] text-fg-muted">
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

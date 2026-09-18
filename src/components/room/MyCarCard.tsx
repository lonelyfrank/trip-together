import { CarFront } from 'lucide-react'
import Avatar, { AvatarGroup } from '../ui/Avatar'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Chip from '../ui/Chip'
import EmptyState from '../ui/EmptyState'
import type { Car, CarPassenger, Member } from '../../types'

// Card "Auto e guida" dei mockup: la targa e il modello non esistono nello
// schema, quindi l'identità dell'auto è il suo conducente — l'unico dato
// davvero presente.
interface MyCarCardProps {
  currentMember: Member
  members: Member[]
  cars: Car[]
  carPassengers: CarPassenger[]
  onOpenTrip: () => void
}

export default function MyCarCard({
  currentMember,
  members,
  cars,
  carPassengers,
  onOpenTrip,
}: MyCarCardProps) {
  const myCar = cars.find(
    (car) =>
      car.driver_member_id === currentMember.id ||
      carPassengers.some((p) => p.car_id === car.id && p.member_id === currentMember.id),
  )

  if (!myCar) {
    return (
      <EmptyState
        icon={CarFront}
        title="Nessun posto assegnato"
        hint="Prendi un posto in un’auto o metti a disposizione la tua."
        action={
          <Button variant="surface" size="sm" onClick={onOpenTrip}>
            Organizza il passaggio
          </Button>
        }
      />
    )
  }

  const driver = members.find((m) => m.id === myCar.driver_member_id)
  const passengers = carPassengers
    .filter((p) => p.car_id === myCar.id)
    .map((p) => members.find((m) => m.id === p.member_id))
    .filter((m): m is Member => !!m)
  const occupied = passengers.length + 1
  const free = Math.max(myCar.seats_total - occupied, 0)
  const iDrive = myCar.driver_member_id === currentMember.id

  return (
    <Card onClick={onOpenTrip}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={driver?.display_name ?? '?'} seed={myCar.driver_member_id} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-fg">
              {iDrive ? 'Guidi tu' : `Auto di ${driver?.display_name ?? 'un amico'}`}
            </p>
            <p className="text-[12px] text-fg-muted">
              {occupied}/{myCar.seats_total} posti
              {free > 0 ? ` · ${free} liber${free === 1 ? 'o' : 'i'}` : ' · al completo'}
            </p>
          </div>
        </div>
        <Chip tone={free > 0 ? 'warn' : 'ok'}>{free > 0 ? `${free} liberi` : 'completa'}</Chip>
      </div>
      {passengers.length > 0 && (
        <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
          <AvatarGroup people={passengers} max={5} />
          <span className="text-[12px] text-fg-muted">
            {passengers.length === 1 ? '1 passeggero' : `${passengers.length} passeggeri`}
          </span>
        </div>
      )}
    </Card>
  )
}

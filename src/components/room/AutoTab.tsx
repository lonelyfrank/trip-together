import { Check, Circle, Fuel, Package, Plus } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Chip from '../ui/Chip'
import { useRoomOptimistic } from '../../hooks/useRoomOptimistic'
import { mutate, mutateNotify } from '../../lib/db'
import {
  deleteCar,
  deleteCarPassengerByMember,
  insertCar,
  insertCarCargoItem,
  insertCarPassenger,
  toggleCarCargoPacked,
} from '../../lib/mutations'
import type {
  Car,
  CarCargoItem,
  CarExpense,
  CarPassenger,
  DelayReport,
  Member,
  RideRequest,
  StopProposal,
  StopProposalVote,
} from '../../types'
import DelayReportBadge from './DelayReportBadge'
import RideRequestsSection from './RideRequestsSection'
import StopProposalsSection from './StopProposalsSection'
import TravelStatusChip from './TravelStatusChip'

interface AutoTabProps {
  roomId: string
  currentMember: Member
  members: Member[]
  cars: Car[]
  carPassengers: CarPassenger[]
  carExpenses: CarExpense[]
  carCargo: CarCargoItem[]
  delayReports: DelayReport[]
  stopProposals: StopProposal[]
  stopProposalVotes: StopProposalVote[]
  rideRequests: RideRequest[]
}

export default function AutoTab({
  roomId,
  currentMember,
  members,
  cars,
  carPassengers,
  carExpenses,
  carCargo,
  delayReports,
  stopProposals,
  stopProposalVotes,
  rideRequests,
}: AutoTabProps) {
  const [addingCar, setAddingCar] = useState(false)
  const [seats, setSeats] = useState('4')
  const [savingCar, setSavingCar] = useState(false)
  const optimistic = useRoomOptimistic(roomId)

  const memberById = (id: string) => members.find((m) => m.id === id)
  const currentCarId = carPassengers.find((cp) => cp.member_id === currentMember.id)?.car_id
  const iAmDriver = cars.some((c) => c.driver_member_id === currentMember.id)

  const assignedIds = new Set([...cars.map((c) => c.driver_member_id), ...carPassengers.map((cp) => cp.member_id)])
  const unassigned = members.filter((m) => !assignedIds.has(m.id))

  async function createCar(e: FormEvent) {
    e.preventDefault()
    const total = Number(seats)
    if (!total || total < 1) return
    setSavingCar(true)
    try {
      await mutateNotify(
        'cars.insert',
        insertCar(roomId, currentMember.id, total),
        'Auto non creata.',
      )
      setSeats('4')
      setAddingCar(false)
    } finally {
      setSavingCar(false)
    }
  }

  function removeCar(carId: string) {
    optimistic(
      'cars.delete',
      (prev) => ({
        ...prev,
        cars: prev.cars.filter((c) => c.id !== carId),
        carPassengers: prev.carPassengers.filter((cp) => cp.car_id !== carId),
      }),
      () => deleteCar(carId),
      'Auto non eliminata.',
    )
  }

  async function takeSeat(carId: string) {
    if (currentCarId)
      await mutate('car_passengers.leave', deleteCarPassengerByMember(currentMember.id))
    await mutateNotify('car_passengers.take', insertCarPassenger(carId, currentMember.id), 'Posto non assegnato.')
  }

  function leaveSeat() {
    optimistic(
      'car_passengers.leave',
      (prev) => ({ ...prev, carPassengers: prev.carPassengers.filter((cp) => cp.member_id !== currentMember.id) }),
      () => deleteCarPassengerByMember(currentMember.id),
      'Non sei riuscito a lasciare il posto.',
    )
  }

  async function assignMember(carId: string, memberId: string) {
    await mutate('car_passengers.reassignClear', deleteCarPassengerByMember(memberId))
    await mutateNotify('car_passengers.assign', insertCarPassenger(carId, memberId), 'Assegnazione non riuscita.')
  }

  const roomWideProposals = stopProposals.filter((p) => p.car_id === null)

  return (
    <div className="space-y-3 px-4 pb-28 sm:px-6">
      <StopProposalsSection
        roomId={roomId}
        carId={null}
        currentMember={currentMember}
        eligibleMembers={members}
        proposals={roomWideProposals}
        votes={stopProposalVotes}
        canPropose={cars.some((c) => c.travel_status === 'in_viaggio')}
        title="Proposte per tutta la comitiva"
      />

      {!iAmDriver && !currentCarId && (
        <>
          {addingCar ? (
            <Card>
              <form onSubmit={createCar} className="flex flex-col gap-2">
                <p className="mb-1 text-[13px] text-cream">Quanti posti ha la tua auto (incluso tu)?</p>
                <input
                  type="number"
                  min={1}
                  autoFocus
                  className="rounded-lg border border-border-soft bg-ink px-3 py-2 text-cream placeholder:text-muted"
                  value={seats}
                  onChange={(e) => setSeats(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" variant="teal" disabled={savingCar}>
                    Crea auto
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setAddingCar(false)}>
                    Annulla
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => setAddingCar(true)}>
              <Plus size={15} /> Aggiungi la tua auto
            </Button>
          )}
        </>
      )}

      {cars.map((car) => {
        const passengers = carPassengers.filter((cp) => cp.car_id === car.id)
        const freeSeats = car.seats_total - 1 - passengers.length
        const driver = memberById(car.driver_member_id)
        const expenses = carExpenses.filter((e) => e.car_id === car.id)
        const cargo = carCargo.filter((c) => c.car_id === car.id)
        const iAmThisDriver = car.driver_member_id === currentMember.id
        const iAmInThisCar = currentCarId === car.id

        return (
          <Card key={car.id}>
            <div className="mb-2.5 flex items-start justify-between">
              <div>
                <p className="font-serif text-[16px] leading-none text-cream">Auto di {driver?.display_name ?? '—'}</p>
                <p className="mt-0.5 font-mono text-[10px] text-muted">conducente</p>
              </div>
              <TravelStatusChip car={car} currentMemberId={currentMember.id} canEdit={iAmThisDriver || iAmInThisCar} />
            </div>

            <div className="mb-2.5 flex items-center justify-between">
              <Chip tone="teal">{passengers.length + 1}/{car.seats_total} posti</Chip>
              {iAmThisDriver && (
                <button onClick={() => removeCar(car.id)} className="text-[10px] text-coral underline">
                  elimina
                </button>
              )}
            </div>

            <div className="mb-3 flex flex-wrap gap-1.5">
              {[car.driver_member_id, ...passengers.map((p) => p.member_id)].map((id) => (
                <span key={id} className="rounded-full bg-ink px-2.5 py-1 text-[11px] text-cream">
                  {memberById(id)?.display_name ?? '?'}
                </span>
              ))}
              {Array.from({ length: Math.max(freeSeats, 0) }).map((_, i) => (
                <span key={i} className="rounded-full border border-dashed border-border-dashed px-2.5 py-1 text-[11px] text-muted">
                  posto libero
                </span>
              ))}
            </div>

            <div className="mb-3">
              <DelayReportBadge
                carId={car.id}
                currentMemberId={currentMember.id}
                canReport={(iAmThisDriver || iAmInThisCar) && car.travel_status === 'in_viaggio'}
                activeDelay={delayReports.find((d) => d.car_id === car.id && !d.resolved_at)}
              />
            </div>

            <div className="mb-3">
              <StopProposalsSection
                roomId={roomId}
                carId={car.id}
                currentMember={currentMember}
                eligibleMembers={[car.driver_member_id, ...passengers.map((p) => p.member_id)]
                  .map((id) => memberById(id))
                  .filter((m): m is Member => !!m)}
                proposals={stopProposals.filter((p) => p.car_id === car.id)}
                votes={stopProposalVotes}
                canPropose={(iAmThisDriver || iAmInThisCar) && car.travel_status === 'in_viaggio'}
                title="Proposte per quest'auto"
              />
            </div>

            {!iAmThisDriver && !iAmInThisCar && freeSeats > 0 && (
              <Button size="sm" variant="teal" onClick={() => takeSeat(car.id)}>
                Prendi un posto
              </Button>
            )}
            {!iAmThisDriver && iAmInThisCar && (
              <Button size="sm" variant="outline" onClick={leaveSeat}>
                Lascia il posto
              </Button>
            )}

            {expenses.length > 0 && (
              <div className="mb-2.5 mt-3 space-y-1.5 border-t border-border-soft pt-2.5">
                {expenses.map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-[12px]">
                    <span className="flex items-center gap-1.5 text-muted">
                      <Fuel size={11} /> {e.label}
                    </span>
                    <span className="font-mono text-cream">€{e.amount}</span>
                  </div>
                ))}
              </div>
            )}

            <CarCargoSection roomId={roomId} carId={car.id} cargo={cargo} />
          </Card>
        )
      })}

      {cars.length === 0 && !addingCar && (
        <p className="text-center text-sm text-muted">Nessuna auto dichiarata ancora.</p>
      )}

      <RideRequestsSection
        roomId={roomId}
        currentMember={currentMember}
        members={members}
        cars={cars}
        carPassengers={carPassengers}
        rideRequests={rideRequests}
        amUnassigned={!assignedIds.has(currentMember.id)}
      />

      {unassigned.length > 0 && (
        <div className="space-y-2">
          <p className="mb-1 mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Senza auto</p>
          {unassigned
            .filter((m) => !rideRequests.some((r) => r.member_id === m.id && r.status === 'pending'))
            .map((m) => (
            <Card key={m.id} tone="dashed" className="flex items-center justify-between !p-3.5">
              <p className="text-[13.5px] text-cream">{m.display_name}</p>
              {cars.length > 0 && (
                <select
                  defaultValue=""
                  onChange={(e) => e.target.value && assignMember(e.target.value, m.id)}
                  className="rounded-lg border border-border-soft bg-ink px-2 py-1 text-[11px] text-cream"
                >
                  <option value="" disabled>
                    Assegna...
                  </option>
                  {cars
                    .filter((c) => c.seats_total - 1 - carPassengers.filter((cp) => cp.car_id === c.id).length > 0)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        Auto di {memberById(c.driver_member_id)?.display_name}
                      </option>
                    ))}
                </select>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function CarCargoSection({ roomId, carId, cargo }: { roomId: string; carId: string; cargo: CarCargoItem[] }) {
  const [adding, setAdding] = useState(false)
  const [item, setItem] = useState('')
  const optimistic = useRoomOptimistic(roomId)

  function toggle(cargoItem: CarCargoItem) {
    optimistic(
      'car_cargo.togglePacked',
      (prev) => ({
        ...prev,
        carCargo: prev.carCargo.map((c) => (c.id === cargoItem.id ? { ...c, packed: !c.packed } : c)),
      }),
      () => toggleCarCargoPacked(cargoItem.id, !cargoItem.packed),
      'Carico non aggiornato.',
    )
  }

  async function addItem(e: FormEvent) {
    e.preventDefault()
    if (!item.trim()) return
    await mutateNotify(
      'car_cargo.insert',
      insertCarCargoItem(carId, item),
      'Oggetto non aggiunto.',
    )
    setItem('')
    setAdding(false)
  }

  return (
    <div className="border-t border-border-soft pt-2.5">
      <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.15em] text-muted">
        <Package size={11} /> Carico di questa auto
      </p>
      <div className="space-y-1">
        {cargo.map((c) => (
          <button key={c.id} onClick={() => toggle(c)} className="flex w-full items-center gap-2 text-left text-[12px]">
            {c.packed ? (
              <Check size={13} className="shrink-0 text-teal" />
            ) : (
              <Circle size={13} className="shrink-0 text-border-dashed" />
            )}
            <span className={c.packed ? 'text-muted line-through' : 'text-cream'}>{c.item}</span>
          </button>
        ))}
      </div>
      {adding ? (
        <form onSubmit={addItem} className="mt-2 flex gap-1.5">
          <input
            autoFocus
            className="flex-1 rounded-lg border border-border-soft bg-ink px-2 py-1 text-[12px] text-cream placeholder:text-muted"
            placeholder="Es. Ombrelloni"
            value={item}
            onChange={(e) => setItem(e.target.value)}
          />
          <Button type="submit" size="sm" variant="teal">
            Ok
          </Button>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-2 flex items-center gap-1 font-mono text-[10.5px] text-muted active:opacity-60"
        >
          <Plus size={11} /> aggiungi oggetto
        </button>
      )}
    </div>
  )
}

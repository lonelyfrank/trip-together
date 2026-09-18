import { Hand } from 'lucide-react'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { useRoomOptimistic } from '../../hooks/useRoomOptimistic'
import { mutateNotify } from '../../lib/db'
import {
  cancelRideRequest,
  insertCarPassenger,
  insertRideRequest,
  matchRideRequest,
} from '../../lib/mutations'
import type { Car, CarPassenger, Member, RideRequest } from '../../types'

interface RideRequestsSectionProps {
  roomId: string
  currentMember: Member
  members: Member[]
  cars: Car[]
  carPassengers: CarPassenger[]
  rideRequests: RideRequest[]
  amUnassigned: boolean
}

export default function RideRequestsSection({
  roomId,
  currentMember,
  members,
  cars,
  carPassengers,
  rideRequests,
  amUnassigned,
}: RideRequestsSectionProps) {
  const optimistic = useRoomOptimistic(roomId)
  const memberById = (id: string) => members.find((m) => m.id === id)
  const pending = rideRequests.filter((r) => r.status === 'pending')
  const myRequest = pending.find((r) => r.member_id === currentMember.id)
  const othersWaiting = pending.filter((r) => r.member_id !== currentMember.id)

  const myCarWithFreeSeat = cars.find(
    (c) => c.driver_member_id === currentMember.id && c.seats_total - 1 - carPassengers.filter((cp) => cp.car_id === c.id).length > 0,
  )

  async function requestRide() {
    await mutateNotify('ride_requests.insert', insertRideRequest(roomId, currentMember.id), 'Richiesta non inviata.')
  }

  function cancelRequest() {
    if (!myRequest) return
    const id = myRequest.id
    optimistic(
      'ride_requests.cancel',
      (prev) => ({
        ...prev,
        rideRequests: prev.rideRequests.map((r) => (r.id === id ? { ...r, status: 'cancelled' } : r)),
      }),
      () => cancelRideRequest(id),
      'Annullamento non riuscito.',
    )
  }

  async function offerSeat(request: RideRequest) {
    if (!myCarWithFreeSeat) return
    const { error } = await mutateNotify(
      'car_passengers.offerSeat',
      insertCarPassenger(myCarWithFreeSeat.id, request.member_id),
      'Posto non offerto.',
    )
    if (error) return
    await mutateNotify('ride_requests.match', matchRideRequest(request.id, myCarWithFreeSeat.id), 'Match non registrato.')
  }

  if (!amUnassigned && othersWaiting.length === 0) return null

  return (
    <div className="space-y-2">
      {amUnassigned &&
        (myRequest ? (
          <div className="flex items-center justify-between rounded-xl border border-accent/25 bg-accent/10 px-3.5 py-2.5">
            <span className="text-[12px] text-fg">In attesa di un passaggio...</span>
            <button onClick={cancelRequest} className="font-mono text-[10px] text-fg-muted underline">
              annulla
            </button>
          </div>
        ) : (
          <Button variant="teal" className="w-full" onClick={requestRide}>
            <Hand size={14} /> Cerca un passaggio
          </Button>
        ))}

      {othersWaiting.length > 0 && (
        <>
          <p className="mb-1 mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-muted">Cercano un passaggio</p>
          <div className="space-y-1.5">
            {othersWaiting.map((r) => {
              const member = memberById(r.member_id)
              return (
                <Card key={r.id} tone="dashed" className="flex items-center justify-between !p-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-warn text-[11px] font-semibold text-on-accent">
                      {member?.display_name[0]?.toUpperCase() ?? '?'}
                    </div>
                    <span className="text-[13px] text-fg">{member?.display_name ?? '?'}</span>
                  </div>
                  {myCarWithFreeSeat && (
                    <Button size="sm" variant="teal" onClick={() => offerSeat(r)}>
                      Offri un posto
                    </Button>
                  )}
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

import { Hand } from 'lucide-react'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { supabase } from '../../lib/supabase'
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
  const memberById = (id: string) => members.find((m) => m.id === id)
  const pending = rideRequests.filter((r) => r.status === 'pending')
  const myRequest = pending.find((r) => r.member_id === currentMember.id)
  const othersWaiting = pending.filter((r) => r.member_id !== currentMember.id)

  const myCarWithFreeSeat = cars.find(
    (c) => c.driver_member_id === currentMember.id && c.seats_total - 1 - carPassengers.filter((cp) => cp.car_id === c.id).length > 0,
  )

  async function requestRide() {
    await supabase.from('ride_requests').insert({ room_id: roomId, member_id: currentMember.id })
  }

  async function cancelRequest() {
    if (!myRequest) return
    await supabase.from('ride_requests').update({ status: 'cancelled' }).eq('id', myRequest.id)
  }

  async function offerSeat(request: RideRequest) {
    if (!myCarWithFreeSeat) return
    await supabase.from('car_passengers').insert({ car_id: myCarWithFreeSeat.id, member_id: request.member_id })
    await supabase
      .from('ride_requests')
      .update({ status: 'matched', matched_car_id: myCarWithFreeSeat.id })
      .eq('id', request.id)
  }

  if (!amUnassigned && othersWaiting.length === 0) return null

  return (
    <div className="space-y-2">
      {amUnassigned &&
        (myRequest ? (
          <div className="flex items-center justify-between rounded-xl border border-teal/25 bg-teal/10 px-3.5 py-2.5">
            <span className="text-[12px] text-cream">In attesa di un passaggio...</span>
            <button onClick={cancelRequest} className="font-mono text-[10px] text-muted underline">
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
          <p className="mb-1 mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Cercano un passaggio</p>
          <div className="space-y-1.5">
            {othersWaiting.map((r) => {
              const member = memberById(r.member_id)
              return (
                <Card key={r.id} tone="dashed" className="flex items-center justify-between !p-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber text-[11px] font-semibold text-ink">
                      {member?.display_name[0]?.toUpperCase() ?? '?'}
                    </div>
                    <span className="text-[13px] text-cream">{member?.display_name ?? '?'}</span>
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

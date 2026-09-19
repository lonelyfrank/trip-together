import { useRoomOptimistic } from './useRoomOptimistic'
import { mutate } from '../lib/db'
import { resolveDelayReportsForCar, setCarTravelStatus } from '../lib/mutations'
import type { Car, TravelStatus } from '../types'

/** Cambia lo stato di viaggio di un'auto; l'arrivo chiude i ritardi aperti. */
export function useSetTravelStatus(roomId: string, currentMemberId: string) {
  const optimistic = useRoomOptimistic(roomId)
  return function setStatus(car: Car, status: TravelStatus) {
    const now = new Date().toISOString()
    optimistic(
      'cars.setTravelStatus',
      (prev) => ({
        ...prev,
        cars: prev.cars.map((c) =>
          c.id === car.id
            ? { ...c, travel_status: status, travel_status_updated_at: now, travel_status_updated_by: currentMemberId }
            : c,
        ),
      }),
      () => setCarTravelStatus(car.id, status, currentMemberId, now),
      'Stato viaggio non aggiornato.',
    )

    if (status === 'arrivata') {
      mutate('delay_reports.resolveOnArrival', resolveDelayReportsForCar(car.id, now))
    }
  }
}

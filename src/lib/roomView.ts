import type { Activity, Car, CarPassenger, Member, Room } from '../types'
import { dayKey } from './activities.ts'

// Letture derivate che più tab condividono: "la mia auto", chi c'è a bordo,
// il piano del giorno. Solo funzioni pure sui dati della stanza.

export function myCarOf(memberId: string, cars: Car[], carPassengers: CarPassenger[]): Car | undefined {
  return cars.find(
    (car) =>
      car.driver_member_id === memberId ||
      carPassengers.some((p) => p.car_id === car.id && p.member_id === memberId),
  )
}

/** Conducente per primo, poi i passeggeri nell'ordine in cui sono saliti. */
export function peopleInCar(car: Car, carPassengers: CarPassenger[], members: Member[]): Member[] {
  const ids = [car.driver_member_id, ...carPassengers.filter((p) => p.car_id === car.id).map((p) => p.member_id)]
  return ids.map((id) => members.find((m) => m.id === id)).filter((m): m is Member => !!m)
}

export interface DayPlanEntry {
  id: string
  at: string
  title: string
  detail: string | null
  kind: 'ritrovo' | Activity['category']
  past: boolean
}

/**
 * "Piano di oggi": il ritrovo e le tappe in programma nel giorno che conta —
 * oggi se l'evento è già cominciato, altrimenti il giorno dell'evento. Le
 * tappe annullate o senza orario restano fuori (le trova il programma).
 */
export function dayPlan(room: Room, activities: Activity[], now = Date.now()): DayPlanEntry[] {
  const eventStart = room.event_time ? Date.parse(room.event_time) : null
  const key = eventStart !== null && eventStart > now ? dayKey(room.event_time!) : dayKey(new Date(now).toISOString())
  const entries: DayPlanEntry[] = []
  if (room.event_time && dayKey(room.event_time) === key) {
    entries.push({
      id: 'ritrovo',
      at: room.event_time,
      title: room.destination_label ? `Ritrovo · ${room.destination_label}` : 'Ritrovo',
      detail: 'Ci vediamo qui!',
      kind: 'ritrovo',
      past: Date.parse(room.event_time) <= now,
    })
  }
  for (const activity of activities) {
    if (!activity.starts_at || activity.status === 'annullata' || dayKey(activity.starts_at) !== key) continue
    entries.push({
      id: activity.id,
      at: activity.starts_at,
      title: activity.title,
      detail: activity.place_label ?? activity.note,
      kind: activity.category,
      past: Date.parse(activity.starts_at) <= now,
    })
  }
  return entries.sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
}

/** Finestra di `size` voci attorno a "adesso": l'ultima passata e le prossime. */
export function planWindow(entries: DayPlanEntry[], size: number): DayPlanEntry[] {
  const firstUpcoming = entries.findIndex((entry) => !entry.past)
  const start = firstUpcoming === -1 ? Math.max(entries.length - size, 0) : Math.max(firstUpcoming - 1, 0)
  return entries.slice(start, start + size)
}

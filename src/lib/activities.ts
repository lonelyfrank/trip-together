import type { Activity, ActivityParticipant, Room } from '../types'

// Raggruppamento dell'itinerario per giorno. I giorni non stanno nel database:
// si ricavano dagli orari delle tappe più quello dell'evento, così un'uscita
// di un giorno resta di un giorno e non serve una data di inizio/fine su
// `rooms`.

export interface ActivityDay {
  /** YYYY-MM-DD in fuso locale, oppure null per le tappe senza orario. */
  key: string | null
  label: string
  shortLabel: string
  activities: Activity[]
}

/** Chiave-giorno in fuso locale: `toISOString` sposterebbe la mezzanotte. */
export function dayKey(iso: string): string {
  const date = new Date(iso)
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function labelFor(key: string): { label: string; shortLabel: string } {
  const date = new Date(`${key}T12:00:00`)
  return {
    label: date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }),
    shortLabel: date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }),
  }
}

export function groupByDay(room: Room, activities: Activity[]): ActivityDay[] {
  const keys = new Set<string>()
  if (room.event_time) keys.add(dayKey(room.event_time))
  for (const activity of activities) {
    if (activity.starts_at) keys.add(dayKey(activity.starts_at))
  }

  const sorted = [...keys].sort()
  const days: ActivityDay[] = sorted.map((key, index) => {
    const { label, shortLabel } = labelFor(key)
    return {
      key,
      // Con più giorni il numero aiuta a orientarsi; con uno solo è rumore.
      label: sorted.length > 1 ? `Giorno ${index + 1} · ${label}` : label,
      shortLabel,
      activities: activities.filter((a) => a.starts_at && dayKey(a.starts_at) === key),
    }
  })

  const unscheduled = activities.filter((a) => !a.starts_at)
  if (unscheduled.length > 0) {
    days.push({ key: null, label: 'Senza orario', shortLabel: 'Da programmare', activities: unscheduled })
  }
  return days
}

/** Il giorno da mostrare all'apertura: oggi se è nell'itinerario, altrimenti il primo. */
export function defaultDayKey(days: ActivityDay[], now = Date.now()): string | null {
  const today = dayKey(new Date(now).toISOString())
  const match = days.find((day) => day.key === today) ?? days.find((day) => day.key !== null) ?? days[0]
  return match?.key ?? null
}

export interface ActivityInterest {
  going: string[]
  /** true quando il gruppo è in maggioranza: la tappa si può confermare. */
  hasMajority: boolean
}

export function activityInterest(
  activity: Activity,
  participants: ActivityParticipant[],
  memberCount: number,
): ActivityInterest {
  const going = participants.filter((p) => p.activity_id === activity.id).map((p) => p.member_id)
  // Stessa soglia delle proposte di sosta: metà più uno degli aventi diritto.
  const majority = Math.floor(memberCount / 2) + 1
  return { going, hasMajority: memberCount > 0 && going.length >= majority }
}

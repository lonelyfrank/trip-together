export type ReadinessWindow = 'none' | 't24' | 't2'

const H = 60 * 60_000

/** Calcolato lato client: nessun cron/push necessario per l'MVP. */
export function readinessWindow(eventTime: string | null, now = Date.now()): ReadinessWindow {
  if (!eventTime) return 'none'
  const target = new Date(eventTime).getTime()
  const diff = target - now

  if (diff <= 0) return 'none' // evento già iniziato: il banner sparisce
  if (diff <= 2 * H) return 't2'
  if (diff <= 24 * H) return 't24'
  return 'none'
}

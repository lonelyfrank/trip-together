/** Distanza in metri tra due coordinate (formula haversine). */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Intervallo di aggiornamento adattivo del radar, per distanza dal punto di ritrovo (sezione 10). */
export function radarIntervalMs(distanceToTargetMeters: number | null): number {
  if (distanceToTargetMeters === null) return 60_000
  if (distanceToTargetMeters > 500) return 60_000
  if (distanceToTargetMeters >= 100) return 30_000
  return 17_500
}

/** Rotta iniziale (bearing) in gradi da `a` verso `b`, 0 = nord, in senso orario. */
export function bearingDegrees(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const toDeg = (rad: number) => (rad * 180) / Math.PI
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const dLng = toRad(b.lng - a.lng)

  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `~${Math.round(meters / 5) * 5}m`
  return `~${(meters / 1000).toFixed(1)}km`
}

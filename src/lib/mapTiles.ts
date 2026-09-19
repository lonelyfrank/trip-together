// Proiezione Web Mercator per le mappe statiche a tile OpenStreetMap.
// Nessuna libreria di mappe: bastano la posizione in pixel "mondo" di un
// punto a un dato zoom e lo zoom che fa stare un gruppo di punti in un box.

export const TILE_SIZE = 256

export interface LatLng {
  lat: number
  lng: number
}

/** Pixel del punto nel planisfero intero a zoom `z` (origine in alto a sinistra). */
export function worldPx({ lat, lng }: LatLng, z: number): { x: number; y: number } {
  const scale = TILE_SIZE * 2 ** z
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat))
  const sin = Math.sin((clamped * Math.PI) / 180)
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  }
}

/** Zoom più alto a cui tutti i punti stanno in un box di `width`×`height` px. */
export function fitZoom(points: LatLng[], width: number, height: number, maxZoom = 16, minZoom = 3): number {
  if (points.length < 2) return maxZoom
  for (let z = maxZoom; z > minZoom; z--) {
    const px = points.map((p) => worldPx(p, z))
    const w = Math.max(...px.map((p) => p.x)) - Math.min(...px.map((p) => p.x))
    const h = Math.max(...px.map((p) => p.y)) - Math.min(...px.map((p) => p.y))
    if (w <= width && h <= height) return z
  }
  return minZoom
}

/** Centro del rettangolo che contiene i punti (in gradi, abbastanza per i box piccoli). */
export function boundsCenter(points: LatLng[]): LatLng {
  const lats = points.map((p) => p.lat)
  const lngs = points.map((p) => p.lng)
  return {
    lat: (Math.max(...lats) + Math.min(...lats)) / 2,
    lng: (Math.max(...lngs) + Math.min(...lngs)) / 2,
  }
}

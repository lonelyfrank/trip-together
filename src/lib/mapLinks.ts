// Estrae coordinate (ed eventualmente un nome) da ciò che un utente incolla:
// link di Google Maps / Apple Maps / Waze, o coordinate grezze "lat,lng".
//
// I link accorciati (maps.app.goo.gl, goo.gl/maps, g.co/kgs) sono redirect
// che non si possono risolvere lato browser (CORS), quindi vengono segnalati
// con un esito dedicato così la UI può chiedere il link completo.

export interface ParsedDestination {
  lat: number
  lng: number
  label?: string
}

export type MapLinkResult =
  | { ok: true; value: ParsedDestination }
  | { ok: false; reason: 'shortlink' | 'unrecognized' }

const LAT_RANGE = 90
const LNG_RANGE = 180

function validCoords(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= LAT_RANGE &&
    Math.abs(lng) <= LNG_RANGE &&
    !(lat === 0 && lng === 0)
  )
}

function cleanLabel(raw: string): string | undefined {
  const label = decodeURIComponent(raw.replace(/\+/g, ' ')).trim()
  // Scarta etichette che sono in realtà solo coordinate.
  if (!label || /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(label)) return undefined
  return label
}

/** Coordinate grezze incollate direttamente: "43.41, 10.24". */
function parseRawCoords(input: string): ParsedDestination | null {
  const m = input.match(/^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/)
  if (!m) return null
  const lat = Number(m[1])
  const lng = Number(m[2])
  return validCoords(lat, lng) ? { lat, lng } : null
}

export function parseMapInput(input: string): MapLinkResult {
  const trimmed = input.trim()
  if (!trimmed) return { ok: false, reason: 'unrecognized' }

  const raw = parseRawCoords(trimmed)
  if (raw) return { ok: true, value: raw }

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return { ok: false, reason: 'unrecognized' }
  }

  const host = url.hostname.replace(/^www\./, '')

  // Link accorciati: sono redirect, non risolvibili lato browser (CORS).
  const SHORTLINK_HOSTS = ['maps.app.goo.gl', 'goo.gl', 'g.co']
  if (SHORTLINK_HOSTS.includes(host)) {
    return { ok: false, reason: 'shortlink' }
  }

  const href = url.href
  const params = url.searchParams
  const label =
    cleanLabel(params.get('q') ?? '') ||
    // Google Maps place: /maps/place/Nome+Del+Posto/@...
    (() => {
      const placeMatch = url.pathname.match(/\/place\/([^/@]+)/)
      return placeMatch ? cleanLabel(placeMatch[1]) : undefined
    })()

  // Ordine di priorità delle sorgenti di coordinate nei vari formati di URL.
  const candidates: Array<[string | null | undefined, string | null | undefined]> = []

  // Google Maps: @lat,lng,zoom
  const at = url.pathname.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (at) candidates.push([at[1], at[2]])

  // Google Maps dir: ?destination=lat,lng  |  ?daddr=lat,lng (Apple)
  for (const key of ['destination', 'daddr', 'q', 'query', 'sll']) {
    const v = params.get(key)
    const m = v?.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/)
    if (m) candidates.push([m[1], m[2]])
  }

  // Apple Maps / Waze: ?ll=lat,lng
  const ll = params.get('ll')
  const llm = ll?.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/)
  if (llm) candidates.push([llm[1], llm[2]])

  // Google Maps data blob: !3dLAT!4dLNG
  const data3d4d = href.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
  if (data3d4d) candidates.push([data3d4d[1], data3d4d[2]])

  for (const [latS, lngS] of candidates) {
    if (!latS || !lngS) continue
    const lat = Number(latS)
    const lng = Number(lngS)
    if (validCoords(lat, lng)) {
      return { ok: true, value: { lat, lng, label } }
    }
  }

  return { ok: false, reason: 'unrecognized' }
}

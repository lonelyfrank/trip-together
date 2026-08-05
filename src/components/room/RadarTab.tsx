import { Compass, Radio } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import Button from '../ui/Button'
import { mutate } from '../../lib/db'
import { bearingDegrees, distanceMeters, formatDistance, radarIntervalMs } from '../../lib/geo'
import { deleteRadarPosition, upsertRadarPosition } from '../../lib/mutations'
import type { Member, RadarPosition, Room } from '../../types'

const STALE_AFTER_MS = 5 * 60_000
const RING_RADII_PX = [40, 68, 96, 124]
const RING_THRESHOLDS_M = [100, 300, 800]

interface RadarTabProps {
  room: Room
  currentMember: Member
  members: Member[]
  radarPositions: RadarPosition[]
}

function radiusForDistance(meters: number): number {
  for (let i = 0; i < RING_THRESHOLDS_M.length; i++) {
    if (meters <= RING_THRESHOLDS_M[i]) return RING_RADII_PX[i]
  }
  return RING_RADII_PX[RING_RADII_PX.length - 1]
}

export default function RadarTab({ room, currentMember, members, radarPositions }: RadarTabProps) {
  const [active, setActive] = useState(false)
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const destination =
    room.destination_lat !== null && room.destination_lng !== null
      ? { lat: room.destination_lat, lng: room.destination_lng }
      : null

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function ping() {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setMyPos({ lat, lng })
        setError(null)
        await mutate(
          'radar_positions.upsert',
          upsertRadarPosition(currentMember.id, room.id, lat, lng, new Date().toISOString()),
        )
        const distToDestination = destination ? distanceMeters({ lat, lng }, destination) : null
        timerRef.current = setTimeout(ping, radarIntervalMs(distToDestination))
      },
      (err) => {
        setError(err.message)
        setActive(false)
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    )
  }

  async function toggle() {
    if (active) {
      if (timerRef.current) clearTimeout(timerRef.current)
      setActive(false)
      setMyPos(null)
      await mutate('radar_positions.delete', deleteRadarPosition(currentMember.id))
      return
    }
    if (!('geolocation' in navigator)) {
      setError('Il tuo browser non supporta la geolocalizzazione.')
      return
    }
    setError(null)
    setActive(true)
    ping()
  }

  const others = radarPositions.filter(
    (p) => p.member_id !== currentMember.id && Date.now() - new Date(p.updated_at).getTime() < STALE_AFTER_MS,
  )
  const memberById = (id: string) => members.find((m) => m.id === id)

  return (
    <div className="flex flex-col items-center px-4 pb-28 sm:px-6">
      <div className="mb-4 flex w-full items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
          {active ? 'Radar attivo' : 'Radar in pausa'}
        </p>
        <Button variant={active ? 'teal' : 'surface'} size="sm" onClick={toggle}>
          <Radio size={11} /> {active ? 'Attivo' : 'Attiva'}
        </Button>
      </div>

      {error && <p className="mb-3 w-full text-sm text-coral">{error}</p>}

      <p className="mb-4 w-full text-center text-[11px] leading-relaxed text-muted">
        Posizione condivisa solo mentre il radar è attivo, mai salvata come storico — ti porta a
        circa 10 metri dagli altri, non con precisione chirurgica.
      </p>

      <div className="relative flex h-64 w-64 items-center justify-center">
        {RING_RADII_PX.map((r) => (
          <div
            key={r}
            className="absolute rounded-full border border-border-soft"
            style={{ width: r * 2, height: r * 2, opacity: active ? 1 : 0.4 }}
          />
        ))}

        {active && myPos && (
          <div
            className="absolute h-52 w-52 rounded-full border border-teal/25"
            style={{ animation: 'radar-ping 2.8s ease-out infinite' }}
          />
        )}

        {active && myPos && (
          <div
            className="absolute bottom-1/2 left-1/2 h-20 w-0.5 origin-bottom"
            style={{
              background: 'linear-gradient(to top, transparent, var(--color-amber))',
              animation: 'radar-sweep 8s linear infinite',
            }}
          />
        )}

        {active &&
          myPos &&
          others.map((p) => {
            const angle = bearingDegrees(myPos, p)
            const dist = distanceMeters(myPos, p)
            const r = radiusForDistance(dist)
            const rad = (angle * Math.PI) / 180
            const x = Math.sin(rad) * r
            const y = -Math.cos(rad) * r
            return (
              <div
                key={p.member_id}
                className="absolute flex flex-col items-center gap-1"
                style={{ transform: `translate(${x}px, ${y}px)` }}
              >
                <div className="h-3 w-3 rounded-full bg-amber shadow-[0_0_10px_var(--color-amber)]" />
                <span className="whitespace-nowrap rounded-full bg-ink-deep/85 px-1.5 py-0.5 font-mono text-[9px] text-cream">
                  {memberById(p.member_id)?.display_name ?? '?'} · {formatDistance(dist)}
                </span>
              </div>
            )
          })}

        <Compass size={16} className={`absolute top-2 ${active ? 'text-muted' : 'text-border-dashed'}`} />

        {active && myPos && others.length === 0 && (
          <p className="absolute px-10 text-center font-mono text-[11px] leading-relaxed text-muted">
            nessun altro ha il radar attivo al momento
          </p>
        )}
        {active && !myPos && !error && (
          <p className="absolute px-10 text-center font-mono text-[11px] leading-relaxed text-muted">
            in attesa del segnale GPS...
          </p>
        )}
        {!active && (
          <p className="absolute px-10 text-center font-mono text-[12px] leading-relaxed text-muted">
            nessuna posizione condivisa
          </p>
        )}
      </div>
    </div>
  )
}

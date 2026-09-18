import { Compass, Radio } from 'lucide-react'
import { useEffect, useState } from 'react'
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

  useEffect(() => {
    if (!active) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const destination = room.destination_lat !== null && room.destination_lng !== null
      ? { lat: room.destination_lat, lng: room.destination_lng } : null

    function fail(message: string) {
      if (cancelled) return
      setError(message)
      setActive(false)
      setMyPos(null)
    }

    function ping() {
      if (cancelled) return
      navigator.geolocation.getCurrentPosition(async (position) => {
        if (cancelled) return
        const point = { lat: position.coords.latitude, lng: position.coords.longitude }
        try {
          await radarWrite(currentMember.id, async () => {
            if (cancelled) return
            const { error: writeError } = await mutate('radar_positions.upsert', upsertRadarPosition(currentMember.id, room.id, point.lat, point.lng, new Date().toISOString()))
            if (writeError) throw writeError
          })
          if (cancelled) return
          setMyPos(point)
          setError(null)
          timer = setTimeout(ping, radarIntervalMs(destination ? distanceMeters(point, destination) : null))
        } catch { fail('Non riusciamo a condividere la posizione. Controlla la connessione e riattiva il radar.') }
      }, (failure) => {
        fail(failure.code === 1 ? 'Consenti l’accesso alla posizione nelle impostazioni del browser per usare il radar.' : 'Posizione non disponibile. Spostati in un luogo aperto e riprova.')
      }, { enableHighAccuracy: true, timeout: 15_000 })
    }

    ping()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      // La rimozione segue anche un'eventuale scrittura ancora in corso.
      void radarWrite(currentMember.id, async () => {
        const { error: deleteError } = await mutate('radar_positions.delete', deleteRadarPosition(currentMember.id))
        if (deleteError) console.error('[radar] Impossibile rimuovere la posizione', deleteError.message)
      }).catch(() => console.error('[radar] Pulizia della posizione non riuscita'))
    }
  }, [active, currentMember.id, room.id, room.destination_lat, room.destination_lng])

  function toggle() {
    if (!active && !('geolocation' in navigator)) {
      setError('Il tuo browser non supporta la geolocalizzazione.')
      return
    }
    setError(null)
    setMyPos(null)
    setActive((previous) => !previous)
  }

  const others = radarPositions.filter(
    (p) => p.member_id !== currentMember.id && Date.now() - new Date(p.updated_at).getTime() < STALE_AFTER_MS,
  )
  const memberById = (id: string) => members.find((m) => m.id === id)

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 flex w-full items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
          {active ? 'Radar attivo' : 'Radar in pausa'}
        </p>
        <Button aria-pressed={active} variant={active ? 'teal' : 'surface'} size="sm" onClick={toggle}>
          <Radio size={11} /> {active ? 'Disattiva' : 'Attiva radar'}
        </Button>
      </div>

      {error && <p className="mb-3 w-full text-sm text-coral">{error}</p>}

      <p className="mb-4 w-full text-center text-[11px] leading-relaxed text-muted">
        Il radar si ferma quando esci da questa sezione. La posizione non viene conservata come storico; la precisione dipende dal segnale GPS. Se perdi la connessione, l’ultima posizione può restare visibile per alcuni minuti.
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
                <span className="whitespace-nowrap rounded-full bg-ink-deep/85 px-1.5 py-0.5 font-mono text-[10px] text-cream">
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

// Serializza anche tra smontaggio e riapertura della tab: una pulizia tardiva
// non deve cancellare la posizione della nuova sessione.
const radarWrites = new Map<string, Promise<void>>()
function radarWrite(memberId: string, work: () => Promise<void>): Promise<void> {
  const next = (radarWrites.get(memberId) ?? Promise.resolve()).catch(() => {}).then(work)
  radarWrites.set(memberId, next)
  const clear = () => { if (radarWrites.get(memberId) === next) radarWrites.delete(memberId) }
  void next.then(clear, clear)
  return next
}

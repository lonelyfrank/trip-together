import { useEffect, useState } from 'react'
import { mutate } from '../lib/db'
import { distanceMeters, radarIntervalMs } from '../lib/geo'
import { deleteRadarPosition, upsertRadarPosition } from '../lib/mutations'
import type { Member, Room } from '../types'

// Condivisione della posizione nel radar. Spenta all'avvio, sempre: si
// accende solo con `toggle()`, cioè con un gesto esplicito. Smontare il
// componente che usa l'hook (uscire dalla tab Radar) la spegne e cancella la
// riga dal database: le posizioni non sono mai storicizzate. `pageActive`
// falso la spegne subito, senza aspettare la fine dell'animazione del pager.
export function useRadarSharing(room: Room, currentMember: Member, pageActive = true) {
  const [active, setActive] = useState(false)
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [wasPageActive, setWasPageActive] = useState(pageActive)
  if (wasPageActive !== pageActive) {
    setWasPageActive(pageActive)
    if (!pageActive) {
      setActive(false)
      setMyPos(null)
    }
  }

  useEffect(() => {
    if (!active || !pageActive) return
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
  }, [active, pageActive, currentMember.id, room.id, room.destination_lat, room.destination_lng])

  function toggle() {
    if (!active && !('geolocation' in navigator)) {
      setError('Il tuo browser non supporta la geolocalizzazione.')
      return
    }
    setError(null)
    setMyPos(null)
    setActive((previous) => !previous)
  }

  return { active, myPos, error, toggle }
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

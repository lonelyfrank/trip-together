import type { ReactNode } from 'react'
import { type LatLng, TILE_SIZE, worldPx } from '../../lib/mapTiles'

// Mappa statica a tile OpenStreetMap, centrata su coordinate vere. Sostituisce
// le mappe disegnate del mockup: una cartina di un altro posto, sotto un
// evento reale, direbbe una cosa falsa. I segnaposto sono figli posizionati
// sul punto proiettato.
//
// Copre fino a 640×320 px attorno al centro: più della card più larga
// dell'app. Senza rete le tile non arrivano e resta il fondo neutro.

const HALF_W = 320
const HALF_H = 160

export interface MapPoint extends LatLng {
  key: string
  node: ReactNode
}

interface StaticMapProps {
  center: LatLng
  zoom: number
  points?: MapPoint[]
  className?: string
  /** Testo alternativo della mappa (la posizione, non "mappa"). Vuoto = decorativa. */
  label: string
  /** Sposta il centro di N px a destra: lascia spazio ai testi a sinistra. */
  offsetX?: number
  /** Le miniature non hanno spazio: l'attribuzione va nel foglio di dettaglio. */
  attribution?: 'bottom-right' | 'top-right' | 'none'
}

export default function StaticMap({
  center,
  zoom,
  points = [],
  className = '',
  label,
  offsetX = 0,
  attribution = 'bottom-right',
}: StaticMapProps) {
  const c = worldPx(center, zoom)
  const tilesPerSide = 2 ** zoom
  const tiles: { key: string; src: string; left: number; top: number }[] = []
  for (let tx = Math.floor((c.x - HALF_W) / TILE_SIZE); tx <= Math.floor((c.x + HALF_W) / TILE_SIZE); tx++) {
    for (let ty = Math.floor((c.y - HALF_H) / TILE_SIZE); ty <= Math.floor((c.y + HALF_H) / TILE_SIZE); ty++) {
      if (ty < 0 || ty >= tilesPerSide) continue
      const wrappedX = ((tx % tilesPerSide) + tilesPerSide) % tilesPerSide
      tiles.push({
        key: `${tx}/${ty}`,
        src: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${ty}.png`,
        left: tx * TILE_SIZE - c.x,
        top: ty * TILE_SIZE - c.y,
      })
    }
  }

  return (
    <div
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      className={`${className.includes('absolute') ? '' : 'relative'} overflow-hidden bg-grey-soft ${className}`}
    >
      {tiles.map((tile) => (
        <img
          key={tile.key}
          src={tile.src}
          alt=""
          draggable={false}
          className="absolute max-w-none select-none"
          style={{ left: `calc(50% + ${tile.left + offsetX}px)`, top: `calc(50% + ${tile.top}px)`, width: TILE_SIZE, height: TILE_SIZE }}
        />
      ))}
      {points.map((point) => {
        const p = worldPx(point, zoom)
        return (
          <div
            key={point.key}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `calc(50% + ${p.x - c.x + offsetX}px)`, top: `calc(50% + ${p.y - c.y}px)` }}
          >
            {point.node}
          </div>
        )
      })}
      {attribution !== 'none' && (
        <span
          className={`absolute rounded-md bg-surface/80 px-1 text-[8px] leading-[12px] text-fg-muted ${
            attribution === 'bottom-right' ? 'bottom-0 right-0 rounded-br-none' : 'right-1 top-[46px]'
          }`}
        >
          © OpenStreetMap
        </span>
      )}
    </div>
  )
}

import { MapPin } from 'lucide-react'
import { MapAppLinks } from '../MapSheet'
import BottomSheet from '../ui/BottomSheet'
import StaticMap from '../ui/StaticMap'
import DestinationCard from './DestinationCard'
import type { Room } from '../../types'

// "Vedi dettagli" dell'hero e del punto di ritrovo: dove e quando, con la
// modifica (link di mappe, coordinate, orario), il meteo e le app di
// navigazione.
export default function EventDetailsSheet({ room, open, onClose }: { room: Room; open: boolean; onClose: () => void }) {
  const hasCoords = room.destination_lat !== null && room.destination_lng !== null
  return (
    <BottomSheet open={open} onClose={onClose} title="Dove e quando">
      <div className="space-y-3">
        {hasCoords && (
          <StaticMap
            center={{ lat: room.destination_lat!, lng: room.destination_lng! }}
            zoom={15}
            label={`Mappa del punto di ritrovo: ${room.destination_label ?? 'posizione salvata'}`}
            className="h-[140px] rounded-card"
            points={[{ key: 'meet', lat: room.destination_lat!, lng: room.destination_lng!, node: <MapMarker /> }]}
          />
        )}
        <DestinationCard room={room} />
        {hasCoords && (
          <section aria-label="Navigazione">
            <h3 className="mb-2 text-[12.5px] font-bold text-fg">Apri il percorso con</h3>
            <MapAppLinks lat={room.destination_lat!} lng={room.destination_lng!} />
          </section>
        )}
      </div>
    </BottomSheet>
  )
}

/** Segnaposto rosso del mockup, con la punta sul punto esatto. */
export function MapMarker() {
  return (
    <span className="flex -translate-y-1/2 flex-col items-center">
      <MapPin aria-hidden="true" size={26} strokeWidth={2} className="fill-danger text-surface drop-shadow" />
    </span>
  )
}

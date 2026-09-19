import { ChevronRight } from 'lucide-react'
import BottomSheet from './ui/BottomSheet'

function mapApps(lat: number, lng: number) {
  return [
    { name: 'Google Maps', href: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` },
    { name: 'Apple Maps', href: `https://maps.apple.com/?daddr=${lat},${lng}` },
    { name: 'Waze', href: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes` },
  ]
}

export function MapAppLinks({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div className="space-y-2">
      {mapApps(lat, lng).map((a) => (
        <a
          key={a.name}
          href={a.href}
          target="_blank"
          rel="noreferrer"
          className="press flex min-h-12 items-center justify-between rounded-card border border-line bg-surface px-4 shadow-card"
        >
          <p className="text-[13px] font-semibold text-fg">{a.name}</p>
          <ChevronRight aria-hidden="true" size={15} className="text-fg-muted" />
        </a>
      ))}
    </div>
  )
}

interface MapSheetProps {
  open: boolean
  onClose: () => void
  lat: number
  lng: number
}

export default function MapSheet({ open, onClose, lat, lng }: MapSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Apri percorso con">
      <MapAppLinks lat={lat} lng={lng} />
    </BottomSheet>
  )
}

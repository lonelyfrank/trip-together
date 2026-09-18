import { ChevronRight } from 'lucide-react'
import BottomSheet from './ui/BottomSheet'

interface MapSheetProps {
  open: boolean
  onClose: () => void
  lat: number
  lng: number
}

export default function MapSheet({ open, onClose, lat, lng }: MapSheetProps) {
  const apps = [
    { name: 'Google Maps', href: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` },
    { name: 'Apple Maps', href: `https://maps.apple.com/?daddr=${lat},${lng}` },
    { name: 'Waze', href: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes` },
  ]

  return (
    <BottomSheet open={open} onClose={onClose} title="Apri percorso con">
      <div className="space-y-2">
        {apps.map((a) => (
          <a
            key={a.name}
            href={a.href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-2xl bg-canvas px-4 py-3.5 transition-transform active:scale-[0.98]"
          >
            <p className="text-[13px] font-medium text-fg">{a.name}</p>
            <ChevronRight size={15} className="text-fg-muted" />
          </a>
        ))}
      </div>
    </BottomSheet>
  )
}

import { ChevronRight, X } from 'lucide-react'

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
    <div className={`fixed inset-0 z-30 transition-opacity duration-300 ${open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={`absolute inset-x-0 bottom-0 mx-auto max-w-lg rounded-t-[28px] border-t border-border-strong bg-highlight-to px-6 pb-8 pt-3 transition-transform duration-300 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border-dashed" />
        <div className="mb-4 flex items-center justify-between">
          <p className="font-serif text-[17px] text-cream">Apri percorso con</p>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full bg-ink">
            <X size={13} className="text-muted" />
          </button>
        </div>
        <div className="space-y-2">
          {apps.map((a) => (
            <a
              key={a.name}
              href={a.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-2xl bg-ink px-4 py-3.5 transition-transform active:scale-[0.98]"
            >
              <p className="text-[13.5px] font-medium text-cream">{a.name}</p>
              <ChevronRight size={15} className="text-muted" />
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

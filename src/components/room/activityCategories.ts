import { GlassWater, Landmark, MapPin, Mountain, Umbrella, UtensilsCrossed } from 'lucide-react'

// Non ci sono foto delle tappe: la miniatura del mockup diventa un
// gradiente per categoria con la sua icona, riconoscibile a colpo d'occhio.
export const CATEGORY = {
  mare: { icon: Umbrella, label: 'Mare', tile: 'from-[#0ea5e9] to-[#14b8a6]' },
  cibo: { icon: UtensilsCrossed, label: 'Cibo', tile: 'from-[#f59e0b] to-[#ef4444]' },
  cultura: { icon: Landmark, label: 'Cultura', tile: 'from-[#94a3b8] to-[#475569]' },
  drink: { icon: GlassWater, label: 'Drink', tile: 'from-[#f97316] to-[#db2777]' },
  panorama: { icon: Mountain, label: 'Panorama', tile: 'from-[#7c3aed] to-[#f97316]' },
  altro: { icon: MapPin, label: 'Altro', tile: 'from-[#14b8a6] to-[#22c55e]' },
} as const

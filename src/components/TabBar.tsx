import { Car, Compass, Receipt, ShoppingBag, Users } from 'lucide-react'

export type RoomTabId = 'stanza' | 'auto' | 'bacheca' | 'spese' | 'radar'

const TABS: { id: RoomTabId; label: string; icon: typeof Users }[] = [
  { id: 'stanza', label: 'Evento', icon: Users },
  { id: 'auto', label: 'Auto', icon: Car },
  { id: 'bacheca', label: 'Bacheca', icon: ShoppingBag },
  { id: 'spese', label: 'Spese', icon: Receipt },
  { id: 'radar', label: 'Radar', icon: Compass },
]

interface TabBarProps {
  active: RoomTabId
  onChange: (tab: RoomTabId) => void
}

export default function TabBar({ active, onChange }: TabBarProps) {
  return (
    <nav aria-label="Sezioni dell’evento" className="bottom-actions fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg bg-gradient-to-t from-ink via-ink/95 px-4 pt-3 sm:px-6">
      <div className="grid grid-cols-5 gap-1 rounded-[22px] border border-border-strong bg-surface p-1.5 shadow-xl">
        {TABS.map((t) => {
          const Icon = t.icon
          const isActive = t.id === active
          return (
            <button
              key={t.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onChange(t.id)}
              className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-xs font-medium transition-colors ${
                isActive ? 'bg-amber text-ink' : 'text-muted hover:bg-ink/40 hover:text-cream'
              }`}
            >
              <Icon aria-hidden="true" size={19} strokeWidth={isActive ? 2.4 : 2} />
              {t.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

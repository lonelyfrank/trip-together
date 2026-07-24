import { Car, Compass, Receipt, ShoppingBag, Users } from 'lucide-react'

export type RoomTabId = 'stanza' | 'auto' | 'bacheca' | 'spese' | 'radar'

const TABS: { id: RoomTabId; label: string; icon: typeof Users }[] = [
  { id: 'stanza', label: 'Stanza', icon: Users },
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
  const activeIndex = TABS.findIndex((t) => t.id === active)

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg px-4 pb-6 pt-2 sm:px-6">
      <div className="relative flex rounded-[22px] border border-border-soft bg-surface p-1.5">
        <div
          className="absolute bottom-1.5 top-1.5 rounded-2xl bg-amber transition-transform duration-300"
          style={{ width: `${100 / TABS.length}%`, transform: `translateX(${activeIndex * 100}%)` }}
        />
        {TABS.map((t) => {
          const Icon = t.icon
          const isActive = t.id === active
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`relative z-10 flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-medium transition-colors ${
                isActive ? 'text-ink' : 'text-muted'
              }`}
            >
              <Icon size={16} strokeWidth={isActive ? 2.4 : 2} />
              {t.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

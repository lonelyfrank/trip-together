import { Car, House, Target } from 'lucide-react'
import { BoardIcon, CoinsIcon } from './icons'
import { TAB_IDS, TAB_LABELS, type TabId } from '../lib/tabs'

// Barra fissa del mockup: cinque sezioni della stanza, bianca traslucida,
// linea sottile sopra, sottolineatura verde che scorre sotto la voce attiva.
// Nessuna pillola: il colore e la linea bastano.

const ICONS = { stanza: House, auto: Car, bacheca: BoardIcon, spese: CoinsIcon, radar: Target } as const

interface BottomNavigationProps {
  active: TabId
  onSelect: (tab: TabId) => void
}

export default function BottomNavigation({ active, onSelect }: BottomNavigationProps) {
  const index = TAB_IDS.indexOf(active)
  return (
    <nav
      aria-label="Sezioni"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line-strong bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
    >
      <div className="relative mx-auto flex h-[var(--tt-nav-h)] max-w-[430px]">
        {TAB_IDS.map((id) => {
          const Icon = ICONS[id]
          const isActive = id === active
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center justify-start gap-[3px] pt-[9px] text-[10.5px] leading-[1.2] transition-colors duration-200 ${
                isActive ? 'font-bold text-brand-button' : 'font-medium text-nav-idle'
              }`}
            >
              <Icon aria-hidden="true" size={23} strokeWidth={1.7} />
              <span>{TAB_LABELS[id]}</span>
            </button>
          )
        })}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[3px] left-0 flex w-1/5 justify-center transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
          style={{ transform: `translateX(${Math.max(index, 0) * 100}%)` }}
        >
          <span className="h-[3px] w-[42px] rounded-sm bg-brand" />
        </span>
      </div>
    </nav>
  )
}

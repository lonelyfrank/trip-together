import { CalendarCheck, Compass, Home, Route, User } from 'lucide-react'
import { NavLink } from 'react-router-dom'

// Navigazione principale dell'app: cinque destinazioni, quattro legate alla
// stanza corrente più il profilo (che vive fuori dalla stanza). Su mobile è
// una barra in basso con safe-area; da 768px diventa una colonna laterale,
// invece di una barra mobile ingrandita.

export type NavId = 'adesso' | 'viaggio' | 'attivita' | 'gruppo' | 'profilo'

const ITEMS: { id: NavId; label: string; icon: typeof Home }[] = [
  { id: 'adesso', label: 'Adesso', icon: Home },
  { id: 'viaggio', label: 'Viaggio', icon: Route },
  { id: 'attivita', label: 'Attività', icon: Compass },
  { id: 'gruppo', label: 'Gruppo', icon: CalendarCheck },
  { id: 'profilo', label: 'Profilo', icon: User },
]

interface BottomNavigationProps {
  /** Stanza a cui puntano le quattro voci di viaggio. Assente = solo Profilo. */
  roomId?: string
  active: NavId
}

export default function BottomNavigation({ roomId, active }: BottomNavigationProps) {
  const hrefFor = (id: NavId) => (id === 'profilo' ? '/profilo' : roomId ? `/room/${roomId}/${id}` : '/')

  return (
    <nav
      aria-label="Navigazione principale"
      className="bottom-actions fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-2 pt-2 backdrop-blur md:inset-y-0 md:right-auto md:left-0 md:w-[220px] md:flex-col md:justify-start md:border-r md:border-t-0 md:px-3 md:pt-6 md:backdrop-blur-none"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 gap-1 md:flex md:max-w-none md:flex-col md:gap-1.5">
        {ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = item.id === active
          const disabled = item.id !== 'profilo' && !roomId
          return (
            <li key={item.id}>
              <NavLink
                to={hrefFor(item.id)}
                aria-current={isActive ? 'page' : undefined}
                aria-disabled={disabled || undefined}
                className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[11px] font-medium transition-colors md:min-h-12 md:flex-row md:justify-start md:gap-3 md:px-3 md:text-sm ${
                  isActive ? 'bg-accent-soft text-accent' : 'text-fg-muted hover:bg-canvas hover:text-fg'
                } ${disabled ? 'pointer-events-none opacity-40' : ''}`}
              >
                <Icon aria-hidden="true" size={20} strokeWidth={isActive ? 2.4 : 2} />
                {item.label}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

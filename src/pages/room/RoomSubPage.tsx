import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useRoomContext } from '../../hooks/useRoomContext'

// Pagina della stanza fuori dal pager (il programma completo): stesso header
// e stessa barra, un proprio scroll e il ritorno alla tab di partenza.
export default function RoomSubPage({ children, backTo = 'stanza' }: { children: ReactNode; backTo?: 'stanza' }) {
  const { goTo } = useRoomContext()
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
      <div className="tab-page mx-auto max-w-[430px]">
        <button
          type="button"
          onClick={() => goTo(backTo)}
          className="press -ml-2 mb-1 flex min-h-11 items-center gap-0.5 px-2 text-[12px] font-semibold text-fg-muted"
        >
          <ChevronLeft aria-hidden="true" size={17} /> Stanza
        </button>
        {children}
      </div>
    </div>
  )
}

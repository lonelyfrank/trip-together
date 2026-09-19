import { Bell } from 'lucide-react'
import { ASSETS } from '../lib/assets'
import type { Room } from '../types'

// Header globale del mockup: marchio a sinistra, avvisi e miniatura
// dell'evento a destra. La miniatura è anche la porta per cambiare evento
// (e da lì al profilo), perché la barra in basso è tutta della stanza.

interface TripHeaderProps {
  room: Room
  /** Ritardi aperti: l'unica cosa che oggi merita un badge. */
  alertCount?: number
  onAlerts?: () => void
  onSwitch: () => void
}

export default function TripHeader({ room, alertCount = 0, onAlerts, onSwitch }: TripHeaderProps) {
  return (
    <header className="shrink-0 bg-canvas px-[var(--tt-page-x)] pb-0.5 pt-[max(4px,env(safe-area-inset-top))]">
      <div className="mx-auto flex h-[41px] max-w-[430px] items-center gap-2">
        {ASSETS.logo ? (
          <img src={ASSETS.logo} alt="" className="h-[31px] w-[38px] object-cover" draggable={false} />
        ) : (
          <span aria-hidden="true" className="h-[31px] w-[38px] rounded-lg bg-gradient-to-br from-blue to-brand" />
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-[15px] font-bold leading-none tracking-[-0.2px] text-fg">Trip Together</p>
          <p className="text-[10.5px] leading-none text-fg-muted">Viaggiare è meglio insieme</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {onAlerts && (
            <button
              type="button"
              onClick={onAlerts}
              aria-label={alertCount > 0 ? `Avvisi, ${alertCount} ritardi aperti` : 'Avvisi, nessun ritardo'}
              className="press relative flex h-11 w-[34px] items-center justify-center text-fg"
            >
              <Bell aria-hidden="true" size={20} strokeWidth={1.7} />
              {alertCount > 0 && (
                <span className="absolute right-0.5 top-[7px] flex h-3.5 min-w-3.5 items-center justify-center rounded-[7px] bg-danger px-[3px] text-[9px] font-bold leading-none text-white">
                  {alertCount}
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onSwitch}
            aria-haspopup="dialog"
            aria-label={`${room.title}: cambia evento o apri il profilo`}
            className="press flex h-11 w-11 items-center justify-center"
          >
            {ASSETS.trip ? (
              <img
                src={ASSETS.trip}
                alt=""
                className="h-10 w-10 rounded-full object-cover shadow-float ring-[1.5px] ring-surface"
                draggable={false}
              />
            ) : (
              <span className="h-10 w-10 rounded-full bg-gradient-to-br from-blue to-brand" />
            )}
          </button>
        </div>
      </div>
    </header>
  )
}

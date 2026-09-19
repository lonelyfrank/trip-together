import { Calendar, ChevronRight, MapPin, Navigation } from 'lucide-react'
import { ASSETS } from '../../lib/assets'
import { formatEventTime } from '../../lib/format'
import type { RoomPhase } from '../../lib/phase'
import type { Room } from '../../types'

// Hero del mockup in tre altezze: 184 in Stanza, 129 in Radar, 66 in
// Bacheca e Spese. La foto è una copertina decorativa (lo schema non ne ha
// una per evento); titolo, data e luogo sono quelli veri. Senza foto resta
// il gradiente, con la stessa velatura che tiene leggibile il bianco.

const PHASE: Record<RoomPhase, string> = {
  pre: 'In programma',
  in_corso: 'Viaggio in corso',
  concluso: 'Viaggio concluso',
}

const SIZES = {
  large: { height: 184, position: '50% 60%' },
  medium: { height: 129, position: '50% 60%' },
  compact: { height: 66, position: '50% 42%' },
} as const

interface TripHeroProps {
  room: Room
  phase: RoomPhase
  size?: keyof typeof SIZES
  onDetails?: () => void
}

export default function TripHero({ room, phase, size = 'large', onDetails }: TripHeroProps) {
  const compact = size === 'compact'
  const meta = SIZES[size]
  return (
    <section
      aria-label="Il viaggio"
      className="relative shrink-0 overflow-hidden rounded-hero bg-gradient-to-br from-blue to-brand-button shadow-hero"
      style={{ height: meta.height }}
    >
      {ASSETS.hero && (
        <img
          src={ASSETS.hero}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: meta.position }}
          draggable={false}
        />
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,rgb(8_20_40/5%)_30%,rgb(8_20_40/50%)_100%)]"
      />

      {size === 'large' && (
        <span className="absolute left-[9px] top-[11px] flex items-center gap-1.5 rounded-[9px] bg-brand-button/90 py-1.5 pl-2 pr-2.5 text-[11.5px] font-semibold text-white">
          <Navigation aria-hidden="true" size={13} fill="currentColor" strokeWidth={2.2} />
          {PHASE[phase]}
        </span>
      )}

      <p
        aria-hidden="true"
        className={`font-hand pointer-events-none absolute -rotate-[9deg] whitespace-nowrap text-right text-white [text-shadow:0_1px_6px_rgb(0_0_0/35%)] ${
          compact ? 'right-[11px] top-1 text-[14px] leading-[0.9]' : 'right-3 top-2 text-[17px] leading-[0.92]'
        }`}
      >
        {compact ? (
          <>Esperienze<br />Spese<br />Amicizia ♡</>
        ) : (
          <>Luoghi<br />persone<br />Storie migliori<br />insieme ♡</>
        )}
      </p>

      <div className={`absolute left-3 ${compact ? 'bottom-2 right-24' : 'bottom-2.5 right-[130px]'}`}>
        <h1
          className={`truncate text-[22px] font-bold tracking-[-0.4px] text-white [text-shadow:0_1px_8px_rgb(0_0_0/32%)] ${
            compact ? 'mb-[5px] leading-[1.05]' : 'mb-[9px] leading-[1.1]'
          }`}
        >
          {room.title}
        </h1>
        <p
          className={`flex items-center gap-1.5 whitespace-nowrap font-medium text-white [text-shadow:0_1px_4px_rgb(0_0_0/40%)] ${
            compact ? 'text-[11px]' : 'text-[11.5px]'
          }`}
        >
          <Calendar aria-hidden="true" size={compact ? 12 : 13} strokeWidth={1.8} className="shrink-0" />
          <span className="shrink-0">{room.event_time ? formatEventTime(room.event_time) : 'Data da scegliere'}</span>
          <MapPin aria-hidden="true" size={compact ? 12 : 13} strokeWidth={2} className="ml-2 shrink-0" />
          <span className="min-w-0 truncate">{room.destination_label || 'Luogo da scegliere'}</span>
        </p>
      </div>

      {onDetails && !compact && (
        <button
          type="button"
          onClick={onDetails}
          className="press absolute bottom-[3px] right-[3px] flex min-h-11 items-center p-1.5"
        >
          <span className="flex h-[30px] items-center gap-1 rounded-[15px] border border-white/70 bg-white/15 px-[11px] text-[11.5px] font-semibold text-white">
            Vedi dettagli <ChevronRight aria-hidden="true" size={12} strokeWidth={2.4} />
          </span>
        </button>
      )}
    </section>
  )
}

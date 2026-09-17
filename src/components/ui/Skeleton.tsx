// Placeholder di caricamento: stesso linguaggio visivo del pulse già usato in
// WeatherStrip (animate-pulse), riusato qui per le pagine intere invece del
// solo testo "Caricamento...". Due toni per restare visibile in entrambi i
// contesti: `onInk` (default) per i placeholder direttamente sullo sfondo
// pagina bg-ink, `onSurface` per quelli dentro una card bg-surface (dove
// bg-ink/60 fa già contrasto, come nel pulse di WeatherStrip).

const TONES = {
  onInk: 'bg-surface',
  onSurface: 'bg-ink/60',
} as const

interface SkeletonProps {
  className?: string
  tone?: keyof typeof TONES
}

export function Skeleton({ className = '', tone = 'onInk' }: SkeletonProps) {
  return <div className={`animate-pulse rounded-lg ${TONES[tone]} ${className}`} />
}

/** Placeholder per una riga stile ScreenHeader (eyebrow + titolo + azione). */
export function SkeletonHeader() {
  return (
    <div className="flex items-end justify-between gap-4 px-4 pt-2 pb-4 sm:px-6">
      <div className="min-w-0 space-y-2">
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="h-6 w-40" />
      </div>
      <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
    </div>
  )
}

/** Placeholder per una riga stile Card con icona + due righe di testo. */
export function SkeletonCard() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border-soft bg-surface/70 p-4">
      <Skeleton tone="onSurface" className="h-11 w-11 shrink-0 rounded-2xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton tone="onSurface" className="h-4 w-2/3" />
        <Skeleton tone="onSurface" className="h-3 w-1/3" />
      </div>
    </div>
  )
}

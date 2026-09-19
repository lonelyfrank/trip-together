import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchWeather, weatherMeta } from '../../lib/weather'

const ICONS = {
  sun: Sun,
  'cloud-sun': CloudSun,
  cloud: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
} as const

interface WeatherStripProps {
  lat: number
  lng: number
  eventTime: string | null
  /** `tile`: temperatura grande e descrizione sotto, per le card a mezza larghezza.
   *  `compact`: una riga alta 24 px, icona + gradi + descrizione (Stanza). */
  variant?: 'strip' | 'tile' | 'compact'
  place?: string | null
}

export default function WeatherStrip({ lat, lng, eventTime, variant = 'strip', place }: WeatherStripProps) {
  const eventDate = eventTime ? eventTime.slice(0, 10) : null
  const { data: weather, isPending, isError } = useQuery({
    queryKey: ['weather', lat, lng, eventDate],
    queryFn: () => fetchWeather(lat, lng, eventDate),
    staleTime: 30 * 60_000,
    gcTime: 30 * 60_000,
  })

  if (variant === 'compact') {
    if (isPending) return <div className="h-6 animate-pulse rounded-lg bg-grey-soft" />
    if (isError || !weather) return <p className="pt-1 text-[10px] text-fg-muted">Meteo non disponibile</p>
    const meta = weatherMeta(weather.code)
    const Icon = ICONS[meta.icon]
    return (
      <div className="flex h-6 items-center gap-1.5">
        <Icon aria-hidden="true" size={24} strokeWidth={1.8} className="shrink-0 fill-warning/40 text-warning" />
        <p className="text-[23px] font-bold leading-none tracking-[-0.5px] text-fg">
          {weather.kind === 'forecast' ? `${weather.tempMax}°` : `${weather.temp}°`}
        </p>
        <div className="ml-auto min-w-0 text-left">
          <p className="truncate text-[9.5px] leading-[1.2] text-fg-muted">{meta.label}</p>
          <p className="truncate text-[9.5px] leading-[1.2] text-fg-muted">{place ?? (weather.kind === 'forecast' ? 'Previsto' : 'Adesso')}</p>
        </div>
      </div>
    )
  }

  if (variant === 'tile') {
    if (isPending) return <div className="h-12 animate-pulse rounded-xl bg-canvas" />
    if (isError || !weather) return <p className="text-[11.5px] text-fg-muted">Meteo non disponibile al momento.</p>
    const meta = weatherMeta(weather.code)
    const Icon = ICONS[meta.icon]
    return (
      <div>
        <p className="flex items-center gap-2">
          <Icon aria-hidden="true" size={22} className="shrink-0 text-warn" />
          <span className="text-[17px] font-extrabold text-fg">
            {weather.kind === 'forecast' ? `${weather.tempMin}° / ${weather.tempMax}°` : `${weather.temp}°`}
          </span>
        </p>
        <p className="mt-1 truncate text-[11.5px] font-medium text-fg-muted">
          <span>{meta.label}</span>
          {place && <span> · {place}</span>}
        </p>
        <p className="text-[10.5px] text-fg-muted">
          {weather.kind === 'forecast' ? 'Previsto per l’evento' : 'Adesso a destinazione'}
        </p>
      </div>
    )
  }

  if (isPending) {
    return <div className="mt-3 h-9 animate-pulse rounded-xl bg-canvas/60" />
  }
  if (isError || !weather) {
    return (
      <p className="mt-3 rounded-xl bg-canvas/60 px-3 py-2 text-[10.5px] text-fg-muted">
        Meteo non disponibile al momento.
      </p>
    )
  }

  const meta = weatherMeta(weather.code)
  const Icon = ICONS[meta.icon]

  return (
    <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-canvas/60 px-3 py-2">
      <Icon size={20} className="shrink-0 text-brand-text" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-fg">{meta.label}</p>
        <p className="text-[12.5px] font-bold text-fg">
          {weather.kind === 'forecast' ? 'Previsto per l’evento' : 'Adesso a destinazione'}
        </p>
      </div>
      {weather.kind === 'forecast' ? (
        <p className="shrink-0 font-mono text-[13px] text-fg">
          {weather.tempMin}° / {weather.tempMax}°
        </p>
      ) : (
        <p className="shrink-0 font-mono text-[15px] text-fg">{weather.temp}°</p>
      )}
    </div>
  )
}

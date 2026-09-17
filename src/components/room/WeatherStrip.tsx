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
}

export default function WeatherStrip({ lat, lng, eventTime }: WeatherStripProps) {
  const eventDate = eventTime ? eventTime.slice(0, 10) : null
  const { data: weather, isPending, isError } = useQuery({
    queryKey: ['weather', lat, lng, eventDate],
    queryFn: () => fetchWeather(lat, lng, eventDate),
    staleTime: 30 * 60_000,
    gcTime: 30 * 60_000,
  })

  if (isPending) {
    return <div className="mt-3 h-9 animate-pulse rounded-xl bg-ink/60" />
  }
  if (isError || !weather) {
    return (
      <p className="mt-3 rounded-xl bg-ink/60 px-3 py-2 font-mono text-[10px] text-muted">
        Meteo non disponibile al momento.
      </p>
    )
  }

  const meta = weatherMeta(weather.code)
  const Icon = ICONS[meta.icon]

  return (
    <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-ink/60 px-3 py-2">
      <Icon size={20} className="shrink-0 text-teal" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-cream">{meta.label}</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
          {weather.kind === 'forecast' ? 'Previsto per l’evento' : 'Adesso a destinazione'}
        </p>
      </div>
      {weather.kind === 'forecast' ? (
        <p className="shrink-0 font-mono text-[13px] text-cream">
          {weather.tempMin}° / {weather.tempMax}°
        </p>
      ) : (
        <p className="shrink-0 font-mono text-[15px] text-cream">{weather.temp}°</p>
      )}
    </div>
  )
}

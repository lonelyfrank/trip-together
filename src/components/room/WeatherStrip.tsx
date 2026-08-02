import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchWeather, weatherMeta, type WeatherResult } from '../../lib/weather'

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
  const [weather, setWeather] = useState<WeatherResult | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')

  const eventDate = eventTime ? eventTime.slice(0, 10) : null

  useEffect(() => {
    let cancelled = false
    setState('loading')
    fetchWeather(lat, lng, eventDate)
      .then((result) => {
        if (cancelled) return
        if (result) {
          setWeather(result)
          setState('ok')
        } else {
          setState('error')
        }
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })
    return () => {
      cancelled = true
    }
  }, [lat, lng, eventDate])

  if (state === 'loading') {
    return <div className="mt-3 h-9 animate-pulse rounded-xl bg-ink/60" />
  }
  if (state === 'error' || !weather) {
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
        <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">
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

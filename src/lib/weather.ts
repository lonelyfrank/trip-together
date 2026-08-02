// Meteo della destinazione via Open-Meteo (gratuito, senza API key, CORS-friendly).
// Nessun dato persistito: fetch al volo lato client dalle coordinate della stanza.

export interface CurrentWeather {
  kind: 'current'
  temp: number
  code: number
}

export interface ForecastWeather {
  kind: 'forecast'
  date: string // YYYY-MM-DD
  tempMin: number
  tempMax: number
  code: number
}

export type WeatherResult = CurrentWeather | ForecastWeather

const FORECAST_DAYS = 16

/**
 * Se `eventDate` (YYYY-MM-DD) cade entro la finestra di previsione, ritorna il
 * meteo previsto per quel giorno; altrimenti il meteo attuale a destinazione.
 */
export async function fetchWeather(
  lat: number,
  lng: number,
  eventDate?: string | null,
): Promise<WeatherResult | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,weather_code` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
    `&timezone=auto&forecast_days=${FORECAST_DAYS}`

  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()

  if (eventDate && Array.isArray(data?.daily?.time)) {
    const i = data.daily.time.indexOf(eventDate)
    if (i !== -1) {
      return {
        kind: 'forecast',
        date: eventDate,
        tempMin: Math.round(data.daily.temperature_2m_min[i]),
        tempMax: Math.round(data.daily.temperature_2m_max[i]),
        code: data.daily.weather_code[i],
      }
    }
  }

  if (data?.current) {
    return { kind: 'current', temp: Math.round(data.current.temperature_2m), code: data.current.weather_code }
  }
  return null
}

export interface WeatherMeta {
  label: string
  icon: 'sun' | 'cloud-sun' | 'cloud' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm'
}

/** Mappa un codice meteo WMO a descrizione italiana + nome icona. */
export function weatherMeta(code: number): WeatherMeta {
  if (code === 0) return { label: 'Sereno', icon: 'sun' }
  if (code === 1 || code === 2) return { label: 'Poco nuvoloso', icon: 'cloud-sun' }
  if (code === 3) return { label: 'Nuvoloso', icon: 'cloud' }
  if (code === 45 || code === 48) return { label: 'Nebbia', icon: 'fog' }
  if (code >= 51 && code <= 57) return { label: 'Pioviggine', icon: 'drizzle' }
  if (code >= 61 && code <= 67) return { label: 'Pioggia', icon: 'rain' }
  if (code >= 71 && code <= 77) return { label: 'Neve', icon: 'snow' }
  if (code >= 80 && code <= 82) return { label: 'Rovesci', icon: 'rain' }
  if (code === 85 || code === 86) return { label: 'Rovesci di neve', icon: 'snow' }
  if (code >= 95) return { label: 'Temporale', icon: 'storm' }
  return { label: 'Variabile', icon: 'cloud-sun' }
}

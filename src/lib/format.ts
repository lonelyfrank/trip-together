const euro = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

export function formatMoney(amount: number): string {
  return euro.format(amount)
}

export function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleString('it-IT', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

/** Tempo che manca a `target` (ms epoch), arrotondato al minuto: "1 h 20 min". */
export function formatCountdown(target: number, now: number): string {
  const minutes = Math.round((target - now) / 60_000)
  if (minutes <= 0) return 'adesso'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours < 24) return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
  const days = Math.round(hours / 24)
  return `${days} ${days === 1 ? 'giorno' : 'giorni'}`
}

/** Solo l'ora, "09:30": nelle card compatte il giorno è già nel contesto. */
export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

// datetime-local non porta un fuso: convertiamo esplicitamente in entrambe
// le direzioni per non reinterpretare un'ora UTC come se fosse locale.
export function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

export function fromDatetimeLocal(value: string): string | null {
  return value ? new Date(value).toISOString() : null
}

/**
 * Importo con il simbolo davanti, come nel mockup: "€ 420,00" con
 * `cents: 'always'`, "€ 120" / "€ 12,50" con `cents: 'auto'`.
 */
export function formatEuro(amount: number, cents: 'auto' | 'always' = 'auto'): string {
  const rounded = Math.round(amount * 100) / 100
  const digits = cents === 'always' || !Number.isInteger(rounded) ? 2 : 0
  return `€ ${rounded.toLocaleString('it-IT', { minimumFractionDigits: digits, maximumFractionDigits: 2 })}`
}

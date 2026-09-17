const euro = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

export function formatMoney(amount: number): string {
  return euro.format(amount)
}

export function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleString('it-IT', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
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

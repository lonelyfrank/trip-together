const euro = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

export function formatMoney(amount: number): string {
  return euro.format(amount)
}

export function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleString('it-IT', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

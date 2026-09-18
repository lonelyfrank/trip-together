// Stato puro della coda offline: nessun import di runtime (solo tipi), così
// resta testabile con `node --test` senza risoluzione di moduli aggiuntivi
// (Node ESM non risolve import relativi senza estensione). La logica che
// esegue davvero le mutazioni (registry, toast, listener online) vive in
// offlineQueue.ts, che si appoggia a questo file.

export interface QueueItem {
  id: string
  name: string
  args: unknown[]
  label: string
  attempts: number
}

type Store = Pick<Storage, 'getItem' | 'setItem'>

export function memoryStore(): Store {
  let value: string | null = null
  return {
    getItem: () => value,
    setItem: (_key, v) => {
      value = v
    },
  }
}

export function readQueue(store: Store): QueueItem[] {
  const raw = store.getItem('tt:offline-queue')
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as QueueItem[]).map((item) => ({
      ...item,
      // Le code salvate dalle versioni precedenti non hanno il contatore.
      attempts: Number.isInteger(item.attempts) && item.attempts >= 0 ? item.attempts : 0,
    })) : []
  } catch {
    return []
  }
}

export function writeQueue(items: QueueItem[], store: Store): void {
  store.setItem('tt:offline-queue', JSON.stringify(items))
}

/** Aggiunge un item alla coda, ignorandolo se il suo id è già presente (dedup). */
export function addToQueue(items: QueueItem[], item: QueueItem): QueueItem[] {
  if (items.some((i) => i.id === item.id)) return items
  return [...items, item]
}

export function removeFromQueue(items: QueueItem[], id: string): QueueItem[] {
  return items.filter((i) => i.id !== id)
}

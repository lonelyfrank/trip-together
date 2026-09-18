import { getOpRegistry, type Op } from './mutations/room'
import {
  addToQueue,
  memoryStore,
  readQueue as readQueueFrom,
  writeQueue as writeQueueTo,
  type QueueItem,
} from './offlineQueueStore'
import { showToast } from './toast'
import { queryClient } from './queryClient'
import { drainQueue } from './drainQueue'

// Coda offline persistente: le mutazioni fatte senza connessione vengono
// salvate in localStorage come {name, args} — non il builder Supabase, che
// non è serializzabile — e rieseguite in ordine al ritorno online tramite
// getOpRegistry() (mutations/room.ts). Dedup per op-id: un id già presente
// non viene riaccodato due volte. Gli Op con queueable:false (radar) non
// passano mai di qui: mutate() li lascia fallire subito, coerente col
// vincolo "una posizione mancata va scartata, non accodata".

export type { QueueItem }

const storage = typeof localStorage !== 'undefined' ? localStorage : memoryStore()

function readQueue(): QueueItem[] {
  return readQueueFrom(storage)
}

function writeQueue(items: QueueItem[]): void {
  writeQueueTo(items, storage)
}

const listeners = new Set<() => void>()
function emit() {
  for (const l of listeners) l()
}

export function subscribeQueue(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getQueueSize(): number {
  return readQueue().length
}

export function enqueueOp(op: Op<unknown>, label: string): void {
  const item: QueueItem = { id: crypto.randomUUID(), name: op.name, args: op.args, label, attempts: 0 }
  writeQueue(addToQueue(readQueue(), item))
  emit()
}

let flushing = false

export async function flushQueue(): Promise<void> {
  if (flushing) return
  if (typeof navigator !== 'undefined' && !navigator.onLine) return
  flushing = true
  try {
    const { count, discarded, failed } = await drainQueue(storage, (item) => {
      const factory = getOpRegistry()[item.name]
      return factory ? factory(...item.args).run() : Promise.resolve({ error: { code: 'OP_NOT_FOUND', message: 'Operazione non disponibile' } })
    }, emit, () => typeof navigator === 'undefined' || navigator.onLine)
    if (failed) showToast('Alcune modifiche sono ancora in attesa. Riprova la sincronizzazione.', 'error')
    if (discarded > 0) showToast(`${discarded === 1 ? "Una modifica non salvata è stata persa" : `${discarded} modifiche non salvate sono state perse`}. Ricontrolla i dati dell’evento.`, 'error')
    if (count > 0 || discarded > 0) void queryClient.invalidateQueries({ queryKey: ['room-data'] })
    if (count > 0) showToast(`${count} modifiche sincronizzate.`, 'success')
  } finally {
    flushing = false
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void flushQueue())
  // Attende che tutti i moduli abbiano registrato le proprie operazioni.
  if (navigator.onLine) queueMicrotask(() => void flushQueue())
}

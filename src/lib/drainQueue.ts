import { readQueue, removeFromQueue, writeQueue, type QueueItem } from './offlineQueueStore.ts'

const MAX_ATTEMPTS = 5

function isPermanent(error: unknown, status?: number): boolean {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
  if (status === 408 || status === 429 || (status !== undefined && status >= 500)) return false
  if (/^(08|53)/.test(code) || ['40001', '40P01', '57014', '57P01', 'PGRST000', 'PGRST001', 'PGRST002'].includes(code)) return false
  return (status !== undefined && status >= 400 && status < 500)
    || code === 'OP_NOT_FOUND' || /^PGRST/.test(code) || /^[0-9A-Z]{5}$/.test(code)
}

// Rilegge lo store dopo ogni richiesta: conserva anche gli item aggiunti nel
// frattempo. Una modifica irrecuperabile non blocca quelle successive.
export async function drainQueue(
  store: Pick<Storage, 'getItem' | 'setItem'>,
  run: (item: QueueItem) => PromiseLike<{ error: unknown; status?: number }>,
  onChange: () => void,
  canContinue: () => boolean,
): Promise<{ count: number; discarded: number; failed?: QueueItem }> {
  let count = 0, discarded = 0
  const discard = (item: QueueItem, error: unknown) => {
    console.error(`[coda] Modifica scartata: ${item.label}`, error)
    writeQueue(removeFromQueue(readQueue(store), item.id), store)
    discarded++
    onChange()
  }
  while (canContinue()) {
    const item = readQueue(store)[0]
    if (!item) break
    if (item.attempts >= MAX_ATTEMPTS) { discard(item, 'Tentativi esauriti'); continue }
    const attempted = { ...item, attempts: item.attempts + 1 }
    writeQueue(readQueue(store).map((entry) => entry.id === item.id ? attempted : entry), store)
    let error: unknown, status: number | undefined
    try {
      const result = await run(attempted)
      error = result.error
      status = result.status
    } catch (caught) { error = caught }
    if (error) {
      if (isPermanent(error, status) || attempted.attempts >= MAX_ATTEMPTS) {
        discard(attempted, error)
        continue
      }
      onChange()
      return { count, discarded, failed: attempted }
    }
    writeQueue(removeFromQueue(readQueue(store), item.id), store)
    onChange()
    count++
  }
  return { count, discarded }
}

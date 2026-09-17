import { readQueue, removeFromQueue, writeQueue, type QueueItem } from './offlineQueueStore.ts'

// Rilegge lo store dopo ogni richiesta: nuove operazioni possono essere
// accodate mentre la precedente è ancora in viaggio verso il server.
export async function drainQueue(
  store: Pick<Storage, 'getItem' | 'setItem'>,
  run: (item: QueueItem) => PromiseLike<{ error: unknown }>,
  onChange: () => void,
  canContinue: () => boolean,
): Promise<{ count: number; failed?: QueueItem }> {
  let count = 0
  while (canContinue()) {
    const item = readQueue(store)[0]
    if (!item) break
    try {
      const { error } = await run(item)
      if (error) return { count, failed: item }
    } catch { return { count, failed: item } }
    writeQueue(removeFromQueue(readQueue(store), item.id), store)
    onChange()
    count++
  }
  return { count }
}

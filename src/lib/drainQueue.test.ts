import assert from 'node:assert/strict'
import { test } from 'node:test'
import { drainQueue } from './drainQueue.ts'
import { addToQueue, memoryStore, readQueue, writeQueue, type QueueItem } from './offlineQueueStore.ts'

const item = (id: string): QueueItem => ({ id, name: 'test', args: [], label: id })

test('flush conserva le operazioni aggiunte mentre una richiesta è in corso', async () => {
  const store = memoryStore()
  writeQueue([item('a')], store)
  const sent: string[] = []
  const result = await drainQueue(store, async (entry) => {
    sent.push(entry.id)
    if (entry.id === 'a') {
      await Promise.resolve()
      writeQueue(addToQueue(readQueue(store), item('b')), store)
    }
    return { error: null }
  }, () => {}, () => true)
  assert.deepEqual(sent, ['a', 'b'])
  assert.equal(result.count, 2)
  assert.deepEqual(readQueue(store), [])
})

test('un errore conserva la richiesta fallita e le operazioni successive', async () => {
  const store = memoryStore()
  writeQueue([item('a'), item('b')], store)
  const result = await drainQueue(store, async () => { throw new Error('rete') }, () => {}, () => true)
  assert.equal(result.failed?.id, 'a')
  assert.equal(result.count, 0)
  assert.deepEqual(readQueue(store).map((entry) => entry.id), ['a', 'b'])
})

test('il flush si ferma quando la connessione cade', async () => {
  const store = memoryStore()
  let online = true
  writeQueue([item('a'), item('b')], store)
  const result = await drainQueue(store, async () => { online = false; return { error: null } }, () => {}, () => online)
  assert.equal(result.count, 1)
  assert.deepEqual(readQueue(store).map((entry) => entry.id), ['b'])
})

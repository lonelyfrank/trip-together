import assert from 'node:assert/strict'
import { test } from 'node:test'
import { drainQueue } from './drainQueue.ts'
import { addToQueue, memoryStore, readQueue, writeQueue, type QueueItem } from './offlineQueueStore.ts'

const item = (id: string): QueueItem => ({ id, name: 'test', args: [], label: id, attempts: 0 })

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
  const result = await drainQueue(store, () => Promise.reject(new Error('rete')), () => {}, () => true)
  assert.equal(result.failed?.id, 'a')
  assert.equal(result.count, 0)
  assert.deepEqual(readQueue(store).map((entry) => entry.id), ['a', 'b'])
})

test('il flush si ferma quando la connessione cade', async () => {
  const store = memoryStore()
  let online = true
  writeQueue([item('a'), item('b')], store)
  const result = await drainQueue(store, () => { online = false; return Promise.resolve({ error: null }) }, () => {}, () => online)
  assert.equal(result.count, 1)
  assert.deepEqual(readQueue(store).map((entry) => entry.id), ['b'])
})

test('un errore permanente scarta la richiesta e lascia avanzare la coda', async () => {
  const store = memoryStore()
  writeQueue([item('a'), item('b')], store)
  const result = await drainQueue(store, (entry) => Promise.resolve({ error: entry.id === 'a' ? { code: '23514' } : null }), () => {}, () => true)
  assert.equal(result.discarded, 1)
  assert.equal(result.count, 1)
  assert.deepEqual(readQueue(store), [])
})

test('HTTP 503 mantiene la richiesta e incrementa i tentativi', async () => {
  const store = memoryStore()
  writeQueue([item('a')], store)
  const result = await drainQueue(store, () => Promise.resolve({ error: { message: 'Non disponibile' }, status: 503 }), () => {}, () => true)
  assert.equal(result.discarded, 0)
  assert.equal(result.failed?.attempts, 1)
  assert.equal(readQueue(store)[0].attempts, 1)
})

test('il quinto tentativo fallito scarta la richiesta e prosegue', async () => {
  const store = memoryStore()
  writeQueue([{ ...item('a'), attempts: 4 }, item('b')], store)
  const result = await drainQueue(store, (entry) => Promise.resolve({ error: entry.id === 'a' ? new Error('rete') : null }), () => {}, () => true)
  assert.equal(result.discarded, 1)
  assert.equal(result.count, 1)
  assert.deepEqual(readQueue(store), [])
})

test('operazione rimossa dal registry e tentativi già esauriti non bloccano la coda', async () => {
  const store = memoryStore(), sent: string[] = []
  writeQueue([{ ...item('a'), attempts: 5 }, item('b'), item('c')], store)
  const result = await drainQueue(store, (entry) => { sent.push(entry.id); return Promise.resolve({ error: entry.id === 'b' ? { code: 'OP_NOT_FOUND' } : null }) }, () => {}, () => true)
  assert.deepEqual(sent, ['b', 'c'])
  assert.equal(result.discarded, 2)
  assert.equal(result.count, 1)
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addToQueue, readQueue, removeFromQueue, type QueueItem } from './offlineQueueStore.ts'

const item = (id: string): QueueItem => ({ id, name: 'board_notes.insert', args: [id], label: 'nota' })

test('addToQueue: aggiunge un item nuovo in coda', () => {
  const queue = addToQueue([], item('a'))
  assert.deepEqual(queue, [item('a')])
})

test('addToQueue: dedup — stesso id non viene riaccodato', () => {
  const queue = addToQueue([item('a')], item('a'))
  assert.equal(queue.length, 1)
})

test('addToQueue: preserva l\'ordine di accodamento', () => {
  const queue = addToQueue(addToQueue([], item('a')), item('b'))
  assert.deepEqual(queue.map((i) => i.id), ['a', 'b'])
})

test('removeFromQueue: rimuove solo l\'item con quell\'id', () => {
  const queue = removeFromQueue([item('a'), item('b'), item('c')], 'b')
  assert.deepEqual(queue.map((i) => i.id), ['a', 'c'])
})

test('removeFromQueue: id assente → coda invariata', () => {
  const queue = [item('a'), item('b')]
  assert.deepEqual(removeFromQueue(queue, 'z'), queue)
})

test('readQueue: store vuoto → []', () => {
  const store = { getItem: () => null, setItem: () => {} }
  assert.deepEqual(readQueue(store), [])
})

test('readQueue: JSON valido → array parsato', () => {
  const raw = JSON.stringify([item('a')])
  const store = { getItem: () => raw, setItem: () => {} }
  assert.deepEqual(readQueue(store), [item('a')])
})

test('readQueue: JSON corrotto → [] invece di lanciare', () => {
  const store = { getItem: () => '{not json', setItem: () => {} }
  assert.deepEqual(readQueue(store), [])
})

test('readQueue: JSON valido ma non un array → []', () => {
  const store = { getItem: () => JSON.stringify({ a: 1 }), setItem: () => {} }
  assert.deepEqual(readQueue(store), [])
})

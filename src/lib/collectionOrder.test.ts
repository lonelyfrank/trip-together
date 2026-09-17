import assert from 'node:assert/strict'
import { test } from 'node:test'
import { compareRows, orderCollection } from './collectionOrder.ts'

test('ordine: inserimento realtime in ritardo e refetch hanno lo stesso ordine', () => {
  const original = [
    { id: 'c', created_at: '2026-07-15T10:00:00.002000+00:00' },
    { id: 'a', created_at: '2026-07-15T10:00:00.001900+00:00' },
  ]
  const incoming = { id: 'b', created_at: '2026-07-15T10:00:00.001100Z' }
  assert.deepEqual(orderCollection('board_notes', [...original, incoming]).map((r) => r.id), ['b', 'a', 'c'])
  assert.deepEqual(original.map((r) => r.id), ['c', 'a'])
})

test('ordine: timestamp equivalenti, spareggio id e null in fondo come SQL', () => {
  assert.equal(compareRows({ created_at: '2026-07-15T12:00:00+02:00' }, { created_at: '2026-07-15T10:00:00Z' }, ['created_at']), 0)
  assert.deepEqual(orderCollection('board_notes', [
    { id: 'b', created_at: '2026-07-15T10:00:00Z' }, { id: 'a', created_at: '2026-07-15T10:00:00Z' }, { id: '0', created_at: null },
  ]).map((r) => r.id), ['a', 'b', '0'])
})

test('ordine: le tabelle ponte usano la propria chiave e non la data', () => {
  assert.deepEqual(orderCollection('stop_proposal_votes', [
    { proposal_id: 'b', member_id: 'a' }, { proposal_id: 'a', member_id: 'b' }, { proposal_id: 'a', member_id: 'a' },
  ]), [{ proposal_id: 'a', member_id: 'a' }, { proposal_id: 'a', member_id: 'b' }, { proposal_id: 'b', member_id: 'a' }])
})

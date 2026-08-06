import assert from 'node:assert/strict'
import { test } from 'node:test'
import { roomPhase } from './phase.ts'

test('roomPhase: stanza chiusa → concluso, anche con auto ferme', () => {
  assert.equal(roomPhase('closed', ['non_partita']), 'concluso')
})

test('roomPhase: stanza chiusa → concluso, anche con auto in viaggio', () => {
  assert.equal(roomPhase('closed', ['in_viaggio']), 'concluso')
})

test('roomPhase: stanza aperta, nessuna auto → pre', () => {
  assert.equal(roomPhase('open', []), 'pre')
})

test('roomPhase: stanza aperta, tutte le auto non partite → pre', () => {
  assert.equal(roomPhase('open', ['non_partita', 'non_partita']), 'pre')
})

test('roomPhase: stanza aperta, una sola auto partita → in_corso', () => {
  assert.equal(roomPhase('open', ['non_partita', 'in_partenza']), 'in_corso')
})

test('roomPhase: stanza aperta, auto arrivata → in_corso', () => {
  assert.equal(roomPhase('open', ['arrivata']), 'in_corso')
})

test('roomPhase: stanza aperta, auto ferma per ritardo → in_corso', () => {
  assert.equal(roomPhase('open', ['fermo']), 'in_corso')
})

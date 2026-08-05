import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readinessWindow } from './readiness.ts'

const now = Date.UTC(2026, 0, 1, 12, 0, 0)
const inHours = (h: number) => new Date(now + h * 3600_000).toISOString()

test('readinessWindow: nessuna data → none', () => {
  assert.equal(readinessWindow(null, now), 'none')
})

test('readinessWindow: evento tra 1 ora → t2', () => {
  assert.equal(readinessWindow(inHours(1), now), 't2')
})

test('readinessWindow: evento tra 10 ore → t24', () => {
  assert.equal(readinessWindow(inHours(10), now), 't24')
})

test('readinessWindow: evento tra 30 ore → none', () => {
  assert.equal(readinessWindow(inHours(30), now), 'none')
})

test('readinessWindow: evento già passato → none', () => {
  assert.equal(readinessWindow(inHours(-1), now), 'none')
})

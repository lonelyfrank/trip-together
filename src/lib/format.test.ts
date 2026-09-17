import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fromDatetimeLocal, toDatetimeLocal } from './format.ts'

test('datetime-local: ora italiana e round-trip UTC in inverno e in estate', () => {
  const previousTZ = process.env.TZ
  process.env.TZ = 'Europe/Rome'
  try {
    for (const [iso, local] of [
      ['2026-01-15T09:30:00.000Z', '2026-01-15T10:30'],
      ['2026-07-15T08:30:00.000Z', '2026-07-15T10:30'],
      ['2026-07-15T23:30:00.000Z', '2026-07-16T01:30'],
    ]) {
      assert.equal(toDatetimeLocal(iso), local)
      assert.equal(fromDatetimeLocal(toDatetimeLocal(iso)), iso)
      assert.equal(toDatetimeLocal(fromDatetimeLocal(local)), local)
    }
  } finally {
    if (previousTZ === undefined) delete process.env.TZ
    else process.env.TZ = previousTZ
  }
})

test('datetime-local: il campo vuoto rimuove la data', () => {
  assert.equal(fromDatetimeLocal(''), null)
  assert.equal(toDatetimeLocal(null), '')
  assert.equal(toDatetimeLocal(''), '')
})

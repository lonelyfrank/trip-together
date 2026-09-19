import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatCountdown, formatEuro, fromDatetimeLocal, toDatetimeLocal } from './format.ts'

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

test('countdown: minuti, ore e giorni, mai negativo', () => {
  const now = Date.parse('2026-04-24T08:00:00Z')
  const at = (minutes: number) => now + minutes * 60_000
  assert.equal(formatCountdown(at(-5), now), 'adesso')
  assert.equal(formatCountdown(at(45), now), '45 min')
  assert.equal(formatCountdown(at(120), now), '2 h')
  assert.equal(formatCountdown(at(80), now), '1 h 20 min')
  assert.equal(formatCountdown(at(60 * 30), now), '1 giorno')
  assert.equal(formatCountdown(at(60 * 24 * 3), now), '3 giorni')
})

test('formatEuro: simbolo davanti, centesimi solo quando servono', () => {
  assert.equal(formatEuro(120), '€ 120')
  assert.equal(formatEuro(12.5), '€ 12,50')
  assert.equal(formatEuro(420, 'always'), '€ 420,00')
  assert.equal(formatEuro(12345.5), '€ 12.345,50')
})

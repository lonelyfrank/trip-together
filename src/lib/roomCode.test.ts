import assert from 'node:assert/strict'
import { test } from 'node:test'
import { generateRoomCode } from './roomCode.ts'

test('codici casuali a sette caratteri, con supporto alla lunghezza precedente', () => {
  for (let i = 0; i < 50; i++) assert.match(generateRoomCode(), /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{7}$/)
  assert.equal(generateRoomCode(5).length, 5)
  assert.throws(() => generateRoomCode(0))
})

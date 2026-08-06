import assert from 'node:assert/strict'
import { test } from 'node:test'
import { decodeResumeToken, encodeResumeToken } from './resumeToken.ts'

const payload = { roomId: 'a1b2c3', memberId: 'm-9', inviteCode: 'ABCD12' }

test('encode → decode ritorna lo stesso payload', () => {
  assert.deepEqual(decodeResumeToken(encodeResumeToken(payload)), payload)
})

test('il token è url-safe (nessun +, / o =)', () => {
  const token = encodeResumeToken(payload)
  assert.equal(/[+/=]/.test(token), false)
})

test('token non valido (garbage) → null', () => {
  assert.equal(decodeResumeToken('non-e-un-token-valido!!!'), null)
})

test('token valido in base64 ma senza i campi attesi → null', () => {
  const token = btoa(JSON.stringify({ foo: 'bar' }))
  assert.equal(decodeResumeToken(token), null)
})

test('stringa vuota → null', () => {
  assert.equal(decodeResumeToken(''), null)
})

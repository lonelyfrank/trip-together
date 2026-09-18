import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isPollOpen, sortPolls, tallyPoll } from './polls.ts'
import type { RoomPoll, RoomPollOption, RoomPollVote } from '../types'

const created_at = '2026-09-18T10:00:00.000Z'
const now = Date.parse('2026-09-18T12:00:00.000Z')

const poll: RoomPoll = {
  id: 'p1', room_id: 'r1', question: 'Dove si cena?', closes_at: null,
  created_by: 'm1', created_at,
}

const options: RoomPollOption[] = [
  { id: 'o1', poll_id: 'p1', room_id: 'r1', label: 'Sul mare', created_at },
  { id: 'o2', poll_id: 'p1', room_id: 'r1', label: 'Trattoria', created_at },
  // Opzione di un altro sondaggio: non deve entrare nello spoglio.
  { id: 'o9', poll_id: 'p2', room_id: 'r1', label: 'Altro sondaggio', created_at },
]

function vote(memberId: string, optionId: string, pollId = 'p1'): RoomPollVote {
  return { poll_id: pollId, option_id: optionId, member_id: memberId, room_id: 'r1', voted_at: created_at }
}

test('sondaggio: le quote si calcolano sui voti espressi, non sui membri', () => {
  const tally = tallyPoll(poll, options, [vote('m1', 'o1'), vote('m2', 'o1'), vote('m3', 'o2')], 6, 'm3', now)

  assert.equal(tally.options.length, 2, 'le opzioni di altri sondaggi restano fuori')
  assert.equal(tally.totalVotes, 3)
  assert.equal(tally.missingVotes, 3)
  assert.equal(tally.myOptionId, 'o2')
  assert.equal(tally.options[0].votes, 2)
  assert.equal(Math.round(tally.options[0].fraction * 100), 67)
  assert.equal(tally.options[0].leading, true)
  assert.equal(tally.options[1].leading, false)
})

test('sondaggio: in parità nessuna opzione è in testa da sola', () => {
  const tally = tallyPoll(poll, options, [vote('m1', 'o1'), vote('m2', 'o2')], 2, 'm1', now)
  assert.deepEqual(tally.options.map((o) => o.leading), [true, true])
})

test('sondaggio: senza voti nessuna opzione è in testa e le quote sono zero', () => {
  const tally = tallyPoll(poll, options, [], 4, 'm1', now)
  assert.deepEqual(tally.options.map((o) => o.leading), [false, false])
  assert.deepEqual(tally.options.map((o) => o.fraction), [0, 0])
  assert.equal(tally.myOptionId, null)
})

test('sondaggio: chi entra dopo non rende negativi i voti mancanti', () => {
  const tally = tallyPoll(poll, options, [vote('m1', 'o1'), vote('m2', 'o2')], 1, 'm1', now)
  assert.equal(tally.missingVotes, 0)
})

test('sondaggio: aperto finché la scadenza è nulla o futura', () => {
  assert.equal(isPollOpen(poll, now), true)
  assert.equal(isPollOpen({ ...poll, closes_at: '2026-09-18T18:00:00.000Z' }, now), true)
  assert.equal(isPollOpen({ ...poll, closes_at: '2026-09-18T11:59:59.000Z' }, now), false)
  assert.equal(tallyPoll({ ...poll, closes_at: created_at }, options, [], 3, 'm1', now).open, false)
})

test('sondaggio: prima quelli aperti, poi i chiusi dal più recente', () => {
  const chiusoVecchio = { ...poll, id: 'p-old', closes_at: created_at, created_at: '2026-09-17T10:00:00.000Z' }
  const chiusoRecente = { ...poll, id: 'p-new', closes_at: created_at, created_at: '2026-09-18T09:00:00.000Z' }
  const aperto = { ...poll, id: 'p-open', created_at: '2026-09-10T10:00:00.000Z' }

  assert.deepEqual(
    sortPolls([chiusoVecchio, chiusoRecente, aperto], now).map((p) => p.id),
    ['p-open', 'p-new', 'p-old'],
  )
})

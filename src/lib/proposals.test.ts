import assert from 'node:assert/strict'
import { test } from 'node:test'
import { computeOutcome, isProposalVisible, PROPOSAL_RETENTION_MS } from './proposals.ts'
import type { StopProposal, StopProposalVote } from '../types'

const future = new Date(Date.now() + 10 * 60_000).toISOString()
const past = new Date(Date.now() - 60_000).toISOString()

function proposal(expires: string): StopProposal {
  return {
    id: 'p1',
    room_id: 'r1',
    car_id: null,
    proposed_by: 'm1',
    type: 'benzina',
    note: null,
    created_at: new Date(Date.now() - 60_000).toISOString(),
    expires_at: expires,
  }
}

const vote = (member: string, v: 'yes' | 'no'): StopProposalVote => ({
  proposal_id: 'p1',
  member_id: member,
  vote: v,
  voted_at: new Date().toISOString(),
})

test('computeOutcome: maggioranza sì → accepted', () => {
  assert.equal(computeOutcome(proposal(future), [vote('a', 'yes'), vote('b', 'yes')], 3), 'accepted')
})

test('computeOutcome: maggioranza no → rejected', () => {
  assert.equal(computeOutcome(proposal(future), [vote('a', 'no'), vote('b', 'no')], 3), 'rejected')
})

test('computeOutcome: pochi voti + non scaduta → pending', () => {
  assert.equal(computeOutcome(proposal(future), [vote('a', 'yes')], 4), 'pending')
})

test('computeOutcome: scaduta senza maggioranza → expired', () => {
  assert.equal(computeOutcome(proposal(past), [vote('a', 'yes')], 4), 'expired')
})

test('una sosta conclusa sparisce dopo 15 minuti dalla scadenza', () => {
  const p = proposal(past), end = Date.parse(p.expires_at) + PROPOSAL_RETENTION_MS
  assert.equal(isProposalVisible(p, [], 3, end - 1), true)
  assert.equal(isProposalVisible(p, [], 3, end), false)
  assert.equal(isProposalVisible(p, [vote('a', 'yes'), vote('b', 'yes')], 3, end), false)
})

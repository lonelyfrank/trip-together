import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createOptimisticRollback } from './optimisticRollback.ts'

test('rollback conserva nuove righe, altre collezioni e altri campi aggiornati dal realtime', () => {
  const before = { boardNotes: [{ id: 'a', pinned: false, text: 'Prima' }], members: [{ id: 'm', confirmed: false }] }
  const applied = { ...before, boardNotes: [{ ...before.boardNotes[0], pinned: true }] }
  const current = { boardNotes: [{ id: 'a', pinned: true, text: 'Da altro device' }, { id: 'b', pinned: true, text: 'Nuova' }], members: [{ id: 'm', confirmed: true }] }
  const reverted = createOptimisticRollback(before, applied)(current)
  assert.deepEqual(reverted.boardNotes, [{ id: 'a', pinned: false, text: 'Da altro device' }, { id: 'b', pinned: true, text: 'Nuova' }])
  assert.deepEqual(reverted.members, current.members)
  assert.equal(current.boardNotes[0].pinned, true)
})

test('rollback cancellazione ripristina solo la riga tolta', () => {
  const a = { id: 'a' }, b = { id: 'b' }, c = { id: 'c' }
  const revert = createOptimisticRollback({ cars: [a, b] }, { cars: [b] })
  assert.deepEqual(revert({ cars: [b, c] }), { cars: [a, b, c] })
})

test('rollback non annulla un valore successivo né risuscita una riga aggiornata poi cancellata', () => {
  const before = { cars: [{ id: 'a', travel_status: 'non_partita' }] }
  const applied = { cars: [{ id: 'a', travel_status: 'in_viaggio' }] }
  const revert = createOptimisticRollback(before, applied)
  assert.deepEqual(revert({ cars: [{ id: 'a', travel_status: 'arrivata' }] }), { cars: [{ id: 'a', travel_status: 'arrivata' }] })
  assert.deepEqual(revert({ cars: [] }), { cars: [] })
})

test('rollback voto usa la chiave composta e conserva gli altri voti', () => {
  const before = { stopProposalVotes: [{ proposal_id: 'p', member_id: 'a', vote: 'no' }] }
  const applied = { stopProposalVotes: [{ proposal_id: 'p', member_id: 'a', vote: 'yes' }] }
  const other = { proposal_id: 'p', member_id: 'b', vote: 'yes' }
  assert.deepEqual(createOptimisticRollback(before, applied)({ stopProposalVotes: [...applied.stopProposalVotes, other] }).stopProposalVotes, [...before.stopProposalVotes, other])
})

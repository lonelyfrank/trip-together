import assert from 'node:assert/strict'
import { test } from 'node:test'
import { computeBalances, computeTransfers } from './balances.ts'
import type { Car, GeneralExpense } from '../types'

const created_at = '2026-07-15T10:00:00Z'
const expense: GeneralExpense = {
  id: 'e', room_id: 'r', label: 'Cena', amount: 60, paid_by_member_id: 'a',
  waived: false, waived_by_member_id: null, created_at,
}

test('saldi: un partecipante duplicato paga una sola quota', () => {
  const balances = computeBalances({ cars: [], carPassengers: [], carExpenses: [],
    generalExpenses: [expense], generalExpenseParticipants: [
      { id: '1', expense_id: 'e', member_id: 'a' },
      { id: '2', expense_id: 'e', member_id: 'b' },
      { id: '3', expense_id: 'e', member_id: 'b' },
    ],
  })
  assert.deepEqual(balances, [{ memberId: 'a', net: 30 }, { memberId: 'b', net: -30 }])
  assert.deepEqual(computeTransfers(balances), [{ fromMemberId: 'b', toMemberId: 'a', amount: 30 }])
})

test('saldi auto: il conducente anche passeggero è contato una sola volta', () => {
  const car: Car = { id: 'c', room_id: 'r', driver_member_id: 'a', seats_total: 4,
    travel_status: 'non_partita', travel_status_updated_at: created_at, travel_status_updated_by: null, created_at }
  const balances = computeBalances({ cars: [car], carPassengers: [
    { id: '1', car_id: 'c', member_id: 'a' }, { id: '2', car_id: 'c', member_id: 'b' },
  ], carExpenses: [{ id: 'e', car_id: 'c', label: 'Benzina', amount: 40, paid_by_member_id: 'a', created_at }],
  generalExpenses: [], generalExpenseParticipants: [] })
  assert.deepEqual(balances, [{ memberId: 'a', net: 20 }, { memberId: 'b', net: -20 }])
})

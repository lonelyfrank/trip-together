import assert from 'node:assert/strict'
import test from 'node:test'
import { computePayments } from './payments.ts'

const members = [
  { id: 'm1', display_name: 'Chiara' },
  { id: 'm2', display_name: 'Marco' },
  { id: 'm3', display_name: 'Matteo' },
] as never[]

const base = {
  members,
  cars: [],
  carPassengers: [],
  carExpenses: [],
  generalExpenses: [],
  generalExpenseParticipants: [],
  settlements: [],
} as never

function spesa(id: string, amount: number, paidBy: string) {
  return {
    id,
    room_id: 'r1',
    label: `spesa ${id}`,
    amount,
    paid_by_member_id: paidBy,
    waived: false,
    waived_by_member_id: null,
    created_at: '2026-09-18T10:00:00.000Z',
  } as never
}

function quote(expenseId: string, memberIds: string[]) {
  return memberIds.map((memberId) => ({
    id: `${expenseId}-${memberId}`,
    expense_id: expenseId,
    member_id: memberId,
    room_id: 'r1',
  })) as never[]
}

test('pagamenti: totali, quota a persona e debito aperto', () => {
  const summary = computePayments({
    ...(base as object),
    generalExpenses: [spesa('e1', 90, 'm1')],
    generalExpenseParticipants: quote('e1', ['m1', 'm2', 'm3']),
  } as never)

  assert.equal(summary.total, 90)
  assert.equal(summary.perPerson, 30)
  // Chiara ha anticipato 90 e ne deve ricevere 60: restano 60 da far girare.
  assert.equal(summary.outstanding, 60)
  assert.equal(summary.settledAmount, 30)

  const chiara = summary.rows.find((r) => r.memberId === 'm1')!
  assert.equal(chiara.paid, 90)
  assert.equal(chiara.net, 60)
  assert.equal(chiara.settled, false)
})

test('pagamenti: chi non deve niente risulta a posto, anche senza aver anticipato', () => {
  // Matteo non partecipa alla spesa: il suo saldo è zero, non un debito.
  const summary = computePayments({
    ...(base as object),
    generalExpenses: [spesa('e1', 20, 'm1')],
    generalExpenseParticipants: quote('e1', ['m1', 'm2']),
  } as never)

  const matteo = summary.rows.find((r) => r.memberId === 'm3')!
  assert.equal(matteo.paid, 0)
  assert.equal(matteo.net, 0)
  assert.equal(matteo.settled, true, 'un saldo a zero non è un debito')

  const marco = summary.rows.find((r) => r.memberId === 'm2')!
  assert.equal(marco.net, -10)
  assert.equal(marco.settled, false)
})

test('pagamenti: una spesa condonata non entra nei totali', () => {
  const condonata = { ...(spesa('e2', 50, 'm2') as object), waived: true, waived_by_member_id: 'm2' }
  const summary = computePayments({
    ...(base as object),
    generalExpenses: [spesa('e1', 30, 'm1'), condonata],
    generalExpenseParticipants: [...quote('e1', ['m1', 'm2', 'm3']), ...quote('e2', ['m1', 'm3'])],
  } as never)

  assert.equal(summary.total, 30)
  assert.equal(summary.rows.find((r) => r.memberId === 'm2')!.paid, 0)
})

test('pagamenti: senza membri non si divide per zero', () => {
  const summary = computePayments({ ...(base as object), members: [] } as never)
  assert.equal(summary.perPerson, 0)
  assert.deepEqual(summary.rows, [])
})

test('pagamenti: un rimborso registrato sposta il saldo, non il totale speso', () => {
  const rimborso = {
    id: 's1', room_id: 'r1', from_member_id: 'm2', to_member_id: 'm1', amount: 30,
    note: null, recorded_by: 'm1', settled_at: '2026-09-18T12:00:00.000Z',
    created_at: '2026-09-18T12:00:00.000Z',
  }
  const summary = computePayments({
    ...(base as object),
    generalExpenses: [spesa('e1', 90, 'm1')],
    generalExpenseParticipants: quote('e1', ['m1', 'm2', 'm3']),
    settlements: [rimborso],
  } as never)

  // Restituire dei soldi non rende il viaggio più caro.
  assert.equal(summary.total, 90)
  assert.equal(summary.perPerson, 30)

  const marco = summary.rows.find((r) => r.memberId === 'm2')!
  assert.equal(marco.net, 0)
  assert.equal(marco.settled, true)
  // Resta aperto solo il debito di Matteo.
  assert.equal(summary.outstanding, 30)
  assert.equal(summary.rows.find((r) => r.memberId === 'm1')!.paid, 90, 'il rimborso non è un anticipo')
})

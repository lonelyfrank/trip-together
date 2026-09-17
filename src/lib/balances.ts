import type { CarExpense, CarPassenger, Car, GeneralExpense, GeneralExpenseParticipant } from '../types'

export interface Balance {
  memberId: string
  net: number // positivo = deve ricevere, negativo = deve dare
}

export interface Transfer {
  fromMemberId: string
  toMemberId: string
  amount: number
}

const EPSILON = 0.01

interface ComputeBalancesInput {
  cars: Car[]
  carPassengers: CarPassenger[]
  carExpenses: CarExpense[]
  generalExpenses: GeneralExpense[]
  generalExpenseParticipants: GeneralExpenseParticipant[]
}

export function computeBalances({
  cars,
  carPassengers,
  carExpenses,
  generalExpenses,
  generalExpenseParticipants,
}: ComputeBalancesInput): Balance[] {
  const net = new Map<string, number>()
  const add = (memberId: string, amount: number) => net.set(memberId, (net.get(memberId) ?? 0) + amount)

  for (const expense of carExpenses) {
    const car = cars.find((c) => c.id === expense.car_id)
    if (!car) continue
    const participantIds = [...new Set([
      car.driver_member_id,
      ...carPassengers.filter((cp) => cp.car_id === car.id).map((cp) => cp.member_id),
    ])]
    if (participantIds.length === 0) continue
    const share = expense.amount / participantIds.length
    for (const id of participantIds) add(id, -share)
    if (expense.paid_by_member_id) add(expense.paid_by_member_id, expense.amount)
  }

  for (const expense of generalExpenses) {
    if (expense.waived) continue
    const participantIds = [...new Set(generalExpenseParticipants
      .filter((p) => p.expense_id === expense.id)
      .map((p) => p.member_id))]
    if (participantIds.length === 0) continue
    const share = expense.amount / participantIds.length
    for (const id of participantIds) add(id, -share)
    if (expense.paid_by_member_id) add(expense.paid_by_member_id, expense.amount)
  }

  return Array.from(net.entries())
    .map(([memberId, value]) => ({ memberId, net: Math.round(value * 100) / 100 }))
    .filter((b) => Math.abs(b.net) > EPSILON)
}

export function computeTransfers(balances: Balance[]): Transfer[] {
  const debtors = balances.filter((b) => b.net < -EPSILON).map((b) => ({ ...b })).sort((a, b) => a.net - b.net)
  const creditors = balances.filter((b) => b.net > EPSILON).map((b) => ({ ...b })).sort((a, b) => b.net - a.net)

  const transfers: Transfer[] = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]
    const creditor = creditors[j]
    const amount = Math.min(-debtor.net, creditor.net)

    transfers.push({ fromMemberId: debtor.memberId, toMemberId: creditor.memberId, amount: Math.round(amount * 100) / 100 })

    debtor.net += amount
    creditor.net -= amount
    if (Math.abs(debtor.net) < EPSILON) i++
    if (Math.abs(creditor.net) < EPSILON) j++
  }

  return transfers
}

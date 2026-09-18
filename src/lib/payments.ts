import type {
  Car,
  CarExpense,
  CarPassenger,
  ExpenseSettlement,
  GeneralExpense,
  GeneralExpenseParticipant,
  Member,
} from '../types'
import { computeBalances } from './balances.ts'

// Card "Spese condivise" + "Chi ha pagato" dei mockup. Il netting vive già in
// balances.ts: qui si aggiunge solo la lettura per persona (quanto ha
// anticipato, quanto gli spetta) e i totali della barra di avanzamento.
//
// Nei mockup un partecipante con 0,00 € era marcato "Deve ancora": qui un
// saldo chiuso è `settled`, indipendentemente dal fatto che abbia anticipato
// qualcosa o no. Chi non deve niente non viene sollecitato.
//
// I rimborsi registrati entrano nei saldi (computeBalances), non nel totale
// speso: restituire dei soldi non rende il viaggio più caro, chiude un debito.

const EPSILON = 0.01

export interface PaymentRow {
  memberId: string
  displayName: string
  /** Quanto ha anticipato per il gruppo. */
  paid: number
  /** Positivo = deve ricevere, negativo = deve dare. */
  net: number
  settled: boolean
}

export interface PaymentsSummary {
  total: number
  perPerson: number
  /** Quota già coperta dagli anticipi correttamente distribuiti. */
  settledAmount: number
  outstanding: number
  rows: PaymentRow[]
}

interface PaymentsInput {
  members: Member[]
  cars: Car[]
  carPassengers: CarPassenger[]
  carExpenses: CarExpense[]
  generalExpenses: GeneralExpense[]
  generalExpenseParticipants: GeneralExpenseParticipant[]
  settlements: ExpenseSettlement[]
}

const round = (value: number) => Math.round(value * 100) / 100

export function computePayments(input: PaymentsInput): PaymentsSummary {
  const { members, carExpenses, generalExpenses } = input
  const balances = computeBalances(input)

  const total = round(
    carExpenses.reduce((sum, e) => sum + e.amount, 0) +
      generalExpenses.filter((e) => !e.waived).reduce((sum, e) => sum + e.amount, 0),
  )

  const paidBy = new Map<string, number>()
  const add = (memberId: string | null, amount: number) => {
    if (!memberId) return
    paidBy.set(memberId, (paidBy.get(memberId) ?? 0) + amount)
  }
  for (const expense of carExpenses) add(expense.paid_by_member_id, expense.amount)
  for (const expense of generalExpenses) {
    if (!expense.waived) add(expense.paid_by_member_id, expense.amount)
  }

  const rows: PaymentRow[] = members.map((member) => {
    const net = balances.find((b) => b.memberId === member.id)?.net ?? 0
    return {
      memberId: member.id,
      displayName: member.display_name,
      paid: round(paidBy.get(member.id) ?? 0),
      net: round(net),
      settled: Math.abs(net) <= EPSILON,
    }
  })

  // "Da saldare" è la somma dei debiti aperti, non del totale speso: è quello
  // che deve ancora cambiare mano perché i conti tornino.
  const outstanding = round(
    rows.filter((row) => row.net < -EPSILON).reduce((sum, row) => sum - row.net, 0),
  )

  return {
    total,
    perPerson: members.length > 0 ? round(total / members.length) : 0,
    settledAmount: round(Math.max(total - outstanding, 0)),
    outstanding,
    rows,
  }
}

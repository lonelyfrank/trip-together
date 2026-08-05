import { AlertTriangle, Plus } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Chip from '../ui/Chip'
import { useRoomOptimistic } from '../../hooks/useRoomOptimistic'
import { computeBalances, computeTransfers } from '../../lib/balances'
import { mutateNotify } from '../../lib/db'
import {
  insertGeneralExpense,
  insertGeneralExpenseParticipants,
  waiveGeneralExpense,
} from '../../lib/mutations'
import type { Car, CarExpense, CarPassenger, GeneralExpense, GeneralExpenseParticipant, Member } from '../../types'

interface SpeseTabProps {
  roomId: string
  currentMember: Member
  members: Member[]
  cars: Car[]
  carPassengers: CarPassenger[]
  carExpenses: CarExpense[]
  generalExpenses: GeneralExpense[]
  generalExpenseParticipants: GeneralExpenseParticipant[]
}

export default function SpeseTab({
  roomId,
  currentMember,
  members,
  cars,
  carPassengers,
  carExpenses,
  generalExpenses,
  generalExpenseParticipants,
}: SpeseTabProps) {
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(currentMember.id)
  const [participantIds, setParticipantIds] = useState<string[]>(members.map((m) => m.id))
  const [saving, setSaving] = useState(false)
  const optimistic = useRoomOptimistic(roomId)

  const memberById = (id: string) => members.find((m) => m.id === id)
  const isCreator = currentMember.role === 'creator'

  const balances = computeBalances({ cars, carPassengers, carExpenses, generalExpenses, generalExpenseParticipants })
  const transfers = computeTransfers(balances)
  const hasOpenBalance = transfers.length > 0

  const carTotal = carExpenses.reduce((s, e) => s + e.amount, 0)
  const generalTotal = generalExpenses.filter((e) => !e.waived).reduce((s, e) => s + e.amount, 0)

  function toggleParticipant(id: string) {
    setParticipantIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }

  function waiveExpense(expenseId: string) {
    optimistic(
      'general_expenses.waive',
      (prev) => ({
        ...prev,
        generalExpenses: prev.generalExpenses.map((e) =>
          e.id === expenseId ? { ...e, waived: true, waived_by_member_id: currentMember.id } : e,
        ),
      }),
      () => waiveGeneralExpense(expenseId, currentMember.id),
      'Condono non salvato.',
    )
  }

  async function addExpense(e: FormEvent) {
    e.preventDefault()
    const value = Number(amount)
    if (!label.trim() || !value || participantIds.length === 0) return
    setSaving(true)
    try {
      const { data: expense, error } = await mutateNotify<{ id: string }>(
        'general_expenses.insert',
        insertGeneralExpense(roomId, label, value, paidBy),
        'Spesa non salvata.',
      )
      if (error || !expense) return

      await mutateNotify(
        'general_expense_participants.insert',
        insertGeneralExpenseParticipants(expense.id, participantIds),
        'Partecipanti spesa non salvati.',
      )

      setLabel('')
      setAmount('')
      setParticipantIds(members.map((m) => m.id))
      setAdding(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3 px-4 pb-28 sm:px-6">
      <Card tone="highlight" className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Totale evento</p>
          <p className="mt-1 font-serif text-[28px] leading-none text-cream">
            €{(carTotal + generalTotal).toFixed(0)}
          </p>
        </div>
        {hasOpenBalance && <Chip tone="alert">{transfers.length} saldi aperti</Chip>}
      </Card>

      {cars.length > 0 && (
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Per auto</p>
          <div className="space-y-2">
            {cars.map((c) => {
              const total = carExpenses.filter((e) => e.car_id === c.id).reduce((s, e) => s + e.amount, 0)
              return (
                <div key={c.id} className="flex items-center justify-between rounded-xl bg-surface/60 px-3.5 py-2.5">
                  <span className="text-[12.5px] text-cream">Auto di {memberById(c.driver_member_id)?.display_name}</span>
                  <span className="font-mono text-[12.5px] text-cream">€{total}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Liste generali</p>
        <div className="space-y-2">
          {generalExpenses.map((e) => {
            const participants = generalExpenseParticipants.filter((p) => p.expense_id === e.id)
            return (
              <div key={e.id} className={`rounded-xl px-3.5 py-2.5 ${e.waived ? 'bg-surface/30 opacity-60' : 'bg-surface/60'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] text-cream">{e.label}</span>
                  <span className="font-mono text-[12.5px] text-cream">€{e.amount}</span>
                </div>
                <p className="mt-1 font-mono text-[10px] text-muted">
                  pagato da {memberById(e.paid_by_member_id ?? '')?.display_name ?? '—'} · diviso tra {participants.length}
                  {e.waived && ` · condonato da ${memberById(e.waived_by_member_id ?? '')?.display_name ?? '?'}`}
                </p>
                {isCreator && !e.waived && (
                  <button
                    onClick={() => waiveExpense(e.id)}
                    className="mt-1.5 font-mono text-[10px] text-muted underline"
                  >
                    condona questo debito
                  </button>
                )}
              </div>
            )
          })}
          {generalExpenses.length === 0 && <p className="text-sm text-muted">Nessuna spesa generale ancora.</p>}
        </div>
      </div>

      {adding ? (
        <Card>
          <form onSubmit={addExpense} className="flex flex-col gap-2">
            <input
              autoFocus
              className="rounded-lg border border-border-soft bg-ink px-3 py-2 text-[13px] text-cream placeholder:text-muted"
              placeholder="Es. Ombrelloni e lettini"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <input
              type="number"
              step="0.01"
              min="0"
              className="rounded-lg border border-border-soft bg-ink px-3 py-2 text-[13px] text-cream placeholder:text-muted"
              placeholder="Importo (€)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="rounded-lg border border-border-soft bg-ink px-3 py-2 text-[13px] text-cream"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  Pagato da {m.display_name}
                </option>
              ))}
            </select>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">Diviso tra</p>
            <div className="flex flex-wrap gap-1.5">
              {members.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => toggleParticipant(m.id)}
                  className={`rounded-full px-2.5 py-1 text-[11px] ${
                    participantIds.includes(m.id) ? 'bg-teal text-ink' : 'bg-ink text-muted'
                  }`}
                >
                  {m.display_name}
                </button>
              ))}
            </div>
            <div className="mt-1 flex gap-2">
              <Button type="submit" size="sm" variant="teal" disabled={saving}>
                Aggiungi spesa
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setAdding(false)}>
                Annulla
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Button variant="surface" className="w-full" onClick={() => setAdding(true)}>
          <Plus size={15} /> Nuova lista spesa
        </Button>
      )}

      {hasOpenBalance && (
        <div>
          <p className="mb-2 mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Chi deve dare a chi</p>
          <div className="space-y-1.5">
            {transfers.map((t, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-surface/60 px-3.5 py-2.5 text-[12.5px]">
                <span className="text-cream">
                  {memberById(t.fromMemberId)?.display_name} → {memberById(t.toMemberId)?.display_name}
                </span>
                <span className="font-mono text-cream">€{t.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-coral/25 bg-coral/10 px-4 py-3">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-coral" />
            <p className="text-[11.5px] leading-relaxed text-cream">
              Ci sono saldi non ancora chiusi. Non potrai chiudere la stanza finché tutti i conti non sono a zero.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

import { AlertTriangle, Plus } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import Button from '../ui/Button'
import BottomSheet from '../ui/BottomSheet'
import TextField from '../ui/TextField'
import { formatMoney } from '../../lib/format'
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
  const [savedExpenseId, setSavedExpenseId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const optimistic = useRoomOptimistic(roomId)

  const memberById = (id: string) => members.find((m) => m.id === id)
  const isCreator = currentMember.role === 'creator'

  const balances = computeBalances({ cars, carPassengers, carExpenses, generalExpenses, generalExpenseParticipants })
  const transfers = computeTransfers(balances)
  const hasOpenBalance = transfers.length > 0

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
    if (saving || !label.trim() || !Number.isFinite(value) || value <= 0 || participantIds.length === 0) return
    setSaving(true)
    setSaveError(null)
    try {
      const expenseId = savedExpenseId ?? crypto.randomUUID()
      if (!savedExpenseId) {
        const { error } = await mutateNotify(
          'general_expenses.insert',
          insertGeneralExpense(expenseId, roomId, label, value, paidBy),
          'Spesa non salvata.',
        )
        if (error) { setSaveError('Spesa non salvata. Riprova.'); return }
        setSavedExpenseId(expenseId)
      }

      const { error: participantError } = await mutateNotify(
        'general_expense_participants.insert',
        insertGeneralExpenseParticipants(expenseId, participantIds),
        'Partecipanti spesa non salvati.',
      )
      if (participantError) { setSaveError('La spesa è stata creata, ma mancano le quote. Riprova per completarla.'); return }
      setSavedExpenseId(null)

      setLabel('')
      setAmount('')
      setParticipantIds(members.map((m) => m.id))
      setAdding(false)
    } catch {
      setSaveError('Salvataggio interrotto. Controlla la connessione e riprova.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {cars.length > 0 && (
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-muted">Per auto</p>
          <div className="space-y-2">
            {cars.map((c) => {
              const total = carExpenses.filter((e) => e.car_id === c.id).reduce((s, e) => s + e.amount, 0)
              return (
                <div key={c.id} className="flex items-center justify-between rounded-xl bg-surface/60 px-3.5 py-2.5">
                  <span className="text-[13px] text-fg">Auto di {memberById(c.driver_member_id)?.display_name}</span>
                  <span className="font-mono text-[13px] text-fg">{formatMoney(total)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-muted">Spese del gruppo</p>
        <div className="space-y-2">
          {generalExpenses.map((e) => {
            const participants = generalExpenseParticipants.filter((p) => p.expense_id === e.id)
            return (
              <div key={e.id} className={`rounded-xl px-3.5 py-2.5 ${e.waived ? 'bg-surface/30 opacity-60' : 'bg-surface/60'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-fg">{e.label}</span>
                  <span className="font-mono text-[13px] text-fg">{formatMoney(e.amount)}</span>
                </div>
                <p className="mt-1 font-mono text-[10px] text-fg-muted">
                  pagato da {memberById(e.paid_by_member_id ?? '')?.display_name ?? '—'} · diviso tra {participants.length}
                  {e.waived && ` · condonato da ${memberById(e.waived_by_member_id ?? '')?.display_name ?? '?'}`}
                </p>
                {isCreator && !e.waived && (
                  <button
                    onClick={() => waiveExpense(e.id)}
                    className="mt-1.5 font-mono text-[10px] text-fg-muted underline"
                  >
                    condona questo debito
                  </button>
                )}
              </div>
            )
          })}
          {generalExpenses.length === 0 && <p className="text-sm text-fg-muted">Nessuna spesa generale ancora.</p>}
        </div>
      </div>

      <Button variant="surface" className="w-full" onClick={() => { setSaveError(null); setAdding(true) }}>
        <Plus size={17} /> {savedExpenseId ? 'Completa la spesa' : 'Nuova spesa'}
      </Button>
      <BottomSheet open={adding} onClose={() => { if (!saving) setAdding(false) }} title={savedExpenseId ? 'Completa la spesa' : 'Nuova spesa'}>
        <form onSubmit={addExpense} className="space-y-5" aria-busy={saving}>
          {saveError && <p role="alert" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{saveError}</p>}
          <fieldset disabled={saving || !!savedExpenseId} className="space-y-4 disabled:opacity-60">
            <TextField label="Per cosa avete speso?" autoFocus placeholder="Es. Spesa per il picnic" required maxLength={100} value={label} onChange={(event) => setLabel(event.target.value)} />
            <TextField label="Importo (€)" type="number" inputMode="decimal" step="0.01" min="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} />
            <label className="block text-sm font-medium">Chi ha pagato?<select value={paidBy} onChange={(event) => setPaidBy(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-line-strong bg-canvas px-3 text-base">{members.map((member) => <option key={member.id} value={member.id}>{member.display_name}</option>)}</select></label>
          </fieldset>
          <fieldset disabled={saving} className="space-y-3"><legend className="text-sm font-medium">Dividi tra i partecipanti</legend><div className="flex flex-wrap gap-2">{members.map((member) => <button type="button" key={member.id} aria-pressed={participantIds.includes(member.id)} onClick={() => toggleParticipant(member.id)} className={`min-h-11 rounded-full px-4 py-2 text-sm ${participantIds.includes(member.id) ? 'bg-accent text-on-accent' : 'border border-line-strong text-fg-muted'}`}>{member.display_name}</button>)}</div></fieldset>
          <Button type="submit" className="w-full" disabled={saving || !label.trim() || Number(amount) <= 0 || !amount || participantIds.length === 0}>{saving ? 'Salvataggio…' : savedExpenseId ? 'Riprova a salvare le quote' : 'Aggiungi spesa'}</Button>
        </form>
      </BottomSheet>

      {hasOpenBalance && (
        <div>
          <p className="mb-2 mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-muted">Chi deve dare a chi</p>
          <div className="space-y-1.5">
            {transfers.map((t, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-surface/60 px-3.5 py-2.5 text-[13px]">
                <span className="text-fg">
                  {memberById(t.fromMemberId)?.display_name} → {memberById(t.toMemberId)?.display_name}
                </span>
                <span className="font-mono text-fg">{formatMoney(t.amount)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-danger/25 bg-danger/10 px-4 py-3">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-danger" />
            <p className="text-[11px] leading-relaxed text-fg">
              Ci sono saldi non ancora chiusi. Non potrai chiudere la stanza finché tutti i conti non sono a zero.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

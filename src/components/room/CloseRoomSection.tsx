import { AlertTriangle, Lock } from 'lucide-react'
import { useState } from 'react'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { computeBalances, computeTransfers } from '../../lib/balances'
import { mutate } from '../../lib/db'
import { supabase } from '../../lib/supabase'
import type { Car, CarExpense, CarPassenger, GeneralExpense, GeneralExpenseParticipant, Member, Room } from '../../types'

interface CloseRoomSectionProps {
  room: Room
  currentMember: Member
  cars: Car[]
  carPassengers: CarPassenger[]
  carExpenses: CarExpense[]
  generalExpenses: GeneralExpense[]
  generalExpenseParticipants: GeneralExpenseParticipant[]
  onGoToSpese: () => void
  onClosed: () => void
}

export default function CloseRoomSection({
  room,
  currentMember,
  cars,
  carPassengers,
  carExpenses,
  generalExpenses,
  generalExpenseParticipants,
  onGoToSpese,
  onClosed,
}: CloseRoomSectionProps) {
  const [closing, setClosing] = useState(false)

  if (currentMember.role !== 'creator' || room.status === 'closed') return null

  const balances = computeBalances({ cars, carPassengers, carExpenses, generalExpenses, generalExpenseParticipants })
  const transfers = computeTransfers(balances)
  const hasOpenBalance = transfers.length > 0

  async function closeRoom() {
    if (!window.confirm('Chiudere la stanza? Auto, spese, bacheca e radar verranno cancellati definitivamente.')) {
      return
    }
    setClosing(true)
    try {
      await mutate('cars.deleteByRoom', supabase.from('cars').delete().eq('room_id', room.id))
      await mutate('general_expenses.deleteByRoom', supabase.from('general_expenses').delete().eq('room_id', room.id))
      await mutate('board_notes.deleteByRoom', supabase.from('board_notes').delete().eq('room_id', room.id))
      await mutate('board_links.deleteByRoom', supabase.from('board_links').delete().eq('room_id', room.id))
      await mutate('radar_positions.deleteByRoom', supabase.from('radar_positions').delete().eq('room_id', room.id))
      await mutate('rooms.close', supabase.from('rooms').update({ status: 'closed' }).eq('id', room.id))
      onClosed()
    } finally {
      setClosing(false)
    }
  }

  return (
    <Card tone={hasOpenBalance ? 'surface' : 'highlight'} className="mt-1">
      <div className="mb-2 flex items-center gap-1.5 text-muted">
        <Lock size={13} strokeWidth={2.5} />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em]">Chiusura stanza</span>
      </div>

      {hasOpenBalance ? (
        <>
          <div className="flex items-start gap-2 rounded-xl border border-coral/25 bg-coral/10 px-4 py-3">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-coral" />
            <p className="text-[11.5px] leading-relaxed text-cream">
              {transfers.length} saldi non ancora saldati. Salda o condona i debiti prima di chiudere.
            </p>
          </div>
          <button onClick={onGoToSpese} className="mt-2 font-mono text-[11px] text-muted underline">
            Vai al riepilogo spese →
          </button>
        </>
      ) : (
        <>
          <p className="mb-3 text-[12.5px] text-muted">
            Tutti i conti sono a zero. Chiudendo la stanza, auto, spese, bacheca e radar verranno cancellati —
            la stanza resterà visibile come archiviata.
          </p>
          <Button variant="outline" className="w-full" onClick={closeRoom} disabled={closing}>
            {closing ? 'Chiusura...' : 'Chiudi stanza'}
          </Button>
        </>
      )}
    </Card>
  )
}

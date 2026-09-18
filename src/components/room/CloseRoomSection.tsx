import { AlertTriangle, Lock } from 'lucide-react'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import BottomSheet from '../ui/BottomSheet'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { computeBalances, computeTransfers } from '../../lib/balances'
import { mutateNotify } from '../../lib/db'
import { useOnline } from '../../lib/online'
import { showToast } from '../../lib/toast'
import { roomDataKey, type RoomPayload } from '../../hooks/useRoomData'
import {
  closeRoom,
  deleteRadarPositionsByRoom,
} from '../../lib/mutations'
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
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const online = useOnline()
  const queryClient = useQueryClient()

  if (currentMember.role !== 'creator' || room.status === 'closed') return null

  const balances = computeBalances({ cars, carPassengers, carExpenses, generalExpenses, generalExpenseParticipants })
  const transfers = computeTransfers(balances)
  const hasOpenBalance = transfers.length > 0

  async function handleClose() {
    if (closing || !online || hasOpenBalance) return
    setClosing(true)
    setError(null)
    try {
      const result = await mutateNotify('rooms.close', closeRoom(room.id), 'Evento non archiviato.')
      if (result.error) { setError('Archiviazione non riuscita. Riprova.'); return }
      // Lo storico rimane intatto. Il radar è effimero e viene ripulito a parte.
      void mutateNotify('radar_positions.deleteByRoom', deleteRadarPositionsByRoom(room.id), 'Evento archiviato, ma la pulizia delle posizioni non è riuscita.').catch(() => showToast('Pulizia delle posizioni non riuscita.', 'error'))
      queryClient.setQueryData<RoomPayload>(roomDataKey(room.id), (previous) => previous?.room ? { ...previous, room: { ...previous.room, status: 'closed' } } : previous)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-rooms'] }),
        queryClient.invalidateQueries({ queryKey: ['crew-data'] }),
      ])
      setConfirming(false)
      onClosed()
    } catch {
      setError('Archiviazione non riuscita. Controlla la connessione e riprova.')
    } finally {
      setClosing(false)
    }
  }

  return (
    <Card tone={hasOpenBalance ? 'surface' : 'highlight'} className="mt-1">
      <div className="mb-2 flex items-center gap-1.5 text-fg-muted">
        <Lock size={13} strokeWidth={2.5} />
        <span className="text-xs font-medium uppercase tracking-widest">Archivia evento</span>
      </div>

      {hasOpenBalance ? (
        <>
          <div className="flex items-start gap-2 rounded-xl border border-danger/25 bg-danger/10 px-4 py-3">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-danger" />
            <p className="text-[11px] leading-relaxed text-fg">
              Ci sono {transfers.length} saldi aperti. Controlla il riepilogo prima di archiviare.
            </p>
          </div>
          <button onClick={onGoToSpese} className="mt-2 font-mono text-[11px] text-fg-muted underline">
            Vai al riepilogo spese →
          </button>
        </>
      ) : (
        <>
          <p className="mb-3 text-[13px] text-fg-muted">
            L’evento resterà consultabile con partecipanti, auto, spese e bacheca. Le posizioni radar verranno rimosse.
          </p>
          <Button variant="outline" className="w-full" onClick={() => setConfirming(true)} disabled={closing || !online}>
            Archivia evento
          </Button>
          {!online && <p className="mt-2 text-sm text-fg-muted">Torna online per archiviare l’evento.</p>}
        </>
      )}
      <BottomSheet open={confirming} onClose={() => { if (!closing) setConfirming(false) }} title="Archivia questo evento?">
        <p className="mb-5 text-sm leading-relaxed text-fg-muted">Potrai rileggere il riepilogo dalla Home. Nell’archivio le modifiche non saranno disponibili.</p>
        {error && <p role="alert" className="mb-4 text-sm text-danger">{error}</p>}
        <Button className="w-full" onClick={handleClose} disabled={closing || !online || hasOpenBalance}>{closing ? 'Archiviazione…' : 'Conferma archiviazione'}</Button>
      </BottomSheet>
    </Card>
  )
}

import { ArrowRight, Car as CarIcon, Check, Receipt } from 'lucide-react'
import { useState } from 'react'
import { useRoomOptimistic } from '../../hooks/useRoomOptimistic'
import { computeBalances } from '../../lib/balances'
import { formatMoney } from '../../lib/format'
import { confirmMemberPresence } from '../../lib/mutations'
import { roomPhase } from '../../lib/phase'
import { showToast } from '../../lib/toast'
import type { Car, CarExpense, CarPassenger, GeneralExpense, GeneralExpenseParticipant, Member, Room } from '../../types'
import Button from '../ui/Button'
import Card from '../ui/Card'

interface Props {
  room: Room
  currentMember: Member
  members: Member[]
  cars: Car[]
  carPassengers: CarPassenger[]
  carExpenses: CarExpense[]
  generalExpenses: GeneralExpense[]
  generalExpenseParticipants: GeneralExpenseParticipant[]
  dataIncomplete: boolean
  onGoToAuto: () => void
  onGoToSpese: () => void
}

export default function PersonalSummary(props: Props) {
  const { room, currentMember, members, cars, carPassengers, dataIncomplete, onGoToAuto, onGoToSpese } = props
  const [saving, setSaving] = useState(false)
  const optimistic = useRoomOptimistic(room.id)
  const myCar = cars.find((car) => car.driver_member_id === currentMember.id || carPassengers.some((p) => p.car_id === car.id && p.member_id === currentMember.id))
  const phase = roomPhase(room.status, cars.map((car) => car.travel_status))
  const driver = members.find((member) => member.id === myCar?.driver_member_id)
  const balance = dataIncomplete ? null : computeBalances(props).find((entry) => entry.memberId === currentMember.id)?.net ?? 0
  const needsConfirmation = phase === 'pre' && !currentMember.confirmed
  const reviewExpenses = myCar?.travel_status === 'arrivata' && balance !== null && balance !== 0
  const title = dataIncomplete ? 'Il tuo evento, a colpo d’occhio' : needsConfirmation ? 'Ci sei anche tu?' : reviewExpenses ? 'Siete arrivati. Facciamo i conti?' : !myCar ? 'Troviamo il tuo passaggio' : myCar.driver_member_id === currentMember.id ? 'Il gruppo viaggia con te' : `Viaggi con ${driver?.display_name ?? 'il tuo gruppo'}`

  async function confirm() {
    if (saving) return
    setSaving(true)
    try {
      await optimistic('members.confirmPresence', (prev) => ({ ...prev,
        members: prev.members.map((m) => m.id === currentMember.id ? { ...m, confirmed: true, confirmed_at: new Date().toISOString() } : m),
      }), () => confirmMemberPresence(currentMember.id), 'Conferma non salvata. Riprova.')
    } catch { showToast('Conferma non salvata. Controlla la connessione.', 'error') }
    finally { setSaving(false) }
  }

  return <Card tone="highlight" className="!p-5 sm:!p-6">
    <p className="mb-3 text-xs font-medium uppercase tracking-widest text-amber">Il tuo prossimo passo</p>
    <h2 className="font-serif text-2xl leading-tight">{title}</h2>
    <p className="mb-5 mt-2 text-sm leading-relaxed text-muted">{dataIncomplete ? 'Alcuni dati non sono disponibili. Ricarica l’evento prima di organizzare posti e conti.' : needsConfirmation ? 'Conferma la presenza: aiuti tutti a organizzare posti e partenza.' : myCar ? 'Il tuo posto è organizzato. Trovi passeggeri, carico e aggiornamenti nella sezione Auto.' : 'Scegli un posto disponibile oppure metti a disposizione la tua auto.'}</p>
    <div className="mb-5 grid grid-cols-2 gap-3 border-y border-border-soft py-4">
      <div><p className="flex items-center gap-1.5 text-xs text-muted"><CarIcon size={14} /> Il tuo passaggio</p><p className="mt-1 text-sm font-medium">{dataIncomplete ? 'Da verificare' : myCar ? myCar.driver_member_id === currentMember.id ? 'Sei alla guida' : `Auto di ${driver?.display_name ?? 'un amico'}` : 'Da organizzare'}</p></div>
      <div><p className="flex items-center gap-1.5 text-xs text-muted"><Receipt size={14} /> Il tuo saldo</p><p className="mt-1 text-sm font-medium">{balance === null ? 'Non disponibile' : balance > 0 ? `Ricevi ${formatMoney(balance)}` : balance < 0 ? `Devi ${formatMoney(-balance)}` : 'Nessun saldo aperto'}</p></div>
    </div>
    {!dataIncomplete && (needsConfirmation ? <Button onClick={confirm} disabled={saving}><Check size={17} />{saving ? 'Conferma in corso…' : 'Conferma la tua presenza'}</Button> : reviewExpenses ? <Button onClick={onGoToSpese}>Controlla le spese <ArrowRight size={17} /></Button> : <Button onClick={onGoToAuto}>{myCar ? 'Vai alla tua auto' : 'Organizza il passaggio'} <ArrowRight size={17} /></Button>)}
  </Card>
}

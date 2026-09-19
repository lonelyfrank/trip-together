import { Archive, Calendar, MapPin } from 'lucide-react'
import type { RoomPayload } from '../../hooks/useRoomData'
import { formatEventTime, formatMoney } from '../../lib/format'
import Card from '../ui/Card'

export default function ArchiveSummary({ data }: { data: Omit<RoomPayload, 'error'> }) {
  const { room, members, cars, generalExpenses, carExpenses, sectionErrors } = data
  if (!room) return null
  const incomplete = Object.values(sectionErrors).some(Boolean)
  return <div className="space-y-5 px-4 pb-10 sm:px-6">
    <Card tone="highlight"><div className="mb-3 flex items-center gap-2 text-brand-text"><Archive size={20} /><h2 className="font-semibold">Il ricordo del vostro evento</h2></div><p className="text-sm leading-relaxed text-fg-muted">Questo evento è archiviato. Puoi consultare i dati conservati, senza modificarli.</p><div className="mt-5 space-y-3 text-sm">{room.event_time && <p className="flex items-center gap-2"><Calendar size={17} />{formatEventTime(room.event_time)}</p>}{room.destination_label && <p className="flex items-center gap-2"><MapPin size={17} />{room.destination_label}</p>}<p>{members.length} partecipanti · {cars.length} auto</p></div></Card>
    {incomplete && <p role="alert" className="rounded-xl bg-danger/10 p-4 text-sm text-danger-text">Il riepilogo è incompleto: alcuni dati non sono stati caricati. Ricarica la pagina per riprovare.</p>}
    {!sectionErrors.spese && <Card><h2 className="mb-4 font-serif text-xl">Spese conservate</h2>{generalExpenses.length + carExpenses.length === 0 ? <p className="text-sm text-fg-muted">Non ci sono spese conservate per questo evento.</p> : <ul className="divide-y divide-border-soft">{[...generalExpenses, ...carExpenses].map((expense) => <li key={expense.id} className="flex justify-between gap-4 py-3 text-sm"><span>{expense.label}{'waived' in expense && expense.waived ? ' · condonata' : ''}<span className="mt-1 block text-xs text-fg-muted">Pagata da {members.find((member) => member.id === expense.paid_by_member_id)?.display_name ?? 'non indicato'}</span></span><span className="shrink-0 font-mono">{formatMoney(expense.amount)}</span></li>)}</ul>}</Card>}
    <Card><h2 className="mb-3 font-serif text-xl">Il gruppo</h2><div className="flex flex-wrap gap-2">{members.map((member) => <span key={member.id} className="rounded-full bg-canvas px-3 py-2 text-sm">{member.display_name}</span>)}</div></Card>
    {!sectionErrors.bacheca && data.boardNotes.length > 0 && <Card><h2 className="mb-3 font-serif text-xl">Bacheca</h2><ul className="space-y-3 text-sm text-fg-muted">{data.boardNotes.map((note) => <li key={note.id}>{note.text}</li>)}</ul></Card>}
  </div>
}

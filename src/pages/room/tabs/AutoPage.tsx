import {
  Briefcase,
  Car,
  Check,
  ChevronRight,
  ClipboardList,
  Clock,
  Fuel,
  MapPin,
  MapPinCheck,
  Navigation,
  Phone,
  Radio,
  Share2,
  TriangleAlert,
  User,
  Users,
  Wrench,
  Siren,
} from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { RoadIcon, SuitcaseGlyph } from '../../../components/icons'
import MapSheet from '../../../components/MapSheet'
import AutoTab from '../../../components/room/AutoTab'
import EventDetailsSheet, { MapMarker } from '../../../components/room/EventDetailsSheet'
import { TravelStatusSheet } from '../../../components/room/TravelStatusChip'
import { useSetTravelStatus } from '../../../hooks/useSetTravelStatus'
import AlertBanner from '../../../components/ui/AlertBanner'
import Avatar from '../../../components/ui/Avatar'
import Button from '../../../components/ui/Button'
import Card from '../../../components/ui/Card'
import CardTitle from '../../../components/ui/CardTitle'
import Chip from '../../../components/ui/Chip'
import PageTitle from '../../../components/ui/PageTitle'
import SectionHeader from '../../../components/ui/SectionHeader'
import StaticMap from '../../../components/ui/StaticMap'
import { useRoomContext } from '../../../hooks/useRoomContext'
import { ASSETS } from '../../../lib/assets'
import { delayTitle } from '../../../lib/delays'
import { formatClock, formatCountdown, formatEuro } from '../../../lib/format'
import { myCarOf, peopleInCar } from '../../../lib/roomView'
import { shareOrCopy } from '../../../lib/share'

const CARS_ANCHOR = 'auto-gestione'

// Numeri validi in tutta Italia: sono fatti, non dati dell'evento, ed è
// proprio quando servono che non si ha tempo di cercarli. Lo schema non ha
// numeri di telefono dei membri, quindi "chiama autista" non esiste.
const EMERGENCY = [
  { label: 'Emergenze', number: '112', display: '112', icon: Siren },
  { label: 'Soccorso stradale ACI', number: '803116', display: '803 116', icon: Wrench },
  { label: 'Info traffico CCISS', number: '1518', display: '1518', icon: Radio },
]

// Colori delle valigie: distinguono i bagagli, non il loro stato.
const SUITCASE_TONES = ['text-blue', 'text-brand', 'text-warning', 'text-danger', 'text-purple']

function scrollToCars() {
  document.getElementById(CARS_ANCHOR)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function AutoPage() {
  const ctx = useRoomContext()
  const { room, currentMember, members, cars, carPassengers, delayReports, phase, sectionErrors, refetch, goTo } = ctx
  const [routeOpen, setRouteOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [shared, setShared] = useState(false)
  const setTravelStatus = useSetTravelStatus(room.id, currentMember.id)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  const hasCoords = room.destination_lat !== null && room.destination_lng !== null
  const myCar = myCarOf(currentMember.id, cars, carPassengers)
  const aboard = myCar ? peopleInCar(myCar, carPassengers, members) : []
  const driver = aboard[0]
  const iDrive = myCar?.driver_member_id === currentMember.id
  const activeDelays = delayReports.filter((d) => !d.resolved_at)
  const departed = cars.filter((c) => c.travel_status !== 'non_partita').length
  const departure = room.event_time ? Date.parse(room.event_time) : null
  const confirmedCount = members.filter((m) => m.confirmed).length

  const myExpenses = myCar ? ctx.carExpenses.filter((e) => e.car_id === myCar.id) : []
  const myExpenseTotal = myExpenses.reduce((sum, e) => sum + e.amount, 0)
  const cargo = myCar ? ctx.carCargo.filter((c) => c.car_id === myCar.id) : []
  const packed = cargo.filter((c) => c.packed).length
  const checklist = ctx.roomChecklistItems.slice(0, 5)

  // La prossima tappa con un luogo è la "destinazione" del percorso: il
  // ritrovo è il punto di partenza comune.
  const nextStop = ctx.activities
    .filter((a) => a.starts_at && a.place_label && a.status !== 'annullata' && Date.parse(a.starts_at) > now)
    .sort((a, b) => Date.parse(a.starts_at!) - Date.parse(b.starts_at!))[0]

  const routeStatus =
    activeDelays.length > 0
      ? { tone: 'danger' as const, label: activeDelays.length === 1 ? '1 ritardo' : `${activeDelays.length} ritardi` }
      : phase === 'concluso'
        ? { tone: 'grey' as const, label: 'Concluso' }
        : { tone: 'brand' as const, label: phase === 'in_corso' ? 'In viaggio' : 'In orario' }

  async function shareMeetingPoint() {
    const parts = [room.destination_label, room.event_time ? formatClock(room.event_time) : null].filter(Boolean)
    const result = await shareOrCopy({
      title: `Ritrovo · ${room.title}`,
      text: parts.length > 0 ? `Ci vediamo a ${parts.join(' alle ')}` : `Ritrovo per "${room.title}"`,
      url: `${window.location.origin}/room/${room.id}?tab=auto`,
    })
    if (result === 'copied') {
      setShared(true)
      setTimeout(() => setShared(false), 1500)
    }
  }

  function checkIn() {
    if (!myCar || myCar.travel_status === 'arrivata') return
    if (!window.confirm('Segnare la tua auto come arrivata? I ritardi aperti verranno chiusi.')) return
    setTravelStatus(myCar, 'arrivata')
  }

  if (sectionErrors.auto) {
    return (
      <AlertBanner
        tone="danger"
        title="Non riusciamo a caricare questa sezione"
        action={
          <Button variant="outline" size="sm" onClick={refetch}>
            Riprova
          </Button>
        }
      >
        I tuoi dati potrebbero essere presenti. Riprova prima di aggiungerne altri.
      </AlertBanner>
    )
  }

  return (
    <div className="flex flex-col">
      <PageTitle title="Auto" hint="Viaggio e organizzazione della vettura" icon={Car} iconStyle="bare" className="mt-0 h-[37px]" />

      <section
        aria-label="Percorso"
        className="relative mt-1.5 h-[126px] shrink-0 overflow-hidden rounded-card border border-line bg-surface shadow-card"
      >
        {hasCoords ? (
          <StaticMap
            center={{ lat: room.destination_lat!, lng: room.destination_lng! }}
            zoom={12}
            offsetX={70}
            label={`Mappa del ritrovo: ${room.destination_label ?? 'posizione salvata'}`}
            className="absolute inset-0"
            attribution="top-right"
            points={[{ key: 'meet', lat: room.destination_lat!, lng: room.destination_lng!, node: <MapMarker /> }]}
          />
        ) : (
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-blue-soft to-brand-soft" />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: 'linear-gradient(90deg, var(--tt-surface) 30%, transparent 64%)' }}
        />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-11 bg-gradient-to-t from-surface via-surface/85 to-transparent" />

        <div className="absolute left-[11px] top-2.5 flex gap-[9px]">
          <div className="flex flex-col items-center pt-[5px]">
            <span className="h-2 w-2 rounded-full bg-brand" />
            {nextStop && (
              <>
                <span className="h-[26px] w-px bg-line-dashed" />
                <span className="h-2 w-2 rounded-full bg-blue" />
              </>
            )}
          </div>
          <div className="flex max-w-[190px] flex-col gap-3">
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-bold leading-[1.2] text-fg">
                {room.destination_label || 'Ritrovo da scegliere'}
              </p>
              <p className="text-[10.5px] leading-[1.25] text-fg-muted">Punto di ritrovo</p>
            </div>
            {nextStop && (
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-bold leading-[1.2] text-fg">{nextStop.place_label}</p>
                <p className="truncate text-[10.5px] leading-[1.25] text-fg-muted">Prossima tappa · {nextStop.title}</p>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => (hasCoords ? setRouteOpen(true) : setDetailsOpen(true))}
          className="press absolute right-0.5 top-0 flex min-h-11 items-start p-1.5"
        >
          <span className="flex h-5 items-center gap-[3px] rounded-[10px] bg-surface/90 pl-[9px] pr-1.5 text-[9.5px] text-fg shadow-float">
            {hasCoords ? 'Vedi percorso' : 'Imposta ritrovo'}
            <ChevronRight aria-hidden="true" size={10} strokeWidth={2.4} />
          </span>
        </button>

        <div className="absolute bottom-1.5 left-[11px] right-2.5 flex items-center gap-[11px]">
          <Stat icon={<RoadIcon aria-hidden="true" size={18} strokeWidth={1.8} className="text-fg-soft" />}
            value={`${departed}/${cars.length} auto`} label="Partite" />
          <Stat icon={<Clock aria-hidden="true" size={18} strokeWidth={1.8} className="text-fg-soft" />}
            value={room.event_time ? formatClock(room.event_time) : '--:--'} label="Ritrovo" />
          <Chip tone={routeStatus.tone} className="!py-[7px] !pl-[7px] !pr-2.5">
            <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${routeStatus.tone === 'danger' ? 'bg-danger' : 'bg-brand'}`}>
              {routeStatus.tone === 'danger' ? (
                <TriangleAlert aria-hidden="true" size={8} strokeWidth={3} className="text-white" />
              ) : (
                <Check aria-hidden="true" size={9} strokeWidth={3.4} className="text-white" />
              )}
            </span>
            {routeStatus.label}
          </Chip>
        </div>
      </section>
      {hasCoords && (
        <MapSheet open={routeOpen} onClose={() => setRouteOpen(false)} lat={room.destination_lat!} lng={room.destination_lng!} />
      )}
      <EventDetailsSheet room={room} open={detailsOpen} onClose={() => setDetailsOpen(false)} />
      {myCar && (
        <TravelStatusSheet car={myCar} currentMemberId={currentMember.id} open={statusOpen} onClose={() => setStatusOpen(false)} />
      )}

      <div className="mt-[9px] grid grid-cols-4 gap-[7px]">
        <QuickAction
          icon={Navigation}
          tone="bg-brand-button"
          label={<>Avvia<br />navigazione</>}
          onClick={() => (hasCoords ? setRouteOpen(true) : setDetailsOpen(true))}
        />
        <QuickAction
          icon={Share2}
          tone="bg-blue"
          label={shared ? <>Link<br />copiato</> : <>Condividi<br />ritrovo</>}
          onClick={shareMeetingPoint}
        />
        <QuickAction
          icon={Radio}
          tone="bg-brand-button"
          label={<>Stato<br />viaggio</>}
          onClick={() => (myCar ? setStatusOpen(true) : scrollToCars())}
        />
        <QuickAction
          icon={MapPinCheck}
          tone="bg-purple"
          label={myCar?.travel_status === 'arrivata' ? 'Arrivati' : 'Check-in'}
          onClick={() => (myCar ? checkIn() : scrollToCars())}
          disabled={myCar?.travel_status === 'arrivata'}
        />
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-[7px]">
        <Card onClick={scrollToCars} label="Autista e auto" className="relative min-h-[120px]">
          <CardTitle icon={User} title="Autista e auto" chevron />
          {myCar && driver ? (
            <>
              <div className="mt-1.5 flex items-center gap-[7px]">
                <Avatar name={driver.display_name} seed={driver.id} size={37} />
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-bold leading-[1.2] text-fg">
                    {driver.display_name}
                    {iDrive && ' (tu)'}
                  </p>
                  <Chip tone="brand" size="sm" className="mt-1">Autista</Chip>
                </div>
              </div>
              <div className="absolute bottom-[9px] left-[9px] flex items-center gap-[5px]">
                <Car aria-hidden="true" size={15} strokeWidth={1.8} className="text-fg" />
                <div>
                  <p className="text-[11px] font-bold leading-[1.2] text-fg">{myCar.seats_total} posti</p>
                  <p className="text-[10px] leading-[1.25] text-fg-muted">
                    {myCar.seats_total - aboard.length > 0 ? `${myCar.seats_total - aboard.length} liberi` : 'Al completo'}
                  </p>
                </div>
              </div>
              {ASSETS.car && (
                <img src={ASSETS.car} alt="" className="absolute bottom-2 right-1.5 w-[82px] mix-blend-multiply" draggable={false} />
              )}
            </>
          ) : (
            <div className="mt-2">
              <p className="text-[12px] font-bold text-fg">Non hai ancora un posto</p>
              <p className="mt-0.5 text-[10.5px] leading-[1.35] text-fg-muted">
                Prendi un posto libero o metti a disposizione la tua auto.
              </p>
            </div>
          )}
        </Card>

        <Card onClick={scrollToCars} label="Passeggeri" className="min-h-[120px]">
          <CardTitle
            icon={Users}
            title={myCar ? `Passeggeri (${aboard.length}/${myCar.seats_total})` : 'Passeggeri'}
            tone="purple"
            chevron
          />
          {myCar ? (
            <ul className="mt-1.5">
              {aboard.slice(0, 5).map((m, i) => (
                <li key={m.id} className="flex h-[17px] items-center gap-1.5">
                  <Avatar name={m.display_name} seed={m.id} size={16} />
                  <span className="min-w-0 flex-1 truncate text-[10.5px] text-fg">
                    {m.display_name}
                    {m.id === currentMember.id && ' (tu)'}
                  </span>
                  <span className="shrink-0 text-[10px] text-fg-muted">{i === 0 ? 'Guida' : `Posto ${i + 1}`}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[10.5px] leading-[1.35] text-fg-muted">
              {cars.length === 0 ? 'Nessuna auto dichiarata.' : `${cars.length} auto nel gruppo: scegli la tua qui sotto.`}
            </p>
          )}
        </Card>
      </div>

      <div className="mt-[7px] grid grid-cols-2 gap-[7px]">
        <Card onClick={scrollToCars} label="Carburante e pedaggi" className="min-h-[92px]">
          <CardTitle icon={Fuel} title="Carburante e pedaggi" tone="warning" chevron />
          <p className="mt-1.5 text-[23px] font-bold leading-none tracking-[-0.5px] text-fg">
            {myCar ? formatEuro(myExpenseTotal) : '—'}
          </p>
          <p className="mt-[3px] text-[10.5px] leading-[1.25] text-fg-muted">Spese della tua auto</p>
          <p className="mt-[3px] truncate text-[9.5px] leading-[1.25] text-fg-muted">
            {!myCar
              ? 'Sali su un’auto per vederle'
              : myExpenses.length === 0
                ? 'Nessuna spesa registrata'
                : `~ ${formatEuro(myExpenseTotal / Math.max(aboard.length, 1))} a testa · ${myExpenses.length} voci`}
          </p>
        </Card>

        <Card onClick={() => goTo('stanza')} label="Partenza" className="min-h-[92px]">
          <CardTitle icon={Clock} title={departure !== null && departure > now ? 'Partenza tra' : 'Partenza'} tone="blue" chevron />
          <p className="mt-1.5 truncate text-[23px] font-bold leading-none tracking-[-0.5px] text-fg">
            {departure === null
              ? 'Da decidere'
              : departure > now
                ? formatCountdown(departure, now)
                : phase === 'in_corso'
                  ? 'Partiti'
                  : 'Adesso'}
          </p>
          <p className="mt-[3px] truncate text-[10.5px] leading-[1.25] text-fg-muted">
            {room.event_time ? dayLabel(room.event_time, now) : 'Scegliete un orario'}
          </p>
          <Chip tone={confirmedCount === members.length ? 'brand' : 'warning'} size="sm" className="mt-[5px]">
            {confirmedCount === members.length && <Check aria-hidden="true" size={10} strokeWidth={2.6} />}
            {confirmedCount === members.length
              ? 'Siamo tutti pronti!'
              : `${members.length - confirmedCount} da confermare`}
          </Chip>
        </Card>
      </div>

      <div className="mt-[7px] grid grid-cols-2 gap-[7px]">
        <Card onClick={() => setDetailsOpen(true)} label="Punto di ritrovo" className="min-h-[103px]">
          <CardTitle icon={MapPin} title="Punto di ritrovo" tone="danger" chevron />
          <div className="mt-1.5 flex gap-[7px]">
            {hasCoords ? (
              <StaticMap
                center={{ lat: room.destination_lat!, lng: room.destination_lng! }}
                zoom={15}
                label=""
                attribution="none"
                className="h-14 w-[74px] shrink-0 rounded-[7px]"
                points={[{ key: 'meet', lat: room.destination_lat!, lng: room.destination_lng!, node: <MapMarker /> }]}
              />
            ) : (
              <span className="flex h-14 w-[74px] shrink-0 items-center justify-center rounded-[7px] bg-grey-soft">
                <MapPin aria-hidden="true" size={18} className="text-fg-muted" />
              </span>
            )}
            <div className="min-w-0">
              <p className="line-clamp-2 text-[10.5px] font-bold leading-[1.2] text-fg">
                {room.destination_label || 'Da scegliere'}
              </p>
              <p className="mt-0.5 truncate text-[9.5px] leading-[1.25] text-fg-muted">
                {room.event_time ? `ore ${formatClock(room.event_time)}` : 'Orario da decidere'}
              </p>
              <span className="mt-[5px] inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-blue-soft px-[7px] py-1 text-[9.5px] font-semibold text-blue">
                <MapPin aria-hidden="true" size={11} /> {hasCoords ? 'Vedi su mappa' : 'Imposta'}
              </span>
            </div>
          </div>
        </Card>

        <Card onClick={scrollToCars} label="Bagagli" className="min-h-[103px]">
          <CardTitle icon={Briefcase} title="Bagagli" tone="blue" chevron />
          <p className="mt-1 text-[12.5px] font-bold leading-[1.1] text-fg">
            {cargo.length === 0 ? 'Nessun bagaglio' : `${packed}/${cargo.length} a bordo`}
          </p>
          <div className="mt-[5px] flex h-6 gap-[9px]">
            {cargo.slice(0, 5).map((item, i) => (
              <SuitcaseGlyph key={item.id} className={item.packed ? SUITCASE_TONES[i % SUITCASE_TONES.length] : 'text-track'} />
            ))}
            {cargo.length === 0 && <p className="text-[9.5px] leading-[1.3] text-fg-muted">Aggiungili al carico della tua auto.</p>}
          </div>
          {cargo.length > 0 && (
            <Chip tone={packed === cargo.length ? 'brand' : 'warning'} size="sm" className="mt-1">
              {packed === cargo.length && <Check aria-hidden="true" size={10} strokeWidth={2.6} />}
              {packed === cargo.length ? 'Tutti i bagagli a bordo!' : `${cargo.length - packed} da caricare`}
            </Chip>
          )}
        </Card>
      </div>

      <div className="mt-[7px] grid grid-cols-2 gap-[7px]">
        <Card onClick={() => goTo('bacheca')} label="Lista condivisa: apri la bacheca" className="min-h-[113px]">
          <CardTitle icon={ClipboardList} title="Lista condivisa" chevron />
          {checklist.length === 0 ? (
            <p className="mt-1.5 text-[10.5px] leading-[1.35] text-fg-muted">Ancora nessuna voce: aggiungila in Bacheca.</p>
          ) : (
            <ul className="mt-[5px]">
              {checklist.map((item) => (
                <li key={item.id} className="flex h-[15.6px] items-center gap-[7px]">
                  {item.status === 'portato' ? (
                    <span className="flex h-[13px] w-[13px] shrink-0 items-center justify-center rounded bg-brand">
                      <Check aria-hidden="true" size={9} strokeWidth={3.4} className="text-white" />
                    </span>
                  ) : (
                    <span className="h-[13px] w-[13px] shrink-0 rounded border-[1.5px] border-line-dashed bg-surface" />
                  )}
                  <span className="truncate text-[10.5px] text-fg">{item.title}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="min-h-[113px] overflow-hidden rounded-card border border-line bg-surface p-[9px] shadow-card">
          <CardTitle icon={Phone} title="Contatti di emergenza" tone="danger" />
          <ul className="mt-1">
            {EMERGENCY.map((entry) => {
              const Icon = entry.icon
              return (
                <li key={entry.number} className="flex h-7 items-center gap-1.5">
                  <span className="flex h-[23px] w-[23px] shrink-0 items-center justify-center rounded-full bg-danger-soft">
                    <Icon aria-hidden="true" size={12} className="text-danger" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10.5px] font-semibold leading-[1.15] text-fg">{entry.label}</p>
                    <p className="text-[9.5px] leading-[1.2] text-fg-muted">{entry.display}</p>
                  </div>
                  <a
                    href={`tel:${entry.number}`}
                    aria-label={`Chiama ${entry.label}, ${entry.display}`}
                    className="press -m-[9px] flex h-11 w-11 shrink-0 items-center justify-center"
                  >
                    <span className="flex h-[25px] w-[25px] items-center justify-center rounded-full bg-blue-soft">
                      <Phone aria-hidden="true" size={12} strokeWidth={2.2} className="text-blue" />
                    </span>
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      {activeDelays.length > 0 ? (
        <button
          type="button"
          onClick={scrollToCars}
          className="press mt-[7px] flex h-[27px] items-center gap-2 rounded-[9px] border border-danger/15 bg-danger-soft px-[9px] text-left"
        >
          <TriangleAlert aria-hidden="true" size={16} className="shrink-0 fill-danger/20 text-danger" />
          <span className="shrink-0 text-[11.5px] font-bold text-danger-text">{delayTitle(activeDelays[0].reason)}</span>
          <span className="min-w-0 truncate text-[10.5px] text-danger-text">
            {activeDelays[0].minutes_estimate ? `+${activeDelays[0].minutes_estimate} min` : 'Minuti non stimati'}
            {activeDelays.length > 1 && ` · altri ${activeDelays.length - 1}`}
          </span>
          <ChevronRight aria-hidden="true" size={12} strokeWidth={2.2} className="ml-auto shrink-0 text-danger-text" />
        </button>
      ) : (
        <p className="mt-[7px] flex h-[27px] items-center gap-2 rounded-[9px] bg-brand-soft px-[9px] text-[11.5px] font-bold text-brand-text">
          <Check aria-hidden="true" size={15} strokeWidth={2.4} /> Nessun ritardo segnalato
        </p>
      )}

      <section id={CARS_ANCHOR} aria-label="Auto e passaggi" className="mt-5 scroll-mt-2">
        <SectionHeader icon={Car} title="Auto e passaggi" hint="Posti, stati di viaggio, soste e carico" />
        <AutoTab
          roomId={room.id}
          currentMember={currentMember}
          members={members}
          cars={cars}
          carPassengers={carPassengers}
          carExpenses={ctx.carExpenses}
          carCargo={ctx.carCargo}
          delayReports={delayReports}
          stopProposals={ctx.stopProposals}
          stopProposalVotes={ctx.stopProposalVotes}
          rideRequests={ctx.rideRequests}
        />
      </section>
    </div>
  )
}

function Stat({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <div>
        <p className="text-[12px] font-bold leading-[1.1] text-fg">{value}</p>
        <p className="text-[9.5px] leading-[1.2] text-fg-muted">{label}</p>
      </div>
    </div>
  )
}

interface QuickActionProps {
  icon: typeof Navigation
  tone: string
  label: ReactNode
  onClick: () => void
  disabled?: boolean
}

function QuickAction({ icon: Icon, tone, label, onClick, disabled }: QuickActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="press flex min-h-[41px] items-center gap-[5px] overflow-hidden rounded-card border border-line bg-surface px-[5px] text-left text-fg shadow-card disabled:opacity-60"
    >
      <span className={`flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-full max-[400px]:h-6 max-[400px]:w-6 ${tone}`}>
        <Icon aria-hidden="true" size={14} strokeWidth={2} className="text-white" />
      </span>
      <span className="min-w-0 hyphens-auto text-[10.5px] font-semibold leading-[1.15] tracking-[-0.2px] max-[400px]:text-[9.5px]">{label}</span>
    </button>
  )
}

/** "Oggi, ore 11:30" / "Domani, ore 9:00" / "sab 26 apr, ore 10:00". */
function dayLabel(iso: string, now: number): string {
  const date = new Date(iso)
  const today = new Date(now)
  const tomorrow = new Date(now + 86_400_000)
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  const day = same(date, today)
    ? 'Oggi'
    : same(date, tomorrow)
      ? 'Domani'
      : date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
  return `${day}, ore ${formatClock(iso)}`
}

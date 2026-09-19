import {
  CalendarDays,
  Car,
  Check,
  ChevronRight,
  Info,
  MapPin,
  Sparkles,
  Sun,
  TriangleAlert,
  User,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RoadIcon } from '../../../components/icons'
import CloseRoomSection from '../../../components/room/CloseRoomSection'
import EventDetailsSheet from '../../../components/room/EventDetailsSheet'
import MembersSection from '../../../components/room/MembersSection'
import ReadinessBanner from '../../../components/room/ReadinessBanner'
import TripHero from '../../../components/room/TripHero'
import WeatherStrip from '../../../components/room/WeatherStrip'
import { CATEGORY } from '../../../components/room/activityCategories'
import AlertBanner from '../../../components/ui/AlertBanner'
import Avatar, { AvatarGroup } from '../../../components/ui/Avatar'
import Button from '../../../components/ui/Button'
import Card from '../../../components/ui/Card'
import CardTitle from '../../../components/ui/CardTitle'
import Chip from '../../../components/ui/Chip'
import { useRoomContext } from '../../../hooks/useRoomContext'
import { useRoomOptimistic } from '../../../hooks/useRoomOptimistic'
import { ASSETS } from '../../../lib/assets'
import { computeBalances } from '../../../lib/balances'
import { delayTitle } from '../../../lib/delays'
import { formatClock, formatCountdown, formatMoney } from '../../../lib/format'
import { confirmMemberPresence } from '../../../lib/mutations'
import { readinessWindow } from '../../../lib/readiness'
import { dayPlan, myCarOf, peopleInCar, planWindow } from '../../../lib/roomView'
import { showToast } from '../../../lib/toast'

const MAX_REMINDERS = 4

// Stanza: l'hub della stanza. Ogni card riassume una sezione e porta lì
// (Auto, Bacheca, Radar); in fondo quello che non ha un blocco nel mockup ma
// resta indispensabile: invito, link di recupero, archiviazione.
export default function StanzaPage() {
  const ctx = useRoomContext()
  const { room, currentMember, members, cars, carPassengers, delayReports, dataIncomplete, phase, refetch, goTo } = ctx
  const navigate = useNavigate()
  const optimistic = useRoomOptimistic(room.id)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  const myCar = myCarOf(currentMember.id, cars, carPassengers)
  const aboard = myCar ? peopleInCar(myCar, carPassengers, members) : []
  const driver = aboard[0]
  const iDrive = myCar?.driver_member_id === currentMember.id
  const confirmed = members.filter((m) => m.confirmed)
  const pending = members.filter((m) => !m.confirmed)
  const activeDelays = delayReports.filter((d) => !d.resolved_at)
  const hasDestination = room.destination_lat !== null && room.destination_lng !== null
  const departure = room.event_time ? Date.parse(room.event_time) : null
  const plan = planWindow(dayPlan(room, ctx.activities, now), 3)

  const balance = dataIncomplete ? null : (computeBalances(ctx).find((b) => b.memberId === currentMember.id)?.net ?? 0)
  const needsConfirmation = phase === 'pre' && !currentMember.confirmed

  // "Il tuo stato": una frase su di te e, se manca, l'unica azione che serve.
  const status = dataIncomplete
    ? { title: 'Dati da verificare', hint: 'Ricarica prima di fare i conti', chip: null, action: refetch }
    : needsConfirmation
      ? { title: 'Ci sei anche tu?', hint: 'Tocca per confermare', chip: null, action: confirmPresence }
      : !myCar
        ? { title: 'Senza passaggio', hint: 'Trova un posto in auto', chip: null, action: () => goTo('auto') }
        : {
            title: iDrive ? 'Guidi tu!' : 'Pronto a partire!',
            hint: balance && balance < 0 ? `Devi ${formatMoney(-balance)} al gruppo` : 'Tutto ok per oggi',
            chip: 'Presenza OK',
            action: () => goTo(balance && balance < 0 ? 'spese' : 'radar'),
          }

  const mine = ctx.roomChecklistItems
    .filter((item) => item.assigned_to === currentMember.id)
    .sort((a, b) => Number(a.status === 'portato') - Number(b.status === 'portato'))
  // Senza voci assegnate a te, il promemoria mostra la lista del gruppo.
  const reminders = (mine.length > 0 ? mine : ctx.roomChecklistItems).slice(0, MAX_REMINDERS)

  async function confirmPresence() {
    if (confirming) return
    setConfirming(true)
    try {
      await optimistic(
        'members.confirmPresence',
        (prev) => ({
          ...prev,
          members: prev.members.map((m) =>
            m.id === currentMember.id ? { ...m, confirmed: true, confirmed_at: new Date().toISOString() } : m,
          ),
        }),
        () => confirmMemberPresence(currentMember.id),
        'Conferma non salvata. Riprova.',
      )
    } catch {
      showToast('Conferma non salvata. Controlla la connessione.', 'error')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="flex flex-col">
      {dataIncomplete && (
        <AlertBanner
          tone="danger"
          title="Alcuni dati non sono disponibili"
          className="mb-[7px]"
          action={
            <Button variant="outline" size="sm" onClick={refetch}>
              Riprova
            </Button>
          }
        >
          Posti e saldi devono essere verificati prima di fare i conti.
        </AlertBanner>
      )}

      <TripHero room={room} phase={phase} size="large" onDetails={() => setDetailsOpen(true)} />
      <EventDetailsSheet room={room} open={detailsOpen} onClose={() => setDetailsOpen(false)} />

      {readinessWindow(room.event_time, now) === 'none' ? (
        <div className="h-5" />
      ) : (
        <div className="my-[7px]">
          <ReadinessBanner
            room={room}
            currentMember={currentMember}
            members={members}
            cars={cars}
            carPassengers={carPassengers}
            onGoToAuto={() => goTo('auto')}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-[7px]">
        <Card onClick={status.action} label={`Il tuo stato: ${status.title}. ${status.hint}`} className="h-[107px]">
          <CardTitle icon={User} title="Il tuo stato" circle={27} chevron />
          <div className="mt-[7px] flex items-center gap-2">
            <Avatar name={currentMember.display_name} seed={currentMember.id} size={58} />
            <div className="min-w-0">
              <p className="flex items-center gap-[3px] text-[13.5px] font-bold text-fg">
                <span className="truncate">{status.title}</span>
                {status.chip && <Sparkles aria-hidden="true" size={12} className="shrink-0 fill-warning text-warning" />}
              </p>
              <p className="mb-1.5 mt-0.5 truncate text-[10.5px] leading-[1.25] text-fg-muted">{status.hint}</p>
              {status.chip ? (
                <Chip tone="brand">
                  <Check aria-hidden="true" size={11} strokeWidth={2.6} /> {status.chip}
                </Chip>
              ) : needsConfirmation ? (
                <Chip tone="warning">{confirming ? 'Conferma…' : 'Conferma presenza'}</Chip>
              ) : null}
            </div>
          </div>
        </Card>

        <Card onClick={() => goTo('auto')} label="Auto e guida" className="relative h-[107px]">
          <CardTitle icon={Car} title="Auto e guida" tone="blue" circle={27} chevron />
          {myCar ? (
            <>
              <Chip tone="blue" className="absolute right-[9px] top-8 !px-2 !py-1 !text-[10px]">
                {aboard.length}/{myCar.seats_total} posti
              </Chip>
              <div className="mt-1.5 pr-14">
                <p className="truncate text-[13.5px] font-bold leading-[1.2] text-fg">
                  {iDrive ? 'La tua auto' : `Auto di ${driver?.display_name ?? '—'}`}
                </p>
                <p className="mt-px truncate text-[10.5px] leading-[1.25] text-fg-muted">
                  {iDrive ? 'Guidi tu' : `Condotta da ${driver?.display_name ?? '—'}`}
                </p>
              </div>
              {ASSETS.car && (
                <img
                  src={ASSETS.car}
                  alt=""
                  className="absolute bottom-[5px] right-1.5 w-[74px] mix-blend-multiply"
                  draggable={false}
                />
              )}
              <div className="absolute bottom-2 left-[9px]">
                <AvatarGroup people={aboard} max={4} size={26} />
              </div>
            </>
          ) : (
            <div className="mt-1.5">
              <p className="text-[13.5px] font-bold leading-[1.2] text-fg">Nessun posto</p>
              <p className="mt-px text-[10.5px] leading-[1.25] text-fg-muted">
                {cars.length === 0 ? 'Ancora nessuna auto nel gruppo' : `${cars.length} auto nel gruppo: scegline una`}
              </p>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-[7px] grid grid-cols-2 gap-[7px]">
        <Card onClick={() => goTo('radar')} label="Stato del gruppo" className="min-h-[110px]">
          <CardTitle icon={Users} title="Stato del gruppo" tone="purple" circle={27} chevron />
          <div className="mt-2">
            <p className="text-[14px] font-bold leading-[1.2] text-fg">
              {confirmed.length} di {members.length} con voi
            </p>
            <p className="mt-0.5 truncate text-[10.5px] leading-[1.25] text-fg-muted">
              {pending.length === 0
                ? 'Tutti pronti per oggi!'
                : `Manca ${pending
                    .slice(0, 2)
                    .map((m) => m.display_name)
                    .join(', ')}${pending.length > 2 ? ` e altri ${pending.length - 2}` : ''}`}
            </p>
          </div>
          <div className="mt-[9px] flex items-center gap-1.5">
            {members.slice(0, 4).map((m) => (
              <span key={m.id} className="relative shrink-0">
                <Avatar name={m.display_name} seed={m.id} size={27} className={m.confirmed ? '' : 'opacity-50'} />
                <span
                  className={`absolute -bottom-px -right-px h-2 w-2 rounded-full border-[1.5px] border-surface ${m.confirmed ? 'bg-brand' : 'bg-line-dashed'}`}
                />
              </span>
            ))}
            {members.length > 4 && (
              <span className="flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-full bg-track text-[9.5px] font-semibold text-fg-muted">
                +{members.length - 4}
              </span>
            )}
            <span className="sr-only">
              {confirmed.length} confermati: {confirmed.map((m) => m.display_name).join(', ')}
            </span>
          </div>
        </Card>

        <Card onClick={() => goTo('auto')} label="Meteo e ritrovo" className="min-h-[110px]">
          <CardTitle icon={Sun} title="Meteo e arrivo" tone="warning" circle={27} chevron />
          <div className="mt-[7px] h-6">
            {hasDestination ? (
              <WeatherStrip
                variant="compact"
                lat={room.destination_lat!}
                lng={room.destination_lng!}
                eventTime={room.event_time}
                place={room.destination_label}
              />
            ) : (
              <p className="pt-1 text-[10px] leading-tight text-fg-muted">Meteo quando c’è il luogo</p>
            )}
          </div>
          <div className="mb-1.5 mt-[7px] h-px bg-divider" />
          <div className="flex items-center gap-1.5">
            <Car aria-hidden="true" size={18} strokeWidth={1.8} className="shrink-0 text-fg" />
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-semibold leading-[1.2] text-fg">Ritrovo</p>
              <p className="truncate text-[9.5px] leading-[1.25] text-fg-muted">
                {departure === null
                  ? 'Orario da decidere'
                  : departure > now
                    ? `Tra ${formatCountdown(departure, now)}`
                    : phase === 'in_corso'
                      ? 'In viaggio'
                      : 'È ora!'}
              </p>
            </div>
            <p className="text-[15px] font-bold text-fg">{room.event_time ? formatClock(room.event_time) : '--:--'}</p>
            <ChevronRight aria-hidden="true" size={12} strokeWidth={2.2} className="shrink-0 text-fg-muted" />
          </div>
        </Card>
      </div>

      <Card className="relative mt-[7px] min-h-[144px]">
        <CardTitle
          as="h2"
          icon={CalendarDays}
          title="Piano di oggi"
          circle={27}
          action={
            <button
              type="button"
              onClick={() => goTo('attivita')}
              className="press -my-2 flex min-h-11 items-center gap-0.5 pl-2 text-[10.5px] text-fg-muted"
            >
              Vedi tutto <ChevronRight aria-hidden="true" size={12} strokeWidth={2.2} />
            </button>
          }
        />
        <div className="mt-1.5 flex gap-2">
          {plan.length === 0 ? (
            <div className="min-w-0 flex-1 py-2">
              <p className="text-[11px] font-semibold text-fg">Ancora nessuna tappa per oggi</p>
              <p className="mt-0.5 text-[9.5px] leading-[1.35] text-fg-muted">
                Aggiungete le tappe al programma: le vedrete qui in ordine d’orario.
              </p>
              <Button size="sm" variant="soft" className="mt-2" onClick={() => goTo('attivita')}>
                Apri il programma
              </Button>
            </div>
          ) : (
            <ol className="relative min-w-0 flex-1">
              <span aria-hidden="true" className="absolute bottom-[17px] left-[42px] top-[17px] w-[1.5px] bg-track" />
              {plan.map((entry) => {
                const Icon = entry.kind === 'ritrovo' ? RoadIcon : entry.kind === 'altro' ? MapPin : CATEGORY[entry.kind].icon
                return (
                  <li key={entry.id} className="relative flex h-[34px] items-center">
                    <span className="w-9 shrink-0 text-[11.5px] font-bold text-fg">{formatClock(entry.at)}</span>
                    <span className="flex w-3.5 shrink-0 justify-center">
                      <span className={`h-2 w-2 rounded-full ${entry.past ? 'bg-brand' : 'bg-line-dashed'}`} />
                    </span>
                    <span aria-hidden="true" className="ml-1 mr-2 h-3.5 w-px shrink-0 bg-track" />
                    <Icon aria-hidden="true" size={13} strokeWidth={1.9} className="mr-1.5 mt-px shrink-0 self-start text-fg-soft" />
                    <span className="min-w-0 self-start">
                      <span className="block truncate text-[11px] font-semibold leading-[1.15] text-fg">{entry.title}</span>
                      {entry.detail && (
                        <span className="block truncate text-[9.5px] leading-[1.25] text-fg-muted">{entry.detail}</span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ol>
          )}
          {ASSETS.lunch && (
            <div className="relative -mb-0.5 h-[100px] w-[150px] shrink-0 self-end overflow-hidden rounded-[10px] max-[379px]:w-[120px]">
              <img src={ASSETS.lunch} alt="" className="h-full w-full object-cover" draggable={false} />
              <p
                aria-hidden="true"
                className="font-hand absolute bottom-1.5 left-2 -rotate-[10deg] text-[15px] leading-[0.9] text-white [text-shadow:0_1px_5px_rgb(0_0_0/50%)]"
              >
                Buon
                <br />
                viaggio
                <br />
                insieme! ♡
              </p>
            </div>
          )}
        </div>
      </Card>

      <div className="mt-[7px] grid grid-cols-2 gap-[7px]">
        <Card onClick={() => goTo('bacheca')} label="Promemoria: apri la bacheca" className="min-h-[108px]">
          <CardTitle icon={Check} title="Promemoria" tone="warning" chevron />
          {reminders.length === 0 ? (
            <p className="mt-[7px] text-[10.5px] leading-[1.35] text-fg-muted">
              Niente da portare per ora. La lista si compila in Bacheca.
            </p>
          ) : (
            <ul className="mt-[7px] flex flex-col gap-px">
              {reminders.map((item) => {
                const done = item.status === 'portato'
                return (
                  <li key={item.id} className="flex h-[18px] items-center gap-[7px]">
                    {done ? (
                      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded bg-brand">
                        <Check aria-hidden="true" size={10} strokeWidth={3.4} className="text-white" />
                      </span>
                    ) : (
                      <span className="h-3.5 w-3.5 shrink-0 rounded border-[1.5px] border-line-dashed bg-surface" />
                    )}
                    <span className="truncate text-[10.5px] text-fg">
                      {item.title}
                      <span className="sr-only">{done ? ' (fatto)' : ' (da fare)'}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <div className="min-h-[108px] overflow-hidden rounded-card border border-line bg-surface p-[9px] shadow-card">
          <CardTitle icon={TriangleAlert} title="Avvisi e ritardi" tone="danger" />
          {activeDelays.length > 0 ? (
            activeDelays.slice(0, 1).map((delay) => {
              const car = cars.find((c) => c.id === delay.car_id)
              const carDriver = members.find((m) => m.id === car?.driver_member_id)
              return (
                <button
                  key={delay.id}
                  type="button"
                  onClick={() => goTo('auto')}
                  className="press mt-1.5 flex h-[30px] w-full items-center gap-[7px] rounded-lg bg-danger-soft pl-[9px] pr-[7px] text-left shadow-[inset_3px_0_0_var(--color-danger)]"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface">
                    <Car aria-hidden="true" size={12} className="text-danger" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[10.5px] font-bold leading-[1.15] text-danger-text">
                      {delayTitle(delay.reason)}
                    </span>
                    <span className="block truncate text-[9.5px] leading-[1.2] text-danger-text">
                      {delay.minutes_estimate ? `+${delay.minutes_estimate} min · ` : ''}
                      {carDriver ? `auto di ${carDriver.display_name}` : 'un’auto'}
                    </span>
                  </span>
                  <ChevronRight aria-hidden="true" size={12} strokeWidth={2.2} className="shrink-0 text-danger-text" />
                </button>
              )
            })
          ) : (
            <div className="mt-1.5 flex h-[30px] items-center gap-[7px] rounded-lg bg-brand-soft px-[9px]">
              <Check aria-hidden="true" size={13} strokeWidth={2.4} className="shrink-0 text-brand-text" />
              <p className="text-[10.5px] font-bold text-brand-text">Nessun ritardo segnalato</p>
            </div>
          )}
          <div className="mt-[5px] flex h-7 items-center gap-[7px] rounded-lg bg-blue-soft px-[7px]">
            <Info aria-hidden="true" size={15} className="shrink-0 text-blue" />
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold leading-[1.15] text-fg">
                {activeDelays.length > 1 ? `Altri ${activeDelays.length - 1} avvisi in Auto` : 'Nessun altro avviso'}
              </p>
              <p className="truncate text-[9px] leading-[1.2] text-fg-muted">Ti aggiorneremo in tempo reale</p>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-1.5 flex items-center justify-center gap-2 text-[9.5px] text-fg-muted">
        <span aria-hidden="true" className="text-[12px]">←</span>
        Scorri per esplorare le altre sezioni
        <span aria-hidden="true" className="text-[12px]">→</span>
      </p>

      <div className="mt-4 flex flex-col gap-[7px]">
        <MembersSection
          room={room}
          currentMember={currentMember}
          members={members}
          cars={cars}
          carPassengers={carPassengers}
          canInvite={phase === 'pre'}
        />
        {!dataIncomplete && (
          <CloseRoomSection
            room={room}
            currentMember={currentMember}
            cars={cars}
            carPassengers={carPassengers}
            carExpenses={ctx.carExpenses}
            generalExpenses={ctx.generalExpenses}
            generalExpenseParticipants={ctx.generalExpenseParticipants}
            settlements={ctx.settlements}
            onGoToSpese={() => goTo('spese')}
            onClosed={() => navigate('/')}
          />
        )}
      </div>
    </div>
  )
}

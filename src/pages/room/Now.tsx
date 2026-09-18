import { Bell, CalendarClock, CarFront, ListChecks, MapPin, UsersRound } from 'lucide-react'
import AlertBanner from '../../components/ui/AlertBanner'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Chip from '../../components/ui/Chip'
import EmptyState from '../../components/ui/EmptyState'
import SectionHeader from '../../components/ui/SectionHeader'
import Timeline from '../../components/ui/Timeline'
import { AvatarGroup } from '../../components/ui/Avatar'
import MyCarCard from '../../components/room/MyCarCard'
import PersonalSummary from '../../components/room/PersonalSummary'
import ReadinessBanner from '../../components/room/ReadinessBanner'
import WeatherStrip from '../../components/room/WeatherStrip'
import { useRoomContext } from '../../hooks/useRoomContext'
import { formatEventTime } from '../../lib/format'
import { todayPlan } from '../../lib/todayPlan'

const MAX_PLAN_ENTRIES = 4

// Home operativa: mostra ciò che conta adesso, non tutto ciò che esiste.
// Ogni card appare solo quando ha qualcosa da dire, così la schermata non
// diventa il muro di informazioni dei mockup.
export default function Now() {
  const ctx = useRoomContext()
  const { room, currentMember, members, cars, carPassengers, delayReports, dataIncomplete, refetch, goTo } = ctx

  const activeDelays = delayReports.filter((d) => !d.resolved_at)
  const hasDestination = room.destination_lat !== null && room.destination_lng !== null
  const confirmed = members.filter((m) => m.confirmed)
  const pending = members.filter((m) => !m.confirmed)

  const fullPlan = todayPlan(ctx)
  const plan = fullPlan.slice(0, MAX_PLAN_ENTRIES)

  // Promemoria: solo le voci di checklist che riguardano me e non sono fatte.
  const myReminders = ctx.roomChecklistItems.filter(
    (item) => item.assigned_to === currentMember.id && item.status === 'da_portare',
  )

  return (
    <div className="space-y-6">
      {dataIncomplete && (
        <AlertBanner
          tone="danger"
          title="Alcuni dati non sono disponibili"
          action={
            <Button variant="outline" size="sm" onClick={refetch}>
              Riprova
            </Button>
          }
        >
          Posti e saldi devono essere verificati prima di fare i conti.
        </AlertBanner>
      )}

      {activeDelays.map((delay) => {
        const car = cars.find((c) => c.id === delay.car_id)
        const driver = members.find((m) => m.id === car?.driver_member_id)
        return (
          <AlertBanner
            key={delay.id}
            tone="warn"
            title={`Ritardo dichiarato${driver ? ` · auto di ${driver.display_name}` : ''}`}
            action={
              <Button variant="outline" size="sm" onClick={() => goTo('viaggio')}>
                Vedi in Viaggio
              </Button>
            }
          >
            {delay.reason}
            {delay.minutes_estimate ? ` · circa ${delay.minutes_estimate} minuti` : ''}
          </AlertBanner>
        )
      })}

      <PersonalSummary
        room={room}
        currentMember={currentMember}
        members={members}
        cars={cars}
        carPassengers={carPassengers}
        carExpenses={ctx.carExpenses}
        generalExpenses={ctx.generalExpenses}
        generalExpenseParticipants={ctx.generalExpenseParticipants}
        settlements={ctx.settlements}
        dataIncomplete={dataIncomplete}
        onGoToAuto={() => goTo('viaggio')}
        onGoToSpese={() => goTo('gruppo')}
      />

      <ReadinessBanner
        room={room}
        currentMember={currentMember}
        members={members}
        cars={cars}
        carPassengers={carPassengers}
        onGoToAuto={() => goTo('viaggio')}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-label="Auto e guida">
          <SectionHeader
            icon={CarFront}
            title="Auto e guida"
            action={
              <Button variant="ghost" size="sm" onClick={() => goTo('viaggio')}>
                Dettagli
              </Button>
            }
          />
          <MyCarCard
            currentMember={currentMember}
            members={members}
            cars={cars}
            carPassengers={carPassengers}
            onOpenTrip={() => goTo('viaggio')}
          />
        </section>

        <section aria-label="Stato del gruppo">
          <SectionHeader
            icon={UsersRound}
            title="Stato del gruppo"
            hint={`${confirmed.length} di ${members.length} confermati`}
            action={
              <Button variant="ghost" size="sm" onClick={() => goTo('gruppo')}>
                Vedi tutti
              </Button>
            }
          />
          <Card>
            <AvatarGroup people={members} max={6} size="md" />
            <p className="mt-3 text-[13px] leading-relaxed text-fg-muted">
              {pending.length === 0
                ? 'Tutti hanno confermato la presenza.'
                : `In attesa di ${pending
                    .slice(0, 3)
                    .map((m) => m.display_name)
                    .join(', ')}${pending.length > 3 ? ` e altri ${pending.length - 3}` : ''}.`}
            </p>
          </Card>
        </section>

        <section aria-label="Destinazione e meteo">
          <SectionHeader
            icon={MapPin}
            title="Destinazione"
            action={
              <Button variant="ghost" size="sm" onClick={() => goTo('viaggio')}>
                Percorso
              </Button>
            }
          />
          <Card>
            <p className="text-sm font-medium text-fg">
              {room.destination_label || 'Destinazione da scegliere'}
            </p>
            <p className="mt-1.5 flex items-center gap-2 text-[13px] text-fg-muted">
              <CalendarClock aria-hidden="true" size={15} className="shrink-0" />
              {room.event_time ? formatEventTime(room.event_time) : 'Data da scegliere'}
            </p>
            {hasDestination && (
              <WeatherStrip lat={room.destination_lat!} lng={room.destination_lng!} eventTime={room.event_time} />
            )}
          </Card>
        </section>

        <section aria-label="Piano di oggi">
          <SectionHeader
            icon={ListChecks}
            title="Piano di oggi"
            action={
              fullPlan.length > MAX_PLAN_ENTRIES ? (
                <Button variant="ghost" size="sm" onClick={() => goTo('viaggio')}>
                  Vedi tutto
                </Button>
              ) : undefined
            }
          />
          <Card>
            <Timeline entries={plan} />
          </Card>
        </section>
      </div>

      {myReminders.length > 0 && (
        <section aria-label="Promemoria">
          <SectionHeader
            icon={Bell}
            title="I tuoi promemoria"
            hint="Voci della checklist assegnate a te"
            action={
              <Button variant="ghost" size="sm" onClick={() => goTo('gruppo')}>
                Apri checklist
              </Button>
            }
          />
          <ul className="space-y-1.5">
            {myReminders.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-3.5 py-2.5 shadow-card"
              >
                <span className="min-w-0 truncate text-[13px] text-fg">{item.title}</span>
                <Chip tone="warn">da portare</Chip>
              </li>
            ))}
          </ul>
        </section>
      )}

      {members.length === 1 && (
        <EmptyState
          icon={UsersRound}
          title="Per ora ci sei solo tu"
          hint="Condividi l’invito: posti, spese e checklist si organizzano insieme."
          action={
            <Button variant="surface" size="sm" onClick={() => goTo('gruppo')}>
              Invita amici
            </Button>
          }
        />
      )}
    </div>
  )
}

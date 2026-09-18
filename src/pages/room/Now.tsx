import { CalendarClock, MapPin } from 'lucide-react'
import AlertBanner from '../../components/ui/AlertBanner'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import SectionHeader from '../../components/ui/SectionHeader'
import PersonalSummary from '../../components/room/PersonalSummary'
import ReadinessBanner from '../../components/room/ReadinessBanner'
import WeatherStrip from '../../components/room/WeatherStrip'
import { AvatarGroup } from '../../components/ui/Avatar'
import { useRoomContext } from '../../hooks/useRoomContext'
import { formatEventTime } from '../../lib/format'

// Home operativa: mostra ciò che conta adesso, non tutto ciò che esiste.
export default function Now() {
  const ctx = useRoomContext()
  const { room, currentMember, members, cars, carPassengers, delayReports, dataIncomplete, refetch, goTo } = ctx

  const activeDelays = delayReports.filter((d) => !d.resolved_at)
  const hasDestination = room.destination_lat !== null && room.destination_lng !== null

  return (
    <div className="space-y-5">
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

      <div className="grid gap-5 md:grid-cols-2">
        <section aria-label="Stato del gruppo">
          <SectionHeader
            title="Stato del gruppo"
            hint={`${members.filter((m) => m.confirmed).length} di ${members.length} confermati`}
            action={
              <Button variant="ghost" size="sm" onClick={() => goTo('gruppo')}>
                Vedi tutti
              </Button>
            }
          />
          <Card>
            <AvatarGroup people={members} max={6} size="md" />
            <p className="mt-3 text-[13px] leading-relaxed text-fg-muted">
              {members.filter((m) => !m.confirmed).length === 0
                ? 'Tutti hanno confermato la presenza.'
                : `${members.filter((m) => !m.confirmed).length} non hanno ancora confermato.`}
            </p>
          </Card>
        </section>

        <section aria-label="Destinazione e meteo">
          <SectionHeader
            title="Destinazione"
            action={
              <Button variant="ghost" size="sm" onClick={() => goTo('viaggio')}>
                Dettagli
              </Button>
            }
          />
          <Card>
            <p className="flex items-center gap-2 text-sm font-medium text-fg">
              <MapPin aria-hidden="true" size={16} className="shrink-0 text-accent" />
              {room.destination_label || 'Destinazione da scegliere'}
            </p>
            <p className="mt-2 flex items-center gap-2 text-[13px] text-fg-muted">
              <CalendarClock aria-hidden="true" size={15} className="shrink-0" />
              {room.event_time ? formatEventTime(room.event_time) : 'Data da scegliere'}
            </p>
            {hasDestination && (
              <WeatherStrip
                lat={room.destination_lat!}
                lng={room.destination_lng!}
                eventTime={room.event_time}
              />
            )}
          </Card>
        </section>
      </div>
    </div>
  )
}

import { CarFront, ListChecks, MapPin } from 'lucide-react'
import { useState } from 'react'
import AlertBanner from '../../components/ui/AlertBanner'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import ProgressBar from '../../components/ui/ProgressBar'
import SectionHeader from '../../components/ui/SectionHeader'
import Timeline from '../../components/ui/Timeline'
import MapSheet from '../../components/MapSheet'
import AutoTab from '../../components/room/AutoTab'
import DepartureCard from '../../components/room/DepartureCard'
import DestinationCard from '../../components/room/DestinationCard'
import { useRoomContext } from '../../hooks/useRoomContext'
import { todayPlan } from '../../lib/todayPlan'

// Logistica dello spostamento: quando si parte, dove, con chi, e tutto il
// coordinamento delle auto durante il viaggio.
export default function Trip() {
  const ctx = useRoomContext()
  const { room, currentMember, phase, sectionErrors, refetch, goTo } = ctx
  const [routeOpen, setRouteOpen] = useState(false)

  const plan = todayPlan(ctx)
  const checklist = ctx.roomChecklistItems
  const packed = checklist.filter((item) => item.status === 'portato').length

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
    <div className="space-y-6">
      <DepartureCard room={room} phase={phase} onOpenRoute={() => setRouteOpen(true)} />
      {room.destination_lat !== null && room.destination_lng !== null && (
        <MapSheet
          open={routeOpen}
          onClose={() => setRouteOpen(false)}
          lat={room.destination_lat}
          lng={room.destination_lng}
        />
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-label="Punto di ritrovo">
          <SectionHeader icon={MapPin} title="Punto di ritrovo" hint="Dove e quando vi trovate" />
          <DestinationCard room={room} />
        </section>

        {plan.length > 1 && (
          <section aria-label="Come sta andando">
            <SectionHeader icon={ListChecks} title="Come sta andando" />
            <Card>
              <Timeline entries={plan} />
            </Card>
          </section>
        )}
      </div>

      {checklist.length > 0 && (
        <section aria-label="Lista condivisa">
          <SectionHeader
            icon={ListChecks}
            title="Lista condivisa"
            hint={`${packed} di ${checklist.length} già sistemati`}
            action={
              <Button variant="ghost" size="sm" onClick={() => goTo('gruppo')}>
                Gestisci
              </Button>
            }
          />
          <Card>
            <ProgressBar
              value={packed}
              max={checklist.length}
              tone={packed === checklist.length ? 'ok' : 'accent'}
              label="Avanzamento della lista condivisa"
            />
            <p className="mt-2 text-[13px] text-fg-muted">
              {packed === checklist.length
                ? 'Tutto quello che serve è già a bordo.'
                : `Mancano ancora ${checklist.length - packed} ${
                    checklist.length - packed === 1 ? 'voce' : 'voci'
                  }.`}
            </p>
          </Card>
        </section>
      )}

      <section aria-label="Auto e passaggi">
        <SectionHeader icon={CarFront} title="Auto e passaggi" hint="Posti, stati di viaggio e soste" />
        <AutoTab
          roomId={room.id}
          currentMember={currentMember}
          members={ctx.members}
          cars={ctx.cars}
          carPassengers={ctx.carPassengers}
          carExpenses={ctx.carExpenses}
          carCargo={ctx.carCargo}
          delayReports={ctx.delayReports}
          stopProposals={ctx.stopProposals}
          stopProposalVotes={ctx.stopProposalVotes}
          rideRequests={ctx.rideRequests}
        />
      </section>
    </div>
  )
}

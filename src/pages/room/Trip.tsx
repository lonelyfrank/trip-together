import AlertBanner from '../../components/ui/AlertBanner'
import Button from '../../components/ui/Button'
import AutoTab from '../../components/room/AutoTab'
import DestinationCard from '../../components/room/DestinationCard'
import SectionHeader from '../../components/ui/SectionHeader'
import { useRoomContext } from '../../hooks/useRoomContext'

// Logistica dello spostamento: punto di ritrovo, auto, posti, stati di
// viaggio, ritardi, soste e richieste di passaggio.
export default function Trip() {
  const ctx = useRoomContext()
  const { room, currentMember, sectionErrors, refetch } = ctx

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
      <section aria-label="Punto di ritrovo">
        <SectionHeader title="Punto di ritrovo" hint="Dove e quando vi trovate" />
        <DestinationCard room={room} />
      </section>

      <section aria-label="Auto e passaggi">
        <SectionHeader title="Auto e passaggi" hint="Posti, stati di viaggio e soste" />
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

import { useNavigate } from 'react-router-dom'
import AlertBanner from '../../components/ui/AlertBanner'
import Button from '../../components/ui/Button'
import SectionHeader from '../../components/ui/SectionHeader'
import BachecaTab from '../../components/room/BachecaTab'
import PaymentsSummaryCard from '../../components/room/PaymentsSummaryCard'
import CloseRoomSection from '../../components/room/CloseRoomSection'
import MembersSection from '../../components/room/MembersSection'
import PollsSection from '../../components/room/PollsSection'
import RadarTab from '../../components/room/RadarTab'
import SpeseTab from '../../components/room/SpeseTab'
import { useRoomContext } from '../../hooks/useRoomContext'
import { computePayments } from '../../lib/payments'

// Centro di coordinamento: chi c'è, chi ha pagato, chi porta cosa, cosa è
// stato deciso, dove sono tutti.
export default function Group() {
  const ctx = useRoomContext()
  const navigate = useNavigate()
  const { room, currentMember, phase, sectionErrors, refetch, dataIncomplete, goTo } = ctx

  const sectionError = (
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

  return (
    <div className="space-y-7">
      <MembersSection
        room={room}
        currentMember={currentMember}
        members={ctx.members}
        cars={ctx.cars}
        carPassengers={ctx.carPassengers}
        canInvite={phase === 'pre'}
      />

      <section aria-label="Spese condivise">
        <SectionHeader title="Spese condivise" hint="Totali, quote e chi ha pagato" />
        {sectionErrors.spese ? (
          sectionError
        ) : (
          <div className="space-y-3">
            <PaymentsSummaryCard
              summary={computePayments({
                members: ctx.members,
                cars: ctx.cars,
                carPassengers: ctx.carPassengers,
                carExpenses: ctx.carExpenses,
                generalExpenses: ctx.generalExpenses,
                generalExpenseParticipants: ctx.generalExpenseParticipants,
                settlements: ctx.settlements,
              })}
              currentMemberId={currentMember.id}
              dataIncomplete={dataIncomplete}
            />
            <SpeseTab
              roomId={room.id}
              currentMember={currentMember}
              members={ctx.members}
              cars={ctx.cars}
              carPassengers={ctx.carPassengers}
              carExpenses={ctx.carExpenses}
              generalExpenses={ctx.generalExpenses}
              generalExpenseParticipants={ctx.generalExpenseParticipants}
              settlements={ctx.settlements}
            />
          </div>
        )}
      </section>

      <section aria-label="Compiti e messaggi">
        <SectionHeader title="Compiti e messaggi" hint="Chi porta cosa, e cosa è stato deciso" />
        {sectionErrors.bacheca ? (
          sectionError
        ) : (
          <BachecaTab
            roomId={room.id}
            currentMember={currentMember}
            members={ctx.members}
            boardNotes={ctx.boardNotes}
            boardLinks={ctx.boardLinks}
            roomChecklistItems={ctx.roomChecklistItems}
          />
        )}
      </section>

      <section aria-label="Sondaggi del gruppo">
        {sectionErrors.sondaggi ? (
          sectionError
        ) : (
          <PollsSection
            roomId={room.id}
            currentMember={currentMember}
            memberCount={ctx.members.length}
            polls={ctx.polls}
            pollOptions={ctx.pollOptions}
            pollVotes={ctx.pollVotes}
          />
        )}
      </section>

      <section aria-label="Posizione del gruppo">
        <SectionHeader title="Posizione del gruppo" hint="Visibile solo a chi la condivide" />
        {sectionErrors.radar ? (
          sectionError
        ) : (
          <RadarTab
            room={room}
            currentMember={currentMember}
            members={ctx.members}
            radarPositions={ctx.radarPositions}
          />
        )}
      </section>

      {!dataIncomplete && (
        <section aria-label="Impostazioni evento">
          <SectionHeader title="Impostazioni evento" />
          <CloseRoomSection
            room={room}
            currentMember={currentMember}
            cars={ctx.cars}
            carPassengers={ctx.carPassengers}
            carExpenses={ctx.carExpenses}
            generalExpenses={ctx.generalExpenses}
            generalExpenseParticipants={ctx.generalExpenseParticipants}
            settlements={ctx.settlements}
            onGoToSpese={() => goTo('gruppo')}
            onClosed={() => navigate('/')}
          />
        </section>
      )}
    </div>
  )
}

import { CalendarPlus, Compass } from 'lucide-react'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import SectionHeader from '../../components/ui/SectionHeader'
import { useRoomContext } from '../../hooks/useRoomContext'

// L'itinerario non ha ancora un modello dati: nessuna tabella `activities`,
// e `rooms` porta un solo `event_time`. Qui non si mostrano dati finti — si
// dichiara cosa manca e si offre l'unica azione oggi possibile (fissare data
// e luogo dell'evento), finché il blocco SQL delle attività non è applicato.
export default function Activities() {
  const { goTo } = useRoomContext()

  return (
    <div className="space-y-5">
      <SectionHeader
        icon={Compass}
        title="Attività"
        hint="Il vostro itinerario, giorno per giorno"
      />

      <EmptyState
        icon={CalendarPlus}
        title="L’itinerario non è ancora attivo"
        hint="Questa sezione arriva con il prossimo aggiornamento del database: potrete aggiungere tappe con orario, luogo e chi partecipa. Per ora data e destinazione si impostano dal punto di ritrovo."
        action={
          <Button variant="surface" size="sm" onClick={() => goTo('viaggio')}>
            Vai al punto di ritrovo
          </Button>
        }
      />
    </div>
  )
}

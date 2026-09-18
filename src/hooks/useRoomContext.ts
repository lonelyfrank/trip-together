import { useOutletContext } from 'react-router-dom'
import type { RoomPayload } from './useRoomData'
import type { RoomPhase } from '../lib/phase'
import type { Member, Room } from '../types'

export type RoomSection = 'adesso' | 'viaggio' | 'attivita' | 'gruppo'

// La shell legge la stanza una volta sola e la passa alle sezioni tramite
// l'outlet di react-router: se ogni sezione chiamasse useRoomData aprirebbe un
// secondo canale realtime per la stessa stanza. Nessuno store nuovo.
// `room` è garantita non-null dalla shell, e `error` resta fuori: quando la
// lettura principale fallisce la shell non monta affatto le sezioni, quindi
// una sezione non ha modo di trovarselo valorizzato. Gli errori che le
// riguardano sono in `sectionErrors`.
export interface RoomContextValue extends Omit<RoomPayload, 'room' | 'error'> {
  room: Room
  currentMember: Member
  dataIncomplete: boolean
  phase: RoomPhase
  refetch: () => void
  goTo: (section: RoomSection) => void
}

export function useRoomContext(): RoomContextValue {
  return useOutletContext<RoomContextValue>()
}

import type { RoomStatus, TravelStatus } from '../types'

export type RoomPhase = 'pre' | 'in_corso' | 'concluso'

/**
 * Fase del viaggio, calcolata lato client da due segnali già presenti:
 * lo stato della stanza (chiusa → concluso) e lo stato di viaggio delle
 * auto (una sola partita basta per considerare il gruppo "in corso" — non
 * si aspetta che partano tutte insieme).
 */
export function roomPhase(roomStatus: RoomStatus, carTravelStatuses: TravelStatus[]): RoomPhase {
  if (roomStatus === 'closed') return 'concluso'
  if (carTravelStatuses.some((status) => status !== 'non_partita')) return 'in_corso'
  return 'pre'
}

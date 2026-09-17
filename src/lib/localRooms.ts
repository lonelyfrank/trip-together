// Preferenze di navigazione del device. I codici sono segreti di invito;
// l'autorizzazione effettiva dipende dalla sessione e dalle RLS sul server.

const ROOMS_KEY = 'tripTogether:rooms'
const CREWS_KEY = 'tripTogether:crews'
const NAME_KEY = 'tripTogether:myName'

export interface SavedRoomEntry {
  roomId: string
  memberId: string
  inviteCode: string
}

export interface SavedCrewEntry {
  crewId: string
  crewMemberId: string
  inviteCode: string
}

export function getSavedRooms(): SavedRoomEntry[] {
  try {
    const raw = localStorage.getItem(ROOMS_KEY)
    return raw ? (JSON.parse(raw) as SavedRoomEntry[]) : []
  } catch {
    return []
  }
}

export function saveRoomEntry(entry: SavedRoomEntry) {
  const existing = getSavedRooms().filter((r) => r.roomId !== entry.roomId)
  localStorage.setItem(ROOMS_KEY, JSON.stringify([entry, ...existing]))
}

export function getSavedRoomEntry(roomId: string): SavedRoomEntry | null {
  return getSavedRooms().find((r) => r.roomId === roomId) ?? null
}

export function getSavedCrews(): SavedCrewEntry[] {
  try {
    const raw = localStorage.getItem(CREWS_KEY)
    return raw ? (JSON.parse(raw) as SavedCrewEntry[]) : []
  } catch {
    return []
  }
}

export function saveCrewEntry(entry: SavedCrewEntry) {
  const existing = getSavedCrews().filter((c) => c.crewId !== entry.crewId)
  localStorage.setItem(CREWS_KEY, JSON.stringify([entry, ...existing]))
}

export function getSavedCrewEntry(crewId: string): SavedCrewEntry | null {
  return getSavedCrews().find((c) => c.crewId === crewId) ?? null
}

export function getMyName(): string {
  return localStorage.getItem(NAME_KEY) ?? ''
}

export function setMyName(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return
  localStorage.setItem(NAME_KEY, trimmed)
}

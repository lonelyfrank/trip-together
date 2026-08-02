// Livello 0 identità: nessun account, quindi il device deve ricordarsi da solo
// a quali stanze appartiene e con quale member_id. Nessun dato sensibile,
// solo id/nomi già pubblici all'interno della stanza stessa.

const ROOMS_KEY = 'tripTogether:rooms'
const CREW_KEY = 'tripTogether:crew'
const NAME_KEY = 'tripTogether:myName'

export interface SavedRoomEntry {
  roomId: string
  memberId: string
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

export function getCrew(): string[] {
  try {
    const raw = localStorage.getItem(CREW_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function addToCrew(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return
  const crew = getCrew()
  if (crew.includes(trimmed)) return
  localStorage.setItem(CREW_KEY, JSON.stringify([...crew, trimmed]))
}

export function getMyName(): string {
  return localStorage.getItem(NAME_KEY) ?? ''
}

export function setMyName(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return
  localStorage.setItem(NAME_KEY, trimmed)
  addToCrew(trimmed)
}

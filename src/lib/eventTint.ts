// Nessuna categoria evento è salvata nello schema — assegna un accento
// colore stabile per stanza (hash dell'id) solo per varietà visiva.
const TINTS = ['#E8A33D', '#46D9C9', '#8FB98A', '#7FA096'] as const

export function tintForRoom(roomId: string): string {
  let hash = 0
  for (let i = 0; i < roomId.length; i++) {
    hash = (hash * 31 + roomId.charCodeAt(i)) | 0
  }
  return TINTS[Math.abs(hash) % TINTS.length]
}

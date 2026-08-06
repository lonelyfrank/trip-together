// Token di recupero L1: nessuna tabella nuova, nessuna migration. Il token è
// il base64url di {roomId, memberId, inviteCode} — le stesse informazioni già
// salvate in localRooms.ts per riconoscere "chi sono" in una stanza. Visitare
// /resume/:token su un device nuovo (o dopo aver perso lo storage) ripristina
// quella mappatura, verificando solo che il membro esista ancora nella
// stanza. Coerente col modello attuale: le RLS sono permissive, l'accesso è
// già scoped dall'id/invite-code non indovinabile, non da un segreto.

export interface ResumePayload {
  roomId: string
  memberId: string
  inviteCode: string
}

export function encodeResumeToken(payload: ResumePayload): string {
  const base64 = btoa(JSON.stringify(payload))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeResumeToken(token: string): ResumePayload | null {
  try {
    const base64 = token.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const parsed: unknown = JSON.parse(atob(padded))
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      typeof (parsed as ResumePayload).roomId === 'string' &&
      typeof (parsed as ResumePayload).memberId === 'string' &&
      typeof (parsed as ResumePayload).inviteCode === 'string'
    ) {
      return parsed as ResumePayload
    }
    return null
  } catch {
    return null
  }
}

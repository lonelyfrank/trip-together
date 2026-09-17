// Il link contiene il codice invito: chi lo riceve può recuperare questo membro.
// claim_member verifica il codice sul server e aggiunge il nuovo device senza
// revocare l'accesso a quello originale. Base64url è un formato, non cifratura.

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

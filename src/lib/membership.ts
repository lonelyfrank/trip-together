import { saveRoomEntry, setMyName } from './localRooms'
import { generateRoomCode } from './roomCode'
import { ensureAnonymousSession, supabase } from './supabase'

// Workflow condiviso di ingresso: garantisce la sessione anonima, crea/aggancia
// lo slot-membro, ricorda nome e stanza sul device. Usato sia dalla creazione
// (Home) sia dall'ingresso via codice (Join), così la logica sta in un posto solo.

/** Crea una nuova stanza, entra come creatore, ritorna l'id stanza. */
export async function createRoomAndJoin(title: string, displayName: string): Promise<string> {
  const session = await ensureAnonymousSession()
  const userId = session!.user.id
  const inviteCode = generateRoomCode()

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({ invite_code: inviteCode, title: title.trim(), created_by: userId })
    .select()
    .single()
  if (roomError) throw roomError

  const { data: member, error: memberError } = await supabase
    .from('members')
    .insert({ room_id: room.id, display_name: displayName.trim(), auth_user_id: userId, role: 'creator' })
    .select()
    .single()
  if (memberError) throw memberError

  setMyName(displayName.trim())
  saveRoomEntry({ roomId: room.id, memberId: member.id, inviteCode })
  return room.id
}

export type JoinResult = { roomId: string } | { notFound: true }

/** Entra in una stanza esistente tramite codice invito, ritorna l'id o notFound. */
export async function joinRoomByInviteCode(inviteCode: string, displayName: string): Promise<JoinResult> {
  const session = await ensureAnonymousSession()
  const userId = session!.user.id
  const code = inviteCode.trim().toUpperCase()

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id')
    .eq('invite_code', code)
    .maybeSingle()
  if (roomError) throw roomError
  if (!room) return { notFound: true }

  const { data: member, error: memberError } = await supabase
    .from('members')
    .insert({ room_id: room.id, display_name: displayName.trim(), auth_user_id: userId, role: 'guest' })
    .select()
    .single()
  if (memberError) throw memberError

  setMyName(displayName.trim())
  saveRoomEntry({ roomId: room.id, memberId: member.id, inviteCode: code })
  return { roomId: room.id }
}

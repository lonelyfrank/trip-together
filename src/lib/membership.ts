import { getSavedRoomEntry, saveCrewEntry, saveRoomEntry, setMyName } from './localRooms'
import { generateRoomCode } from './roomCode'
import { ensureAnonymousSession, supabase } from './supabase'

// Workflow condiviso di ingresso: garantisce la sessione anonima, crea/aggancia
// lo slot-membro, ricorda nome, stanze e comitive sul device. Un posto solo per
// tutta la logica, usato da Home, Join, Crew.

// ─── Eventi/stanze ──────────────────────────────────────────────────────

/** Crea una nuova stanza (opzionalmente dentro una comitiva), entra come creatore. */
export async function createRoomAndJoin(title: string, displayName: string, crewId?: string): Promise<string> {
  const session = await ensureAnonymousSession()
  const userId = session!.user.id
  const inviteCode = generateRoomCode()

  const payload: Record<string, unknown> = { invite_code: inviteCode, title: title.trim(), created_by: userId }
  if (crewId) payload.crew_id = crewId

  const { data: room, error: roomError } = await supabase.from('rooms').insert(payload).select().single()
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

/** Entra come membro in una stanza già esistente (usato per gli eventi di una comitiva). */
export async function joinRoomAsMember(roomId: string, inviteCode: string, displayName: string): Promise<void> {
  if (getSavedRoomEntry(roomId)) return // già membro su questo device
  const session = await ensureAnonymousSession()
  const userId = session!.user.id

  const { data: member, error } = await supabase
    .from('members')
    .insert({ room_id: roomId, display_name: displayName.trim(), auth_user_id: userId, role: 'guest' })
    .select()
    .single()
  if (error) throw error

  setMyName(displayName.trim())
  saveRoomEntry({ roomId, memberId: member.id, inviteCode })
}

// ─── Comitive ─────────────────────────────────────────────────────────────

/** Crea una comitiva, entra come creatore, ritorna l'id comitiva. */
export async function createCrew(name: string, displayName: string): Promise<string> {
  const session = await ensureAnonymousSession()
  const userId = session!.user.id
  const inviteCode = generateRoomCode()

  const { data: crew, error: crewError } = await supabase
    .from('crews')
    .insert({ invite_code: inviteCode, name: name.trim(), created_by: userId })
    .select()
    .single()
  if (crewError) throw crewError

  const { data: member, error: memberError } = await supabase
    .from('crew_members')
    .insert({ crew_id: crew.id, display_name: displayName.trim(), auth_user_id: userId, role: 'creator' })
    .select()
    .single()
  if (memberError) throw memberError

  setMyName(displayName.trim())
  saveCrewEntry({ crewId: crew.id, crewMemberId: member.id, inviteCode })
  return crew.id
}

/** Entra come membro in una comitiva esistente (idempotente per device). */
export async function joinCrewAsMember(crewId: string, inviteCode: string, displayName: string): Promise<void> {
  const session = await ensureAnonymousSession()
  const userId = session!.user.id

  const { data: member, error } = await supabase
    .from('crew_members')
    .upsert(
      { crew_id: crewId, display_name: displayName.trim(), auth_user_id: userId, role: 'member' },
      { onConflict: 'crew_id,auth_user_id' },
    )
    .select()
    .single()
  if (error) throw error

  setMyName(displayName.trim())
  saveCrewEntry({ crewId, crewMemberId: member.id, inviteCode })
}

// ─── Risoluzione codice invito (stanza o comitiva) ─────────────────────────

export type ResolvedInvite =
  | { type: 'room'; id: string; inviteCode: string }
  | { type: 'crew'; id: string; inviteCode: string }
  | { type: 'none' }

/** Un codice può appartenere a una stanza o a una comitiva: qui si capisce quale. */
export async function resolveInviteCode(inviteCode: string): Promise<ResolvedInvite> {
  await ensureAnonymousSession()
  const code = inviteCode.trim().toUpperCase()

  const { data: room } = await supabase.from('rooms').select('id').eq('invite_code', code).maybeSingle()
  if (room) return { type: 'room', id: room.id, inviteCode: code }

  const { data: crew } = await supabase.from('crews').select('id').eq('invite_code', code).maybeSingle()
  if (crew) return { type: 'crew', id: crew.id, inviteCode: code }

  return { type: 'none' }
}

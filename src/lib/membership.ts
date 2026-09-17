import { saveCrewEntry, saveRoomEntry, setMyName } from './localRooms'
import { queryClient } from './queryClient'
import { ensureAnonymousSession, supabase } from './supabase'

// L'appartenenza viene verificata dal server anche quando il device conserva
// una voce locale: localStorage ricorda la navigazione, non concede accesso.
async function membershipRpc<T>(name: string, params: Record<string, unknown>): Promise<T> {
  await ensureAnonymousSession()
  const { data, error } = await supabase.rpc(name, params)
  if (error) throw error
  if (data == null) throw new Error('Il server non ha confermato la partecipazione.')
  return data as T
}

type CreatedGroup = { id: string; member_id: string; invite_code: string }

export async function createRoomAndJoin(title: string, displayName: string, crewId?: string): Promise<string> {
  const room = await membershipRpc<CreatedGroup>('create_room_and_join', {
    p_title: title, p_display_name: displayName, p_crew_id: crewId ?? null,
  })
  setMyName(displayName)
  saveRoomEntry({ roomId: room.id, memberId: room.member_id, inviteCode: room.invite_code })
  await queryClient.invalidateQueries({ queryKey: ['my-rooms'] })
  if (crewId) {
    await queryClient.invalidateQueries({ queryKey: ['crew-data', crewId] })
    await queryClient.invalidateQueries({ queryKey: ['my-crews'] })
  }
  return room.id
}

export async function joinRoomAsMember(roomId: string, inviteCode: string, displayName: string): Promise<void> {
  const memberId = await membershipRpc<string>('join_room', {
    p_room_id: roomId, p_invite_code: inviteCode, p_display_name: displayName,
  })
  setMyName(displayName)
  saveRoomEntry({ roomId, memberId, inviteCode: inviteCode.trim().toUpperCase() })
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['my-rooms'] }),
    queryClient.invalidateQueries({ queryKey: ['room-data', roomId] }),
  ])
}

export async function createCrew(name: string, displayName: string): Promise<string> {
  const crew = await membershipRpc<CreatedGroup>('create_crew', { p_name: name, p_display_name: displayName })
  setMyName(displayName)
  saveCrewEntry({ crewId: crew.id, crewMemberId: crew.member_id, inviteCode: crew.invite_code })
  await queryClient.invalidateQueries({ queryKey: ['my-crews'] })
  return crew.id
}

export async function joinCrewAsMember(crewId: string, inviteCode: string, displayName: string): Promise<void> {
  const crewMemberId = await membershipRpc<string>('join_crew', {
    p_crew_id: crewId, p_invite_code: inviteCode, p_display_name: displayName,
  })
  setMyName(displayName)
  saveCrewEntry({ crewId, crewMemberId, inviteCode: inviteCode.trim().toUpperCase() })
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['my-crews'] }),
    queryClient.invalidateQueries({ queryKey: ['crew-data', crewId] }),
  ])
}

export async function claimRoomMember(roomId: string, memberId: string, inviteCode: string): Promise<void> {
  const displayName = await membershipRpc<string>('claim_member', {
    p_room_id: roomId, p_member_id: memberId, p_invite_code: inviteCode,
  })
  saveRoomEntry({ roomId, memberId, inviteCode })
  setMyName(displayName)
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['my-rooms'] }),
    queryClient.invalidateQueries({ queryKey: ['room-data', roomId] }),
  ])
}

export type ResolvedInvite =
  | { type: 'room' | 'crew'; id: string; inviteCode: string }
  | { type: 'none' }

export async function resolveInviteCode(inviteCode: string): Promise<ResolvedInvite> {
  const code = inviteCode.trim().toUpperCase()
  const result = await membershipRpc<{ kind: 'room' | 'crew' | 'none'; id: string | null }>('resolve_invite', { p_code: code })
  if (result.kind === 'none' || !result.id) return { type: 'none' }
  return { type: result.kind, id: result.id, inviteCode: code }
}

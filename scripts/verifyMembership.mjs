// Verifica reale, solo DML: crea una comitiva e un evento isolati, rimuove
// i dati di prova e archivia l'evento. Nessun DDL e nessuna service-role key.
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

process.loadEnvFile('.env')
const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
assert(url && key, 'Configurazione Supabase mancante')
const makeClient = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const owner = makeClient(), visitor = makeClient(), recovery = makeClient(), unauthenticated = makeClient()
const clients = [owner, visitor, recovery, unauthenticated]
const tables = ['rooms', 'members', 'cars', 'car_passengers', 'car_expenses', 'car_cargo', 'delay_reports', 'general_expenses', 'general_expense_participants', 'board_notes', 'board_links', 'radar_positions', 'room_checklist_items', 'stop_proposals', 'stop_proposal_votes', 'ride_requests']
const checked = async (request) => {
  const { data, error } = await request
  if (error) throw new Error(`${error.code ?? 'errore'}: ${error.message}`)
  return data
}
const rpc = (client, name, params) => checked(client.rpc(name, params))
const report = (message) => console.log(`PASS ${message}`)
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
async function until(predicate, message, timeout = 12000) {
  const deadline = Date.now() + timeout
  while (!predicate() && Date.now() < deadline) await pause(100)
  assert(predicate(), message)
}
let room, browser
try {
  for (const client of [owner, visitor, recovery]) await checked(client.auth.signInAnonymously())
  const crew = await rpc(owner, 'create_crew', { p_name: 'Verifica tecnica RLS', p_display_name: 'Verifica creatore' })
  room = await rpc(owner, 'create_room_and_join', { p_title: 'Verifica tecnica RLS', p_display_name: 'Verifica creatore', p_crew_id: crew.id })
  assert.equal(room.invite_code.length, 7)
  const sameCreator = await rpc(owner, 'join_room', { p_room_id: room.id, p_invite_code: room.invite_code, p_display_name: 'Verifica creatore' })
  assert.equal(sameCreator, room.member_id)
  const members = await checked(owner.from('members').select('*').eq('room_id', room.id))
  assert.equal(members.length, 1)
  assert.equal(members[0].role, 'creator')
  report('creazione atomica, codice a 7 caratteri e join idempotente senza perdita del ruolo')

  for (const table of tables) await checked(owner.from(table).select('*').eq(table === 'rooms' ? 'id' : 'room_id', room.id))
  report('16 collezioni leggibili dal membro, nessun errore SQL/RLS')
  for (const table of ['car_expenses', 'car_cargo', 'board_links']) await checked(owner.from(table).select('id,created_at').eq('room_id', room.id).order('created_at').order('id'))
  const expenseId = crypto.randomUUID()
  await checked(owner.from('general_expenses').insert({ id: expenseId, room_id: room.id, label: 'Verifica quote', amount: 10, paid_by_member_id: room.member_id }))
  const participant = { expense_id: expenseId, member_id: room.member_id }
  for (let attempt = 0; attempt < 2; attempt++) await checked(owner.from('general_expense_participants').upsert(participant, { onConflict: 'expense_id,member_id' }))
  assert.equal((await checked(owner.from('general_expense_participants').select('id').eq('expense_id', expenseId))).length, 1)
  assert.equal((await owner.from('general_expense_participants').insert(participant)).error?.code, '23505')
  await checked(owner.from('general_expenses').delete().eq('id', expenseId))
  report('fase 2: created_at disponibili; upsert ripetuto mantiene una quota, INSERT duplicato respinto')

  await checked(owner.from('radar_positions').insert({ room_id: room.id, member_id: room.member_id, lat: 0, lng: 0 }))
  for (const client of [visitor, unauthenticated]) {
    for (const table of ['rooms', 'radar_positions']) assert.deepEqual(await checked(client.from(table).select('*')), [])
  }
  const denied = await visitor.from('board_notes').insert({ room_id: room.id, text: 'Accesso da respingere' })
  assert(denied.error)
  assert((await owner.from('rooms').delete().eq('id', room.id)).error)
  assert((await rpc(visitor, 'list_crew_events', {})).length === 0)
  const invalidJoin = await visitor.rpc('join_room', { p_room_id: room.id, p_invite_code: 'INVALIDO', p_display_name: 'Estraneo' })
  assert(invalidJoin.error)
  report('rooms e radar vuoti senza appartenenza, scrittura estranea e DELETE stanza respinte')

  const resolved = await rpc(visitor, 'resolve_invite', { p_code: ` ${room.invite_code.toLowerCase()} ` })
  assert.deepEqual(resolved, { kind: 'room', id: room.id })
  const crewInvite = await rpc(visitor, 'resolve_invite', { p_code: crew.invite_code })
  assert.deepEqual(crewInvite, { kind: 'crew', id: crew.id })
  const crewMember = await rpc(visitor, 'join_crew', { p_crew_id: crew.id, p_invite_code: crew.invite_code, p_display_name: 'Verifica ospite' })
  assert.equal(await rpc(visitor, 'join_crew', { p_crew_id: crew.id, p_invite_code: crew.invite_code, p_display_name: 'Verifica ospite' }), crewMember)
  assert.equal((await rpc(visitor, 'list_crew_events', { p_crew_id: crew.id }))[0].id, room.id)
  assert.deepEqual(await checked(visitor.from('rooms').select('*')), [])
  report('risoluzione restituisce solo tipo/id, comitiva e scoperta eventi senza accesso anticipato ai dati')

  await owner.realtime.setAuth((await owner.auth.getSession()).data.session.access_token)
  const received = [], deleteUnfiltered = []
  let replicationReady = false, subscriptionReady = false
  const channel = owner.channel(`verify:${room.id}`, { config: { broadcast: { replication_ready: true } } })
    .on('system', {}, (event) => { console.log('REALTIME_SYSTEM', JSON.stringify(event)); if (event.status === 'ok' && event.extension === 'system') replicationReady = true; if (event.status === 'ok' && event.extension === 'postgres_changes') subscriptionReady = true })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'board_notes', filter: `room_id=eq.${room.id}` }, (event) => received.push(event))
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'board_notes' }, (event) => deleteUnfiltered.push(event))
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout sottoscrizione realtime')), 15000)
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') { clearTimeout(timer); resolve() }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { clearTimeout(timer); reject(new Error(`Realtime: ${status}`)) }
    })
  })
  await until(() => replicationReady && subscriptionReady, 'Replica PostgreSQL non pronta', 20000)
  const noteId = crypto.randomUUID()
  await checked(owner.from('board_notes').insert({ id: noteId, room_id: room.id, text: 'Verifica inserimento' }))
  await until(() => received.some((e) => e.eventType === 'INSERT' && e.new.id === noteId), 'INSERT realtime mancante')
  await checked(owner.from('board_notes').update({ text: 'Verifica modifica' }).eq('id', noteId))
  await until(() => received.some((e) => e.eventType === 'UPDATE' && e.new.text === 'Verifica modifica'), 'UPDATE realtime mancante')
  await checked(owner.from('board_notes').delete().eq('id', noteId))
  await until(() => received.some((e) => e.eventType === 'DELETE' && e.old.id === noteId) || deleteUnfiltered.some((e) => e.old.id === noteId), 'DELETE realtime mancante anche senza filtro')
  await pause(700)
  console.log(`REALTIME INSERT=ok UPDATE=ok DELETE_filtrato=${received.some((e) => e.eventType === 'DELETE' && e.old.id === noteId)} DELETE_senza_filtro=${deleteUnfiltered.some((e) => e.old.id === noteId)}`)
  await owner.removeChannel(channel)

  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
  browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined })
  const base = process.env.UI_BASE_URL || 'https://localhost:5173'
  const browserErrors = []
  async function pageFor(client) {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 } })
    const { data: { session } } = await client.auth.getSession()
    await ctx.addInitScript(({ storageKey, session }) => localStorage.setItem(storageKey, JSON.stringify(session)), {
      storageKey: `sb-${new URL(url).hostname.split('.')[0]}-auth-token`, session,
    })
    const page = await ctx.newPage()
    page.on('pageerror', (error) => browserErrors.push(error.message))
    return { ctx, page }
  }
  const guest = await pageFor(visitor)
  await guest.page.goto(`${base}/room/${room.id}`)
  await guest.page.getByRole('heading', { name: 'Serve un invito per aprire questo evento' }).waitFor()
  assert.equal(await guest.page.getByText(room.invite_code, { exact: true }).count(), 0)
  await guest.page.getByLabel('Codice invito').fill(room.invite_code)
  await guest.page.getByRole('button', { name: 'Continua con il codice' }).click()
  await guest.page.getByLabel('Il tuo nome').fill('Verifica ospite')
  await guest.page.getByRole('button', { name: 'Entra nella stanza', exact: true }).click()
  await guest.page.getByRole('heading', { name: 'Verifica tecnica RLS', exact: true }).waitFor()
  await guest.page.getByRole('heading', { name: 'Ci sei anche tu?' }).waitFor()
  for (const tab of ['Auto', 'Bacheca', 'Spese', 'Radar', 'Evento']) {
    await guest.page.getByRole('button', { name: tab, exact: true }).click()
    assert.equal(await guest.page.getByText('Non riusciamo a caricare questa sezione.').count(), 0)
  }
  const guestMember = await rpc(visitor, 'join_room', { p_room_id: room.id, p_invite_code: room.invite_code, p_display_name: 'Verifica ospite' })
  assert.equal((await checked(owner.from('members').select('id').eq('room_id', room.id))).length, 2)
  assert.notEqual(guestMember, room.member_id)
  report('browser: URL senza appartenenza, campo invito, join e tutte le sezioni senza errori')
  await guest.page.getByRole('button', { name: 'Bacheca', exact: true }).click()
  const liveNoteId = crypto.randomUUID()
  await checked(owner.from('board_notes').insert({ id: liveNoteId, room_id: room.id, text: 'Nota realtime iniziale' }))
  await guest.page.getByText('Nota realtime iniziale', { exact: true }).waitFor({ timeout: 8000 })
  await checked(owner.from('board_notes').update({ text: 'Nota realtime modificata' }).eq('id', liveNoteId))
  await guest.page.getByText('Nota realtime modificata', { exact: true }).waitFor({ timeout: 8000 })
  await checked(owner.from('board_notes').delete().eq('id', liveNoteId))
  await guest.page.getByText('Nota realtime modificata', { exact: true }).waitFor({ state: 'detached', timeout: 8000 })
  report('browser: bacheca aggiornata via INSERT/UPDATE/DELETE da un altro device')


  const recovered = await pageFor(recovery)
  const token = Buffer.from(JSON.stringify({ roomId: room.id, memberId: room.member_id, inviteCode: room.invite_code })).toString('base64url')
  await recovered.page.goto(`${base}/resume/${token}`)
  await recovered.page.getByRole('heading', { name: 'Ci sei anche tu?' }).waitFor()
  await recovered.page.getByRole('button', { name: 'Conferma la tua presenza', exact: true }).click()
  await recovered.page.getByRole('heading', { name: 'Troviamo il tuo passaggio' }).waitFor()
  assert.equal((await checked(owner.from('members').select('confirmed').eq('id', room.member_id).single())).confirmed, true)
  assert.equal(await rpc(recovery, 'claim_member', { p_room_id: room.id, p_member_id: room.member_id, p_invite_code: room.invite_code }), 'Verifica creatore')
  await checked(owner.from('members').update({ confirmed: false }).eq('id', room.member_id))
  assert.equal((await checked(recovery.from('members').select('confirmed').eq('id', room.member_id).single())).confirmed, false)
  // Senza entry locale il mapping server consente ancora di ritrovare il membro.
  await recovered.page.evaluate(() => localStorage.removeItem('tripTogether:rooms'))
  await recovered.page.reload()
  await recovered.page.getByRole('heading', { name: 'Ci sei anche tu?' }).waitFor()
  assert.deepEqual(browserErrors, [])
  report('browser: /resume, scrittura sul secondo device, accesso originale conservato, ripristino senza entry locale')
  await guest.ctx.close()
  await recovered.ctx.close()
} finally {
  if (browser) await browser.close()
  if (room) {
    for (const table of ['board_notes', 'radar_positions', 'general_expenses']) await checked(owner.from(table).delete().eq('room_id', room.id))
    await checked(owner.from('rooms').update({ status: 'closed' }).eq('id', room.id))
    console.log('CLEANUP dati temporanei rimossi; evento di verifica archiviato nella comitiva isolata.')
  }
  for (const client of clients) await client.removeAllChannels()
}

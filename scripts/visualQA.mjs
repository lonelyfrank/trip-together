// QA visivo delle cinque tab della stanza con API simulate (nessuna scrittura
// sul database reale). Dati simili a quelli dei mockup, per confrontare gli
// screenshot con reference-png/ e reference-html/ del handoff.
//   UI_BASE_URL=https://localhost:5183 node scripts/visualQA.mjs [cartella]
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { chromium } from './browser.mjs'

const base = process.env.UI_BASE_URL || 'https://localhost:5183'
const out = process.argv[2] || '/tmp/trip-visual-qa'
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined })

const roomId = '11111111-1111-4111-8111-111111111111'
const now = Date.now()
const at = (minutes) => new Date(now + minutes * 60_000).toISOString()
const start = new Date(Math.ceil((now + 80 * 60_000) / (15 * 60_000)) * 15 * 60_000).toISOString()
const plus = (iso, minutes) => new Date(Date.parse(iso) + minutes * 60_000).toISOString()
const m = (id, name, extra = {}) => ({ id, room_id: roomId, display_name: name, auth_user_id: null, role: 'guest', confirmed: true, confirmed_at: at(-600), created_at: at(-900), ...extra })
const members = [
  m('m-marco', 'Marco', { auth_user_id: 'user', role: 'creator' }),
  m('m-anna', 'Anna'), m('m-luca', 'Luca'), m('m-giulia', 'Giulia'), m('m-sara', 'Sara', { confirmed: false, confirmed_at: null }),
  m('m-chiara', 'Chiara'), m('m-matteo', 'Matteo'),
]
const car = (id, driver, seats, status) => ({ id, room_id: roomId, driver_member_id: driver, seats_total: seats, travel_status: status, travel_status_updated_at: at(-12), travel_status_updated_by: driver, created_at: at(-800) })
const tables = {
  rooms: [{ id: roomId, title: 'Weekend in Salento', invite_code: 'SALE24', crew_id: null, destination_label: 'Area di servizio Bari Nord', destination_lat: 41.1087, destination_lng: 16.7613, event_time: start, status: 'open', created_by: 'user', created_at: at(-1000) }],
  member_devices: [{ member_id: 'm-marco' }],
  members,
  cars: [car('car-marco', 'm-marco', 5, 'non_partita'), car('car-chiara', 'm-chiara', 4, 'non_partita')],
  car_passengers: ['m-anna', 'm-luca', 'm-giulia', 'm-sara'].map((id, i) => ({ id: `cp-${i}`, car_id: 'car-marco', member_id: id })).concat([{ id: 'cp-9', car_id: 'car-chiara', member_id: 'm-matteo' }]),
  car_expenses: [
    { id: 'ce-1', car_id: 'car-marco', label: 'Carburante', amount: 20, paid_by_member_id: 'm-marco', created_at: at(-300) },
    { id: 'ce-2', car_id: 'car-marco', label: 'Pedaggio A14', amount: 8, paid_by_member_id: 'm-marco', created_at: at(-200) },
  ],
  car_cargo: ['Valigia Marco', 'Zaino Anna', 'Trolley Luca', 'Borsa Giulia', 'Valigia Sara'].map((item, i) => ({ id: `cg-${i}`, car_id: 'car-marco', item, packed: true, created_at: at(-400 + i) })),
  delay_reports: [{ id: 'd-1', car_id: 'car-chiara', reason: 'traffico', minutes_estimate: 15, reported_by: 'm-chiara', created_at: at(-8), resolved_at: null }],
  general_expenses: [
    { id: 'g-1', room_id: roomId, label: 'Casa vacanze', amount: 240, paid_by_member_id: 'm-chiara', waived: false, waived_by_member_id: null, created_at: at(-2000) },
    { id: 'g-2', room_id: roomId, label: 'Pranzo al mare', amount: 125, paid_by_member_id: 'm-marco', waived: false, waived_by_member_id: null, created_at: at(-1500) },
    { id: 'g-3', room_id: roomId, label: 'Spesa comune Conad', amount: 55, paid_by_member_id: 'm-giulia', waived: false, waived_by_member_id: null, created_at: at(-600) },
  ],
  general_expense_participants: [
    ...members.slice(0, 6).map((mm, i) => ({ id: `gp-1-${i}`, expense_id: 'g-1', member_id: mm.id })),
    ...members.slice(0, 5).map((mm, i) => ({ id: `gp-2-${i}`, expense_id: 'g-2', member_id: mm.id })),
    ...members.slice(1, 7).map((mm, i) => ({ id: `gp-3-${i}`, expense_id: 'g-3', member_id: mm.id })),
  ],
  board_notes: [
    { id: 'n-1', room_id: roomId, text: 'Ritrovo alle 09:30 al casello di Bari Nord', pinned: true, created_at: at(-700) },
    { id: 'n-2', room_id: roomId, text: 'Check-in appartamento all’arrivo a Gallipoli', pinned: true, created_at: at(-650) },
  ],
  board_links: [
    { id: 'l-1', room_id: roomId, label: 'Appartamento a Gallipoli', url: 'example.com/casa', created_at: at(-900) },
    { id: 'l-2', room_id: roomId, label: 'La Puritate · menù', url: 'example.com/menu', created_at: at(-800) },
    { id: 'l-3', room_id: roomId, label: 'Percorso Bari Nord → Gallipoli', url: 'example.com/percorso', created_at: at(-700) },
  ],
  radar_positions: [
    { member_id: 'm-anna', room_id: roomId, lat: 40.0589, lng: 17.9868, updated_at: at(-2) },
    { member_id: 'm-luca', room_id: roomId, lat: 40.0431, lng: 18.0036, updated_at: at(-1) },
  ],
  room_checklist_items: [
    ['Fare il pieno', 'm-marco', 'da_portare'], ['Snack e acqua', 'm-anna', 'portato'], ['Documenti e assicurazione', 'm-luca', 'portato'],
    ['Cavi di ricarica', 'm-marco', 'da_portare'], ['Kit d’emergenza', 'm-sara', 'da_portare'],
  ].map(([title, assigned_to, status], i) => ({ id: `ck-${i}`, room_id: roomId, title, assigned_to, status, created_by: 'm-marco', created_at: at(-500 + i) })),
  stop_proposals: [], stop_proposal_votes: [], ride_requests: [],
  activities: [
    { id: 'a-1', room_id: roomId, title: 'Arrivo a Gallipoli', starts_at: plus(start, 120), duration_minutes: null, category: 'mare', place_label: 'Gallipoli', lat: 40.0559, lng: 17.9925, status: 'confermata', price_per_person: null, note: 'Check-in appartamento', created_by: 'm-marco', created_at: at(-900) },
    { id: 'a-2', room_id: roomId, title: 'Pranzo da La Puritate', starts_at: plus(start, 210), duration_minutes: 90, category: 'cibo', place_label: 'Cucina tipica sul mare', lat: null, lng: null, status: 'prenotata', price_per_person: 30, note: null, created_by: 'm-anna', created_at: at(-800) },
  ],
  activity_participants: [],
  room_polls: [{ id: 'p-1', room_id: roomId, question: 'Dove ceniamo stasera?', closes_at: null, created_by: 'm-anna', created_at: at(-300) }],
  room_poll_options: ['Pizzeria sul porto', 'Pesce alla brace', 'Cucina in casa'].map((label, i) => ({ id: `po-${i}`, poll_id: 'p-1', room_id: roomId, label, created_at: at(-300) })),
  room_poll_votes: [['m-marco', 0], ['m-anna', 0], ['m-luca', 0], ['m-giulia', 0], ['m-sara', 1], ['m-chiara', 1], ['m-matteo', 2]].map(([member_id, o]) => ({ poll_id: 'p-1', option_id: `po-${o}`, member_id, room_id: roomId, voted_at: at(-100) })),
  expense_settlements: [{ id: 's-1', room_id: roomId, from_member_id: 'm-luca', to_member_id: 'm-chiara', amount: 30, note: 'contanti', recorded_by: 'm-luca', settled_at: at(-50), created_at: at(-50) }],
}

async function open(viewport) {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, serviceWorkers: 'block', timezoneId: 'Europe/Rome', viewport, deviceScaleFactor: 2, hasTouch: false })
  await ctx.addInitScript(({ roomId }) => {
    localStorage.setItem('tripTogether:rooms', JSON.stringify([{ roomId, memberId: 'm-marco', inviteCode: 'SALE24' }]))
    localStorage.setItem('tripTogether:myName', 'Marco')
  }, { roomId })
  const requests = []
  await ctx.route('**/*.supabase.co/**', (route) => {
    const req = route.request(), url = new URL(req.url()), table = url.pathname.split('/').pop(), method = req.method()
    requests.push({ table, method })
    if (url.pathname.includes('/auth/')) return route.fulfill({ json: { access_token: 'mock', refresh_token: 'mock', expires_in: 3600, token_type: 'bearer', user: { id: 'user', aud: 'authenticated', role: 'authenticated' } } })
    if (url.pathname.includes('/rpc/')) return route.fulfill({ json: [] })
    if (method !== 'GET' && method !== 'HEAD') return route.fulfill({ status: 201, json: [] })
    const rows = tables[table] ?? []
    return route.fulfill({ json: req.headers().accept?.includes('object') ? rows[0] ?? null : rows })
  })
  // Il meteo reale dipende dalla rete: una risposta fissa rende gli screenshot confrontabili.
  await ctx.route('https://api.open-meteo.com/**', (route) => route.fulfill({ json: { current: { temperature_2m: 26, weather_code: 0 }, daily: { time: [], weather_code: [], temperature_2m_max: [], temperature_2m_min: [] } } }))
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (msg) => { if (msg.type() === 'error' && !/tile\.openstreetmap|fonts\.g/.test(msg.text())) errors.push(msg.text()) })
  return { ctx, page, errors, requests }
}

const TABS = ['stanza', 'auto', 'bacheca', 'spese', 'radar']
try {
  for (const [name, viewport] of [['430', { width: 430, height: 932 }], ['390', { width: 390, height: 844 }], ['430-tall', { width: 430, height: 2600 }]]) {
    const { ctx, page, errors } = await open(viewport)
    for (const tab of TABS) {
      await page.goto(`${base}/room/${roomId}?tab=${tab}`)
      await page.locator('nav[aria-label="Sezioni"] [aria-current="page"]').waitFor()
      assert.equal(await page.locator('nav[aria-label="Sezioni"] [aria-current="page"]').innerText(), tab[0].toUpperCase() + tab.slice(1))
      await page.waitForTimeout(700)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `overflow orizzontale in ${tab}`)
      await page.screenshot({ path: `${out}/${name}-${tab}.png` })
    }
    assert.deepEqual(errors, [])
    await ctx.close()
  }
  console.log('PASS 5 tab a 430, 390 e viewport alta, nessun overflow orizzontale, nessun errore in console')

  {
    const { ctx, page, errors, requests } = await open({ width: 430, height: 932 })
    await page.goto(`${base}/room/${roomId}?tab=stanza`)
    await page.getByRole('region', { name: 'Stanza' }).waitFor()
    // Swipe verso sinistra: Stanza → Auto.
    await page.mouse.move(330, 520); await page.mouse.down()
    for (let x = 330; x >= 170; x -= 20) await page.mouse.move(x, 525)
    await page.mouse.up()
    await page.waitForTimeout(450)
    assert.equal(new URL(page.url()).searchParams.get('tab'), 'auto')
    assert.equal(await page.locator('nav[aria-label="Sezioni"] [aria-current="page"]').innerText(), 'Auto')
    // Gesto verticale: nessun cambio di tab.
    await page.mouse.move(215, 500); await page.mouse.down()
    for (let y = 500; y >= 300; y -= 25) await page.mouse.move(225, y)
    await page.mouse.up(); await page.waitForTimeout(400)
    assert.equal(new URL(page.url()).searchParams.get('tab'), 'auto')
    // Trascinamento corto: torna indietro.
    await page.mouse.move(300, 520); await page.mouse.down(); await page.mouse.move(260, 522); await page.mouse.move(250, 522); await page.mouse.up()
    await page.waitForTimeout(450)
    assert.equal(new URL(page.url()).searchParams.get('tab'), 'auto')
    // Tap sulla barra, e una sola pagina nel DOM a riposo.
    await page.locator('nav[aria-label="Sezioni"]').getByRole('button', { name: 'Radar' }).click()
    await page.waitForTimeout(450)
    assert.equal(new URL(page.url()).searchParams.get('tab'), 'radar')
    assert.equal(await page.locator('section[aria-label="Radar"]').count(), 1)
    await page.waitForFunction(() => document.querySelectorAll('section[aria-label="Auto"], section[aria-label="Stanza"]').length === 0)
    // Radar: mai automatico.
    assert.equal(requests.filter((r) => r.table === 'radar_positions' && r.method !== 'GET').length, 0)
    await page.getByText('Condivisione posizione disattivata di default').waitFor()
    await page.getByRole('button', { name: 'Condividi la mia posizione' }).waitFor()
    // Card-hub di Stanza: Promemoria → Bacheca.
    await page.locator('nav[aria-label="Sezioni"]').getByRole('button', { name: 'Stanza' }).click()
    await page.waitForTimeout(450)
    await page.getByRole('button', { name: 'Promemoria: apri la bacheca' }).click()
    await page.waitForTimeout(450)
    assert.equal(new URL(page.url()).searchParams.get('tab'), 'bacheca')
    // Link legacy: /room/:id/viaggio → tab Auto.
    await page.goto(`${base}/room/${roomId}/viaggio`)
    await page.waitForURL(/tab=auto/)
    // Pannello spesa da header di Spese.
    await page.goto(`${base}/room/${roomId}?tab=spese`)
    await page.getByRole('button', { name: 'Aggiungi spesa' }).first().click()
    await page.getByRole('dialog').waitFor()
    await page.screenshot({ path: `${out}/430-spese-sheet.png` })
    assert.deepEqual(errors, [])
    console.log('PASS swipe orizzontale, gesto verticale ignorato, rimbalzo, tap barra, una sola pagina montata, radar spento, hub Stanza, link legacy, sheet spesa')
    await ctx.close()
  }
} finally {
  await browser.close()
}

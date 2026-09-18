// Build di produzione e service worker reali, API simulate: nessun dato remoto.
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from './browser.mjs'
try { process.loadEnvFile('.env') } catch { /* CI usa le variabili d'ambiente. */ }
const api = process.env.VITE_SUPABASE_URL
assert(api, 'Imposta VITE_SUPABASE_URL come nella build da verificare.')
const base = process.env.UI_BASE_URL || 'https://localhost:4173'
// Chromium non consente l'installazione in incognito: serve un profilo temporaneo.
const profile = await mkdtemp(join(tmpdir(), 'trip-pwa-'))
let ctx
try {
  ctx = await chromium.launchPersistentContext(profile, { headless: true, ignoreHTTPSErrors: true, args: ['--ignore-certificate-errors'], executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined })
  let connected = true, writes = 0
  await ctx.route(`${api}/**`, (route) => {
    if (!connected) return route.abort('internetdisconnected')
    if (route.request().method() === 'POST') writes++
    return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, json: [{ id: 'dato-sessione-a' }] })
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(base, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Crea un evento', exact: true }).waitFor()
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  const manifest = await page.evaluate(async () => {
    const link = document.querySelector('link[rel="manifest"]')
    return (await fetch(link.href)).json()
  })
  assert.equal(manifest.name, 'Trip Together')
  assert.equal(manifest.display, 'standalone')
  assert(manifest.icons.some((icon) => icon.src === '/favicon.svg'))
  const devtools = await ctx.newCDPSession(page)
  const { installabilityErrors } = await devtools.send('Page.getInstallabilityErrors')
  assert.deepEqual(installabilityErrors, [], 'La PWA deve avere un manifest installabile')
  const endpoint = `${api}/rest/v1/board_notes?select=id&room_id=eq.verifica-pwa`
  const request = (token, method = 'GET', target = endpoint) => page.evaluate(async ({ target, token, method }) => {
    try {
      const response = await fetch(target, { method, headers: { Authorization: `Bearer ${token}`, apikey: 'test' } })
      return response.ok ? { data: await response.json() } : { failed: true }
    } catch { return { failed: true } }
  }, { target, token, method })
  assert.deepEqual(await request('sessione-a'), { data: [{ id: 'dato-sessione-a' }] })
  await page.waitForFunction(async () => (await (await caches.open('trip-supabase-reads-v1')).keys()).length > 0)
  const keys = await page.evaluate(async () => (await (await caches.open('trip-supabase-reads-v1')).keys()).map((request) => ({ url: request.url, auth: request.headers.get('Authorization'), method: request.method })))
  assert(keys.every((key) => !key.url.includes('sessione-a') && key.auth === null && key.method === 'GET'))
  await request('sessione-a', 'GET', `${api}/auth/v1/user`)
  await request('sessione-a', 'POST')
  assert.equal(writes, 1)
  connected = false
  await ctx.setOffline(true)
  const reload = await page.reload({ waitUntil: 'domcontentloaded' })
  assert(reload.fromServiceWorker())
  await page.getByRole('button', { name: 'Crea un evento', exact: true }).waitFor()
  assert.deepEqual(await request('sessione-a'), { data: [{ id: 'dato-sessione-a' }] })
  assert.deepEqual(await request('sessione-b'), { failed: true })
  assert.deepEqual(await request('sessione-a', 'POST'), { failed: true })
  assert.deepEqual(await request('sessione-a', 'GET', `${api}/auth/v1/user`), { failed: true })
  connected = true
  await ctx.setOffline(false)
  await page.waitForTimeout(1000)
  assert.equal(writes, 1)
  assert.deepEqual(errors, [])
  console.log('PASS PWA: manifest, shell ricaricato offline, GET dalla cache della stessa sessione, isolamento fra sessioni, auth/POST non in cache e nessun replay POST')
} finally {
  await ctx?.close()
  await rm(profile, { recursive: true, force: true })
}

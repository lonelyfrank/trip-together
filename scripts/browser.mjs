// Playwright è uno strumento effimero (npm exec), non una dipendenza dell'app.
import { existsSync } from 'node:fs'
import { delimiter, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

let modulePath = process.env.PLAYWRIGHT_MODULE
if (!modulePath) {
  const candidates = [resolve('node_modules/playwright/index.mjs'), ...(process.env.PATH ?? '').split(delimiter).map((bin) => resolve(bin, '../playwright/index.mjs'))]
  modulePath = candidates.find((candidate) => existsSync(candidate))
}
if (!modulePath) throw new Error('Playwright non trovato. Esegui: npx --yes --package=playwright@1.62.1 -c "npm run test:ui"')
export const { chromium } = await import(pathToFileURL(modulePath).href)

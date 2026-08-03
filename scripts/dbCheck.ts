// Controllo schema da terminale: `npm run db:check`.
// Riusa la stessa lista di tabelle attese del controllo runtime (unica fonte).
// Nessuna dipendenza esterna: usa fetch + process.loadEnvFile nativi di Node.

import { EXPECTED_TABLES, PROBE_COLUMN } from '../src/lib/expectedSchema.ts'

try {
  process.loadEnvFile('.env')
} catch {
  // .env assente: si prova comunque con le variabili d'ambiente già presenti
}

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Mancano VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (in .env o nell\'ambiente).')
  process.exit(1)
}

const present: string[] = []
const missing: string[] = []

for (const table of EXPECTED_TABLES) {
  const column = PROBE_COLUMN[table] ?? 'id'
  const res = await fetch(`${url}/rest/v1/${table}?select=${column}&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  if (res.ok) present.push(table)
  else missing.push(table)
}

console.log(`Tabelle presenti: ${present.length}/${EXPECTED_TABLES.length}`)

if (missing.length > 0) {
  console.log(`\nMANCANTI (${missing.length}):`)
  for (const t of missing) console.log(`  · ${t}`)
  console.log('\n→ applica le migration (o supabase/CATCH_UP.sql) sul progetto Supabase.')
  process.exit(1)
}

console.log('Schema completo ✅')

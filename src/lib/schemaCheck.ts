import { EXPECTED_TABLES, PROBE_COLUMN } from './expectedSchema'
import { supabase } from './supabase'

// Controllo di osservabilità: in DEV, all'avvio, verifica che le tabelle attese
// esistano davvero sul database collegato e stampa un riepilogo leggibile delle
// mancanti. Nessun effetto in produzione (chiamato solo dietro import.meta.env.DEV).

export async function checkSchema(): Promise<void> {
  const missing: string[] = []

  await Promise.all(
    EXPECTED_TABLES.map(async (table) => {
      const column = PROBE_COLUMN[table] ?? 'id'
      const { error } = await supabase.from(table).select(column).limit(1)
      // Tabella assente → PostgREST risponde con errore (404 / relation does not exist).
      if (error) missing.push(table)
    }),
  )

  if (missing.length === 0) {
    console.info(
      `%c[schema] ok — tutte le ${EXPECTED_TABLES.length} tabelle attese sono presenti`,
      'color:#46d9c9',
    )
    return
  }

  console.warn(
    `[schema] ${missing.length}/${EXPECTED_TABLES.length} tabelle MANCANTI sul DB collegato:\n` +
      missing.map((t) => `  · ${t}`).join('\n') +
      `\n→ esegui nell’SQL Editor di Supabase i blocchi necessari di supabase/migrations/20260724000000_schema.sql.`,
  )
}

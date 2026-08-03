import type { PostgrestError } from '@supabase/supabase-js'

// Wrapper unico per le query di lettura: restituisce un risultato esplicito a
// TRE stati, così una tabella inesistente (fail) e una lista realmente vuota
// (empty) non collassano più nello stesso stato. Un errore non è mai silenzioso:
// viene sempre loggato con l'etichetta "tabella.operazione".

export type Query<T> =
  | { kind: 'ok'; data: T }
  | { kind: 'empty' }
  | { kind: 'fail'; error: PostgrestError }

interface Response<T> {
  data: T | null
  error: PostgrestError | null
}

export async function query<T>(label: string, builder: PromiseLike<Response<T>>): Promise<Query<T>> {
  const { data, error } = await builder
  if (error) {
    console.error(`[db] ${label} — ${error.message}`)
    return { kind: 'fail', error }
  }
  if (data === null || (Array.isArray(data) && data.length === 0)) {
    return { kind: 'empty' }
  }
  return { kind: 'ok', data }
}

/** Righe di una query-lista: dati se ok, altrimenti array vuoto (empty o fail). */
export function rows<T>(q: Query<T[]>): T[] {
  return q.kind === 'ok' ? q.data : []
}

/** Dato singolo: la riga se ok, altrimenti null (empty o fail). */
export function single<T>(q: Query<T>): T | null {
  return q.kind === 'ok' ? q.data : null
}

/** Primo errore tra più query, o null se nessuna è fallita. */
export function firstError(...qs: Query<unknown>[]): PostgrestError | null {
  for (const q of qs) if (q.kind === 'fail') return q.error
  return null
}

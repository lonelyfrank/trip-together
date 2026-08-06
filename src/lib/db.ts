import type { PostgrestError } from '@supabase/supabase-js'
import type { Op } from './mutations/room'
import { isOnline } from './online'
import { enqueueOp } from './offlineQueue'
import { showToast } from './toast'

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

// Wrapper unico per le scritture (insert/update/delete/upsert): centralizza le
// mutazioni e garantisce che un errore non sia mai silenzioso (log con
// "tabella.operazione"). Ritorna { data, error } così chi crea una riga può
// leggerne il risultato. Se si è offline, l'Op viene accodato (vedi
// src/lib/offlineQueue.ts) invece di tentare una fetch destinata a fallire, e
// la scrittura torna "riuscita" (error: null, data: null) perché è solo
// rimandata a quando si torna online. Gli Op con queueable:false (radar)
// tentano comunque la fetch e falliscono normalmente: non vanno mai in coda.
export async function mutate<T = null>(
  label: string,
  op: Op<T>,
): Promise<{ data: T | null; error: PostgrestError | null }> {
  if (!isOnline() && op.queueable !== false) {
    enqueueOp(op, label)
    return { data: null, error: null }
  }
  const res = await op.run()
  if (res.error) console.error(`[db] ${label} — ${res.error.message}`)
  return { data: res.data ?? null, error: res.error }
}

/**
 * Come mutate ma, in caso di errore, mostra anche un toast. Per le scritture non
 * ottimistiche (tipicamente INSERT, dove l'optimistic creerebbe id temporanei in
 * conflitto col realtime): l'utente riceve comunque feedback, non solo la console.
 */
export async function mutateNotify<T = null>(
  label: string,
  op: Op<T>,
  errorMessage = 'Operazione non riuscita.',
): Promise<{ data: T | null; error: PostgrestError | null }> {
  const res = await mutate(label, op)
  if (res.error) showToast(errorMessage, 'error')
  return res
}

import { orderCollection } from './collectionOrder.ts'

type Row = Record<string, unknown>
const keyOf = (row: Row) => String(row.id ?? `${row.proposal_id ?? ''}|${row.member_id ?? ''}`)
const same = (a: Row, b: Row) => Object.keys({ ...a, ...b }).every((key) => Object.is(a[key], b[key]))

function revertFields(before: Row, applied: Row, current: Row): Row {
  const next = { ...current }
  for (const key of Object.keys({ ...before, ...applied })) {
    // Conserva anche le modifiche realtime ad altri campi della stessa riga.
    if (!Object.is(before[key], applied[key]) && Object.is(current[key], applied[key])) {
      if (key in before) next[key] = before[key]
      else delete next[key]
    }
  }
  return next
}

// Ricava l'inverso della sola patch: i chiamanti descrivono già quali righe
// cambiano, non devono mantenere una seconda implementazione del rollback.
export function createOptimisticRollback<T extends object>(before: T, applied: T): (current: T) => T {
  return (current) => {
    const next = { ...current }
    for (const key of Object.keys(before) as (keyof T)[]) {
      if (before[key] === applied[key]) continue
      if (Array.isArray(before[key]) && Array.isArray(applied[key]) && Array.isArray(current[key])) {
        const oldRows = new Map((before[key] as Row[]).map((row) => [keyOf(row), row]))
        const newRows = new Map((applied[key] as Row[]).map((row) => [keyOf(row), row]))
        const rows = (current[key] as Row[]).flatMap((row) => {
          const id = keyOf(row), old = oldRows.get(id), optimistic = newRows.get(id)
          if (!old && optimistic && same(row, optimistic)) return []
          return [old && optimistic && old !== optimistic ? revertFields(old, optimistic, row) : row]
        })
        for (const [id, row] of oldRows) {
          if (!newRows.has(id) && !rows.some((currentRow) => keyOf(currentRow) === id)) rows.push(row)
        }
        const table = String(key).replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
        next[key] = orderCollection(table, rows) as T[keyof T]
      } else if (key === 'room' && before[key] && applied[key] && current[key]) {
        next[key] = revertFields(before[key] as Row, applied[key] as Row, current[key] as Row) as T[keyof T]
      }
    }
    return next
  }
}

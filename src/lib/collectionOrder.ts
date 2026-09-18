// Le stesse colonne in SQL e realtime impediscono che una modifica sposti
// una riga al successivo refetch.
export const COLLECTION_ORDER: Record<string, readonly string[]> = {
  members: ['created_at', 'id'], cars: ['created_at', 'id'],
  car_passengers: ['id'], car_expenses: ['created_at', 'id'],
  car_cargo: ['created_at', 'id'], delay_reports: ['created_at', 'id'],
  general_expenses: ['created_at', 'id'], general_expense_participants: ['id'],
  board_notes: ['created_at', 'id'], board_links: ['created_at', 'id'],
  radar_positions: ['member_id'], room_checklist_items: ['created_at', 'id'],
  stop_proposals: ['created_at', 'id'], stop_proposal_votes: ['proposal_id', 'member_id'],
  ride_requests: ['created_at', 'id'],
  // L'itinerario si legge in ordine di orario; le tappe ancora senza orario
  // finiscono in fondo (nullsFirst: false in roomList).
  activities: ['starts_at', 'created_at', 'id'],
  activity_participants: ['activity_id', 'member_id'],
}

function timestampMicros(value: string): number {
  // Date tronca ai millisecondi; PostgreSQL conserva sei cifre frazionarie.
  const fraction = (value.match(/\.(\d+)/)?.[1] ?? '').padEnd(6, '0')
  return Date.parse(value) * 1000 + Number(fraction.slice(3, 6))
}

export function compareRows(a: object, b: object, columns: readonly string[]): number {
  for (const column of columns) {
    const left = (a as Record<string, unknown>)[column]
    const right = (b as Record<string, unknown>)[column]
    if (left == null && right == null) continue
    if (left == null) return 1
    if (right == null) return -1
    const x = column.endsWith('_at') ? timestampMicros(String(left)) : String(left)
    const y = column.endsWith('_at') ? timestampMicros(String(right)) : String(right)
    if (x < y) return -1
    if (x > y) return 1
  }
  return 0
}

export function orderCollection<T extends object>(table: string, rows: T[]): T[] {
  return [...rows].sort((a, b) => compareRows(a, b, COLLECTION_ORDER[table] ?? ['id']))
}

// Unica fonte delle tabelle attese dallo schema completo dell'app.
// Consumata sia dal controllo runtime in DEV (src/lib/schemaCheck.ts) sia
// dallo script da terminale (scripts/dbCheck.ts, `npm run db:check`).
// Aggiornare QUI quando si aggiunge/rimuove una tabella.

export const EXPECTED_TABLES = [
  'crews',
  'crew_members',
  'rooms',
  'members',
  'member_devices',
  'cars',
  'car_passengers',
  'car_expenses',
  'car_cargo',
  'delay_reports',
  'general_expenses',
  'general_expense_participants',
  'board_notes',
  'board_links',
  'room_checklist_items',
  'stop_proposals',
  'stop_proposal_votes',
  'ride_requests',
  'radar_positions',
  'activities',
  'activity_participants',
  'room_polls',
  'room_poll_options',
  'room_poll_votes',
  'expense_settlements',
] as const

export type ExpectedTable = (typeof EXPECTED_TABLES)[number]

// Colonna usata per il probe di esistenza: alcune tabelle non hanno `id`.
export const PROBE_COLUMN: Record<string, string> = {
  radar_positions: 'member_id',
  member_devices: 'member_id',
  stop_proposal_votes: 'proposal_id',
  activity_participants: 'activity_id',
  room_poll_votes: 'poll_id',
}

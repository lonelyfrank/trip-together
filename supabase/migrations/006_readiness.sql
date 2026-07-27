-- Feature 6: Countdown pre-evento con readiness check (T-24h / T-2h)
-- Adattato ai nomi reali: `members` (non `room_members`).
-- Nessuna nuova tabella "viva": il countdown è calcolato interamente lato
-- client confrontando now() con rooms.event_time, che qui viene aggiunto
-- perché non esisteva ancora in questo schema (fu rimosso nel redesign
-- dell'app dal mockup — la destinazione aveva solo label/lat/lng).

alter table rooms
  add column if not exists event_time timestamptz;

alter table members
  add column if not exists confirmed boolean not null default false,
  add column if not exists confirmed_at timestamptz;

-- Nessuna nuova policy RLS: rooms/members hanno già la loro RLS esistente
-- (permissiva, scoped tramite invite_code/id) — vedi CONTEXT.md.

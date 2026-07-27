-- Feature 1: Stato di viaggio per auto
-- Esegui in Supabase → SQL Editor su un progetto che ha già lo schema base
-- (supabase/schema.sql). Adattato ai nomi reali già in uso: `members`
-- (non `room_members`), `cars` (già realtime-abilitata).

alter table cars
  add column if not exists travel_status text not null default 'non_partita'
    check (travel_status in ('non_partita', 'in_partenza', 'in_viaggio', 'fermo', 'arrivata')),
  add column if not exists travel_status_updated_at timestamptz not null default now(),
  add column if not exists travel_status_updated_by uuid references members(id);

-- `cars` è già in supabase_realtime e con RLS permissiva (vedi CONTEXT.md) —
-- nessuna nuova tabella qui, quindi nessuna nuova policy necessaria.

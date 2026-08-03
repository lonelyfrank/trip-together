-- Feature: Comitive (gruppi persistenti che contengono più eventi)
-- Una comitiva è un gruppo con partecipanti stabili; al suo interno si possono
-- organizzare più eventi (rooms), simultaneamente o meno. Un evento può
-- appartenere a una comitiva (crew_id) oppure restare standalone ("evento rapido").

create table if not exists crews (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  name text not null,
  created_by uuid not null,
  created_at timestamptz default now()
);

create table if not exists crew_members (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid references crews(id) on delete cascade,
  display_name text not null,
  auth_user_id uuid,
  role text not null default 'member', -- 'creator' | 'member'
  created_at timestamptz default now(),
  unique (crew_id, auth_user_id)
);

alter table rooms
  add column if not exists crew_id uuid references crews(id) on delete set null;

create index if not exists idx_crew_members_crew on crew_members(crew_id);
create index if not exists idx_rooms_crew on rooms(crew_id);

alter table crews enable row level security;
alter table crew_members enable row level security;

-- Policy demo-grade coerenti con le altre: accesso via codice/id non indovinabile.
create policy "crews: all" on crews for all using (true) with check (true);
create policy "crew_members: all" on crew_members for all using (true) with check (true);

alter publication supabase_realtime add table crews;
alter publication supabase_realtime add table crew_members;

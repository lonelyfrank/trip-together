-- Trip Together — schema esteso (mare/montagna/festival/concerto)
-- Sostituisce integralmente lo schema MVP precedente: DROP + ricrea da zero
-- (nessun dato di test da preservare). Esegui in Supabase → SQL Editor.
-- Richiede Authentication → Providers → Anonymous sign-ins abilitato.

create extension if not exists pgcrypto;

-- ─── drop (ordine inverso alle dipendenze) ─────────────────────────────
drop table if exists radar_positions cascade;
drop table if exists board_links cascade;
drop table if exists board_notes cascade;
drop table if exists general_expense_participants cascade;
drop table if exists general_expenses cascade;
drop table if exists car_cargo cascade;
drop table if exists car_expenses cascade;
drop table if exists car_passengers cascade;
drop table if exists cars cascade;
drop table if exists members cascade;
drop table if exists rooms cascade;

-- ─── stanze ─────────────────────────────────────────────────────────────
create table rooms (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  title text not null,
  destination_label text,
  destination_lat float8,
  destination_lng float8,
  status text not null default 'open', -- 'open' | 'closed'
  created_by uuid not null,
  created_at timestamptz default now()
);

-- ─── membri (slot stabile per persona, indipendente dal device) ────────
create table members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  display_name text not null,
  auth_user_id uuid,
  role text not null default 'guest', -- 'creator' | 'guest'
  created_at timestamptz default now()
);

-- ─── auto: ogni auto è una mini-entità con posti/spese/carico proprio ──
create table cars (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  driver_member_id uuid references members(id),
  seats_total int not null, -- il conducente occupa già un posto
  created_at timestamptz default now()
);

create table car_passengers (
  id uuid primary key default gen_random_uuid(),
  car_id uuid references cars(id) on delete cascade,
  member_id uuid references members(id),
  unique (member_id)
);

create table car_expenses (
  id uuid primary key default gen_random_uuid(),
  car_id uuid references cars(id) on delete cascade,
  label text not null,
  amount numeric not null,
  paid_by_member_id uuid references members(id)
);

create table car_cargo (
  id uuid primary key default gen_random_uuid(),
  car_id uuid references cars(id) on delete cascade,
  item text not null,
  packed boolean default false
);

-- ─── spese generali (scope: tutta la stanza o un sottoinsieme) ─────────
create table general_expenses (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  label text not null,
  amount numeric not null,
  paid_by_member_id uuid references members(id),
  waived boolean not null default false,
  waived_by_member_id uuid references members(id),
  created_at timestamptz default now()
);

create table general_expense_participants (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references general_expenses(id) on delete cascade,
  member_id uuid references members(id)
);

-- ─── bacheca ────────────────────────────────────────────────────────────
create table board_notes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  text text not null,
  pinned boolean default false,
  created_at timestamptz default now()
);

create table board_links (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  label text not null,
  url text not null
);

-- ─── radar: mai storicizzata, sempre sovrascritta ──────────────────────
create table radar_positions (
  member_id uuid primary key references members(id) on delete cascade,
  room_id uuid references rooms(id) on delete cascade,
  lat float8 not null,
  lng float8 not null,
  updated_at timestamptz default now()
);

create index idx_members_room on members(room_id);
create index idx_cars_room on cars(room_id);
create index idx_car_passengers_car on car_passengers(car_id);
create index idx_car_expenses_car on car_expenses(car_id);
create index idx_car_cargo_car on car_cargo(car_id);
create index idx_general_expenses_room on general_expenses(room_id);
create index idx_general_expense_participants_expense on general_expense_participants(expense_id);
create index idx_board_notes_room on board_notes(room_id);
create index idx_board_links_room on board_links(room_id);
create index idx_radar_room on radar_positions(room_id);

-- ─── Row Level Security ─────────────────────────────────────────────────
-- Policy permissive per la fase di validazione: chiunque abbia il room_id
-- (via link/codice) può leggere/scrivere. Nessun controllo di appartenenza
-- reale a livello DB — da stringere prima che i dati contino davvero
-- (token firmati, scoping per stanza, vedi sezione 14 dello spec).
alter table rooms enable row level security;
alter table members enable row level security;
alter table cars enable row level security;
alter table car_passengers enable row level security;
alter table car_expenses enable row level security;
alter table car_cargo enable row level security;
alter table general_expenses enable row level security;
alter table general_expense_participants enable row level security;
alter table board_notes enable row level security;
alter table board_links enable row level security;
alter table radar_positions enable row level security;

create policy "rooms: all" on rooms for all using (true) with check (true);
create policy "members: all" on members for all using (true) with check (true);
create policy "cars: all" on cars for all using (true) with check (true);
create policy "car_passengers: all" on car_passengers for all using (true) with check (true);
create policy "car_expenses: all" on car_expenses for all using (true) with check (true);
create policy "car_cargo: all" on car_cargo for all using (true) with check (true);
create policy "general_expenses: all" on general_expenses for all using (true) with check (true);
create policy "general_expense_participants: all" on general_expense_participants for all using (true) with check (true);
create policy "board_notes: all" on board_notes for all using (true) with check (true);
create policy "board_links: all" on board_links for all using (true) with check (true);
create policy "radar_positions: all" on radar_positions for all using (true) with check (true);

-- ─── Realtime ───────────────────────────────────────────────────────────
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table members;
alter publication supabase_realtime add table cars;
alter publication supabase_realtime add table car_passengers;
alter publication supabase_realtime add table car_expenses;
alter publication supabase_realtime add table car_cargo;
alter publication supabase_realtime add table general_expenses;
alter publication supabase_realtime add table general_expense_participants;
alter publication supabase_realtime add table board_notes;
alter publication supabase_realtime add table board_links;
alter publication supabase_realtime add table radar_positions;

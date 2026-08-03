-- Base schema: stanze/eventi, membri, auto, spese, bacheca, radar.
-- Idempotente (create ... if not exists) e ri-applicabile: sicuro anche su un
-- progetto che ha già queste tabelle. RLS permissiva (demo-grade): l'accesso è
-- scoped dall'invite_code/id non indovinabile in fase di validazione.
-- Le colonne/tabelle delle feature sono aggiunte dalle migration successive.

create extension if not exists pgcrypto;

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  title text not null,
  destination_label text,
  destination_lat float8,
  destination_lng float8,
  status text not null default 'open',
  created_by uuid not null,
  created_at timestamptz default now()
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  display_name text not null,
  auth_user_id uuid,
  role text not null default 'guest',
  created_at timestamptz default now()
);

create table if not exists cars (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  driver_member_id uuid references members(id),
  seats_total int not null,
  created_at timestamptz default now()
);

create table if not exists car_passengers (
  id uuid primary key default gen_random_uuid(),
  car_id uuid references cars(id) on delete cascade,
  member_id uuid references members(id),
  unique (member_id)
);

create table if not exists car_expenses (
  id uuid primary key default gen_random_uuid(),
  car_id uuid references cars(id) on delete cascade,
  label text not null,
  amount numeric not null,
  paid_by_member_id uuid references members(id)
);

create table if not exists car_cargo (
  id uuid primary key default gen_random_uuid(),
  car_id uuid references cars(id) on delete cascade,
  item text not null,
  packed boolean default false
);

create table if not exists general_expenses (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  label text not null,
  amount numeric not null,
  paid_by_member_id uuid references members(id),
  waived boolean not null default false,
  waived_by_member_id uuid references members(id),
  created_at timestamptz default now()
);

create table if not exists general_expense_participants (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references general_expenses(id) on delete cascade,
  member_id uuid references members(id)
);

create table if not exists board_notes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  text text not null,
  pinned boolean default false,
  created_at timestamptz default now()
);

create table if not exists board_links (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  label text not null,
  url text not null
);

create table if not exists radar_positions (
  member_id uuid primary key references members(id) on delete cascade,
  room_id uuid references rooms(id) on delete cascade,
  lat float8 not null,
  lng float8 not null,
  updated_at timestamptz default now()
);

create index if not exists idx_members_room on members(room_id);
create index if not exists idx_cars_room on cars(room_id);
create index if not exists idx_car_passengers_car on car_passengers(car_id);
create index if not exists idx_car_expenses_car on car_expenses(car_id);
create index if not exists idx_car_cargo_car on car_cargo(car_id);
create index if not exists idx_general_expenses_room on general_expenses(room_id);
create index if not exists idx_general_expense_participants_expense on general_expense_participants(expense_id);
create index if not exists idx_board_notes_room on board_notes(room_id);
create index if not exists idx_board_links_room on board_links(room_id);
create index if not exists idx_radar_room on radar_positions(room_id);

-- RLS permissiva + Realtime, idempotenti.
do $$
declare
  tbls text[] := array[
    'rooms','members','cars','car_passengers','car_expenses','car_cargo',
    'general_expenses','general_expense_participants','board_notes','board_links','radar_positions'
  ];
  t text;
begin
  foreach t in array tbls loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || ': all', t);
    execute format('create policy %I on %I for all using (true) with check (true)', t || ': all', t);
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;

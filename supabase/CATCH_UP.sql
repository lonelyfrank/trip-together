-- ═══════════════════════════════════════════════════════════════════════
-- ⚠️ DEPRECATO — usa la Supabase CLI: `supabase db push` (vedi supabase/README.md).
-- La fonte di verità sono ora le migration in supabase/migrations/.
-- Questo script resta SOLO come fallback manuale (SQL Editor) per chi non ha la
-- CLI, finché il flusso `db push` non è verificato in produzione. Poi va rimosso.
--
-- Trip Together — script di allineamento (esegui UNA volta su Supabase → SQL Editor).
-- Applica le feature migration mancanti. Idempotente e NON distruttivo.
-- Policy demo-grade permissive, coerenti con le migration.
-- ═══════════════════════════════════════════════════════════════════════

-- ─── 001 · stato di viaggio per auto ───────────────────────────────────
alter table cars
  add column if not exists travel_status text not null default 'non_partita'
    check (travel_status in ('non_partita', 'in_partenza', 'in_viaggio', 'fermo', 'arrivata')),
  add column if not exists travel_status_updated_at timestamptz not null default now(),
  add column if not exists travel_status_updated_by uuid references members(id);

-- ─── 002 · ritardo dichiarato ──────────────────────────────────────────
create table if not exists delay_reports (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references cars(id) on delete cascade,
  reason text not null check (reason in ('traffico', 'benzina', 'dimenticanza', 'altro')),
  minutes_estimate int,
  reported_by uuid not null references members(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists idx_delay_reports_car on delay_reports(car_id);

-- ─── 003 · checklist di stanza ─────────────────────────────────────────
create table if not exists room_checklist_items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  title text not null,
  assigned_to uuid references members(id),
  status text not null default 'da_portare' check (status in ('da_portare', 'portato')),
  created_by uuid not null references members(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_room_checklist_room on room_checklist_items(room_id);

-- ─── 004 · tappa proposta (votabile) ───────────────────────────────────
create table if not exists stop_proposals (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  car_id uuid references cars(id) on delete cascade,
  proposed_by uuid not null references members(id),
  type text not null check (type in ('benzina', 'cibo_bagno', 'attesa', 'altro')),
  note text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes')
);
create table if not exists stop_proposal_votes (
  proposal_id uuid not null references stop_proposals(id) on delete cascade,
  member_id uuid not null references members(id),
  vote text not null check (vote in ('yes', 'no')),
  voted_at timestamptz not null default now(),
  primary key (proposal_id, member_id)
);
create index if not exists idx_stop_proposals_room on stop_proposals(room_id);
create index if not exists idx_stop_proposal_votes_proposal on stop_proposal_votes(proposal_id);

-- ─── 005 · matching passeggeri-auto ────────────────────────────────────
create table if not exists ride_requests (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  member_id uuid not null references members(id),
  status text not null default 'pending' check (status in ('pending', 'matched', 'cancelled')),
  created_at timestamptz not null default now(),
  matched_car_id uuid references cars(id)
);
create index if not exists idx_ride_requests_room on ride_requests(room_id);

-- ─── 006 · readiness (data evento + conferma presenza) ─────────────────
alter table rooms add column if not exists event_time timestamptz;
alter table members
  add column if not exists confirmed boolean not null default false,
  add column if not exists confirmed_at timestamptz;

-- ─── 007 · comitive (gruppi con più eventi) ────────────────────────────
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
  role text not null default 'member',
  created_at timestamptz default now(),
  unique (crew_id, auth_user_id)
);
alter table rooms add column if not exists crew_id uuid references crews(id) on delete set null;
create index if not exists idx_crew_members_crew on crew_members(crew_id);
create index if not exists idx_rooms_crew on rooms(crew_id);

-- ─── RLS (permissiva, idempotente) ─────────────────────────────────────
do $$
declare
  tbls text[] := array[
    'delay_reports','room_checklist_items','stop_proposals','stop_proposal_votes',
    'ride_requests','crews','crew_members'
  ];
  t text;
begin
  foreach t in array tbls loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || ': all', t);
    execute format('create policy %I on %I for all using (true) with check (true)', t || ': all', t);
  end loop;
end $$;

-- ─── Realtime (aggiunge solo se non già presente) ──────────────────────
do $$
declare
  tbls text[] := array[
    'delay_reports','room_checklist_items','stop_proposals','stop_proposal_votes',
    'ride_requests','crews','crew_members'
  ];
  t text;
begin
  foreach t in array tbls loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 3b — room_id denormalizzato + replica identity full (realtime mirato)
-- ═══════════════════════════════════════════════════════════════════════
alter table car_passengers add column if not exists room_id uuid references rooms(id) on delete cascade;
alter table car_expenses add column if not exists room_id uuid references rooms(id) on delete cascade;
alter table car_cargo add column if not exists room_id uuid references rooms(id) on delete cascade;
alter table delay_reports add column if not exists room_id uuid references rooms(id) on delete cascade;
alter table stop_proposal_votes add column if not exists room_id uuid references rooms(id) on delete cascade;
alter table general_expense_participants add column if not exists room_id uuid references rooms(id) on delete cascade;

update car_passengers cp set room_id = c.room_id from cars c where cp.car_id = c.id and cp.room_id is null;
update car_expenses ce set room_id = c.room_id from cars c where ce.car_id = c.id and ce.room_id is null;
update car_cargo cc set room_id = c.room_id from cars c where cc.car_id = c.id and cc.room_id is null;
update delay_reports dr set room_id = c.room_id from cars c where dr.car_id = c.id and dr.room_id is null;
update stop_proposal_votes v set room_id = sp.room_id
  from stop_proposals sp where v.proposal_id = sp.id and v.room_id is null;
update general_expense_participants gep set room_id = ge.room_id
  from general_expenses ge where gep.expense_id = ge.id and gep.room_id is null;

create index if not exists idx_car_passengers_room on car_passengers(room_id);
create index if not exists idx_car_expenses_room on car_expenses(room_id);
create index if not exists idx_car_cargo_room on car_cargo(room_id);
create index if not exists idx_delay_reports_room on delay_reports(room_id);
create index if not exists idx_stop_proposal_votes_room on stop_proposal_votes(room_id);
create index if not exists idx_general_expense_participants_room on general_expense_participants(room_id);

create or replace function set_room_id_from_car() returns trigger as $$
begin
  if new.room_id is null then select room_id into new.room_id from cars where id = new.car_id; end if;
  return new;
end $$ language plpgsql;
create or replace function set_room_id_from_proposal() returns trigger as $$
begin
  if new.room_id is null then select room_id into new.room_id from stop_proposals where id = new.proposal_id; end if;
  return new;
end $$ language plpgsql;
create or replace function set_room_id_from_expense() returns trigger as $$
begin
  if new.room_id is null then select room_id into new.room_id from general_expenses where id = new.expense_id; end if;
  return new;
end $$ language plpgsql;
drop trigger if exists trg_room_id on car_passengers;
create trigger trg_room_id before insert on car_passengers for each row execute function set_room_id_from_car();
drop trigger if exists trg_room_id on car_expenses;
create trigger trg_room_id before insert on car_expenses for each row execute function set_room_id_from_car();
drop trigger if exists trg_room_id on car_cargo;
create trigger trg_room_id before insert on car_cargo for each row execute function set_room_id_from_car();
drop trigger if exists trg_room_id on delay_reports;
create trigger trg_room_id before insert on delay_reports for each row execute function set_room_id_from_car();
drop trigger if exists trg_room_id on stop_proposal_votes;
create trigger trg_room_id before insert on stop_proposal_votes for each row execute function set_room_id_from_proposal();
drop trigger if exists trg_room_id on general_expense_participants;
create trigger trg_room_id before insert on general_expense_participants for each row execute function set_room_id_from_expense();

do $$
declare
  tbls text[] := array[
    'members','cars','car_passengers','car_expenses','car_cargo','delay_reports',
    'general_expenses','general_expense_participants','board_notes','board_links',
    'radar_positions','room_checklist_items','stop_proposals','stop_proposal_votes','ride_requests'
  ];
  t text;
begin
  foreach t in array tbls loop
    execute format('alter table %I replica identity full', t);
  end loop;
end $$;

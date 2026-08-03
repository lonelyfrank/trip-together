-- Trip Together — schema esteso (mare/montagna/festival/concerto)
-- Sostituisce integralmente lo schema MVP precedente: DROP + ricrea da zero
-- (nessun dato di test da preservare). Esegui in Supabase → SQL Editor.
-- Richiede Authentication → Providers → Anonymous sign-ins abilitato.

create extension if not exists pgcrypto;

-- ─── drop (ordine inverso alle dipendenze) ─────────────────────────────
drop table if exists crew_members cascade;
drop table if exists crews cascade;
drop table if exists radar_positions cascade;
drop table if exists room_checklist_items cascade;
drop table if exists ride_requests cascade;
drop table if exists stop_proposal_votes cascade;
drop table if exists stop_proposals cascade;
drop table if exists board_links cascade;
drop table if exists board_notes cascade;
drop table if exists general_expense_participants cascade;
drop table if exists general_expenses cascade;
drop table if exists delay_reports cascade;
drop table if exists car_cargo cascade;
drop table if exists car_expenses cascade;
drop table if exists car_passengers cascade;
drop table if exists cars cascade;
drop table if exists members cascade;
drop table if exists rooms cascade;

-- ─── comitive (gruppi persistenti che contengono più eventi) ───────────
create table crews (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  name text not null,
  created_by uuid not null,
  created_at timestamptz default now()
);

create table crew_members (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid references crews(id) on delete cascade,
  display_name text not null,
  auth_user_id uuid,
  role text not null default 'member', -- 'creator' | 'member'
  created_at timestamptz default now(),
  unique (crew_id, auth_user_id)
);

-- ─── stanze/eventi (crew_id null = evento rapido standalone) ────────────
create table rooms (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  title text not null,
  crew_id uuid references crews(id) on delete set null,
  destination_label text,
  destination_lat float8,
  destination_lng float8,
  event_time timestamptz, -- usato dal countdown readiness T-24h/T-2h
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
  confirmed boolean not null default false,
  confirmed_at timestamptz,
  created_at timestamptz default now()
);

-- ─── auto: ogni auto è una mini-entità con posti/spese/carico proprio ──
create table cars (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  driver_member_id uuid references members(id),
  seats_total int not null, -- il conducente occupa già un posto
  travel_status text not null default 'non_partita'
    check (travel_status in ('non_partita', 'in_partenza', 'in_viaggio', 'fermo', 'arrivata')),
  travel_status_updated_at timestamptz not null default now(),
  travel_status_updated_by uuid references members(id),
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

create table delay_reports (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references cars(id) on delete cascade,
  reason text not null check (reason in ('traffico', 'benzina', 'dimenticanza', 'altro')),
  minutes_estimate int,
  reported_by uuid not null references members(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- ─── tappa proposta: sosta condivisa, votabile, per auto o per tutti ───
create table stop_proposals (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  car_id uuid references cars(id) on delete cascade, -- null = proposta per tutta la comitiva
  proposed_by uuid not null references members(id),
  type text not null check (type in ('benzina', 'cibo_bagno', 'attesa', 'altro')),
  note text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes')
);

create table stop_proposal_votes (
  proposal_id uuid not null references stop_proposals(id) on delete cascade,
  member_id uuid not null references members(id),
  vote text not null check (vote in ('yes', 'no')),
  voted_at timestamptz not null default now(),
  primary key (proposal_id, member_id)
);

-- ─── matching passeggeri-auto ──────────────────────────────────────────
create table ride_requests (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  member_id uuid not null references members(id),
  status text not null default 'pending' check (status in ('pending', 'matched', 'cancelled')),
  created_at timestamptz not null default now(),
  matched_car_id uuid references cars(id)
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

-- ─── checklist di stanza (trasversale, distinta dal carico per auto) ───
create table room_checklist_items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  title text not null,
  assigned_to uuid references members(id),
  status text not null default 'da_portare' check (status in ('da_portare', 'portato')),
  created_by uuid not null references members(id),
  created_at timestamptz not null default now()
);

-- ─── radar: mai storicizzata, sempre sovrascritta ──────────────────────
create table radar_positions (
  member_id uuid primary key references members(id) on delete cascade,
  room_id uuid references rooms(id) on delete cascade,
  lat float8 not null,
  lng float8 not null,
  updated_at timestamptz default now()
);

create index idx_crew_members_crew on crew_members(crew_id);
create index idx_rooms_crew on rooms(crew_id);
create index idx_members_room on members(room_id);
create index idx_cars_room on cars(room_id);
create index idx_car_passengers_car on car_passengers(car_id);
create index idx_car_expenses_car on car_expenses(car_id);
create index idx_car_cargo_car on car_cargo(car_id);
create index idx_delay_reports_car on delay_reports(car_id);
create index idx_stop_proposals_room on stop_proposals(room_id);
create index idx_stop_proposal_votes_proposal on stop_proposal_votes(proposal_id);
create index idx_ride_requests_room on ride_requests(room_id);
create index idx_general_expenses_room on general_expenses(room_id);
create index idx_general_expense_participants_expense on general_expense_participants(expense_id);
create index idx_board_notes_room on board_notes(room_id);
create index idx_board_links_room on board_links(room_id);
create index idx_room_checklist_room on room_checklist_items(room_id);
create index idx_radar_room on radar_positions(room_id);

-- ─── Row Level Security ─────────────────────────────────────────────────
-- Policy permissive per la fase di validazione: chiunque abbia il room_id
-- (via link/codice) può leggere/scrivere. Nessun controllo di appartenenza
-- reale a livello DB — da stringere prima che i dati contino davvero
-- (token firmati, scoping per stanza, vedi sezione 14 dello spec).
alter table crews enable row level security;
alter table crew_members enable row level security;
alter table rooms enable row level security;
alter table members enable row level security;
alter table cars enable row level security;
alter table car_passengers enable row level security;
alter table car_expenses enable row level security;
alter table car_cargo enable row level security;
alter table delay_reports enable row level security;
alter table general_expenses enable row level security;
alter table general_expense_participants enable row level security;
alter table board_notes enable row level security;
alter table board_links enable row level security;
alter table radar_positions enable row level security;
alter table room_checklist_items enable row level security;
alter table stop_proposals enable row level security;
alter table stop_proposal_votes enable row level security;
alter table ride_requests enable row level security;

create policy "crews: all" on crews for all using (true) with check (true);
create policy "crew_members: all" on crew_members for all using (true) with check (true);
create policy "rooms: all" on rooms for all using (true) with check (true);
create policy "members: all" on members for all using (true) with check (true);
create policy "cars: all" on cars for all using (true) with check (true);
create policy "car_passengers: all" on car_passengers for all using (true) with check (true);
create policy "car_expenses: all" on car_expenses for all using (true) with check (true);
create policy "car_cargo: all" on car_cargo for all using (true) with check (true);

-- delay_reports non ha room_id diretto: scoped ai membri della stanza via join su cars.
create policy "delay_reports: scoped to room members" on delay_reports for all
using (
  exists (
    select 1 from cars c
    join members m on m.room_id = c.room_id
    where c.id = delay_reports.car_id and m.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from cars c
    join members m on m.room_id = c.room_id
    where c.id = delay_reports.car_id and m.auth_user_id = auth.uid()
  )
);

create policy "general_expenses: all" on general_expenses for all using (true) with check (true);
create policy "general_expense_participants: all" on general_expense_participants for all using (true) with check (true);
create policy "board_notes: all" on board_notes for all using (true) with check (true);
create policy "board_links: all" on board_links for all using (true) with check (true);
create policy "radar_positions: all" on radar_positions for all using (true) with check (true);

-- room_checklist_items ha room_id diretto: scoped ai membri della stanza.
create policy "room_checklist_items: scoped to room members" on room_checklist_items for all
using (
  exists (
    select 1 from members m
    where m.room_id = room_checklist_items.room_id and m.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from members m
    where m.room_id = room_checklist_items.room_id and m.auth_user_id = auth.uid()
  )
);

create policy "stop_proposals: scoped to room members" on stop_proposals for all
using (
  exists (select 1 from members m where m.room_id = stop_proposals.room_id and m.auth_user_id = auth.uid())
)
with check (
  exists (select 1 from members m where m.room_id = stop_proposals.room_id and m.auth_user_id = auth.uid())
);

create policy "stop_proposal_votes: scoped to room members" on stop_proposal_votes for all
using (
  exists (
    select 1 from stop_proposals sp
    join members m on m.room_id = sp.room_id
    where sp.id = stop_proposal_votes.proposal_id and m.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from stop_proposals sp
    join members m on m.room_id = sp.room_id
    where sp.id = stop_proposal_votes.proposal_id and m.auth_user_id = auth.uid()
  )
);

create policy "ride_requests: scoped to room members" on ride_requests for all
using (
  exists (select 1 from members m where m.room_id = ride_requests.room_id and m.auth_user_id = auth.uid())
)
with check (
  exists (select 1 from members m where m.room_id = ride_requests.room_id and m.auth_user_id = auth.uid())
);

-- ─── Realtime ───────────────────────────────────────────────────────────
alter publication supabase_realtime add table crews;
alter publication supabase_realtime add table crew_members;
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table members;
alter publication supabase_realtime add table cars;
alter publication supabase_realtime add table car_passengers;
alter publication supabase_realtime add table car_expenses;
alter publication supabase_realtime add table car_cargo;
alter publication supabase_realtime add table delay_reports;
alter publication supabase_realtime add table general_expenses;
alter publication supabase_realtime add table general_expense_participants;
alter publication supabase_realtime add table board_notes;
alter publication supabase_realtime add table board_links;
alter publication supabase_realtime add table radar_positions;
alter publication supabase_realtime add table room_checklist_items;
alter publication supabase_realtime add table stop_proposals;
alter publication supabase_realtime add table stop_proposal_votes;
alter publication supabase_realtime add table ride_requests;

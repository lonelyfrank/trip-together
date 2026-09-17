-- Trip Together — schema completo, in un unico file.
--
-- Prima erano 9 migration separate (una per feature, con timestamp
-- progressivi). Sono state unite qui perché il flusso reale è "incolla
-- tutto nell'SQL Editor di Supabase" (la CLI non è collegata in questo
-- ambiente) — avere 9 file lasciava dubbi su quale incollare quando lo
-- schema andava disallineato. Ogni blocco resta idempotente esattamente
-- come prima: sicuro da rieseguire per intero anche su un progetto che ha
-- già parte dello schema applicata.
--
-- Per le regole su come estendere questo file quando si aggiunge una
-- feature, vedi supabase/README.md.

-- ═══════════════════════════════════════════════════════════════════════
-- Base schema: stanze/eventi, membri, auto, spese, bacheca, radar.
-- Le policy permissive iniziali sono sostituite dal blocco Fix in fondo.
-- Un invite_code/id non indovinabile non limita da solo l'accesso al DB.
-- ═══════════════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════════════
-- Feature: stato di viaggio per auto.
-- ═══════════════════════════════════════════════════════════════════════

alter table cars
  add column if not exists travel_status text not null default 'non_partita'
    check (travel_status in ('non_partita', 'in_partenza', 'in_viaggio', 'fermo', 'arrivata')),
  add column if not exists travel_status_updated_at timestamptz not null default now(),
  add column if not exists travel_status_updated_by uuid references members(id);

-- ═══════════════════════════════════════════════════════════════════════
-- Feature: ritardo dichiarato per auto.
-- ═══════════════════════════════════════════════════════════════════════

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

do $$
begin
  alter table delay_reports enable row level security;
  drop policy if exists "delay_reports: all" on delay_reports;
  create policy "delay_reports: all" on delay_reports for all using (true) with check (true);
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'delay_reports'
  ) then
    alter publication supabase_realtime add table delay_reports;
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════
-- Feature: checklist di stanza (trasversale, distinta dal carico per auto).
-- ═══════════════════════════════════════════════════════════════════════

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

do $$
begin
  alter table room_checklist_items enable row level security;
  drop policy if exists "room_checklist_items: all" on room_checklist_items;
  create policy "room_checklist_items: all" on room_checklist_items for all using (true) with check (true);
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_checklist_items'
  ) then
    alter publication supabase_realtime add table room_checklist_items;
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════
-- Feature: tappa proposta (sosta condivisa, votabile).
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists stop_proposals (
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
create table if not exists stop_proposal_votes (
  proposal_id uuid not null references stop_proposals(id) on delete cascade,
  member_id uuid not null references members(id),
  vote text not null check (vote in ('yes', 'no')),
  voted_at timestamptz not null default now(),
  primary key (proposal_id, member_id)
);
create index if not exists idx_stop_proposals_room on stop_proposals(room_id);
create index if not exists idx_stop_proposal_votes_proposal on stop_proposal_votes(proposal_id);

do $$
declare
  tbls text[] := array['stop_proposals', 'stop_proposal_votes'];
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

-- ═══════════════════════════════════════════════════════════════════════
-- Feature: matching passeggeri-auto.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists ride_requests (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  member_id uuid not null references members(id),
  status text not null default 'pending' check (status in ('pending', 'matched', 'cancelled')),
  created_at timestamptz not null default now(),
  matched_car_id uuid references cars(id)
);
create index if not exists idx_ride_requests_room on ride_requests(room_id);

do $$
begin
  alter table ride_requests enable row level security;
  drop policy if exists "ride_requests: all" on ride_requests;
  create policy "ride_requests: all" on ride_requests for all using (true) with check (true);
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ride_requests'
  ) then
    alter publication supabase_realtime add table ride_requests;
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════
-- Feature: readiness pre-evento. Solo colonne (nessuna tabella nuova).
-- ═══════════════════════════════════════════════════════════════════════

alter table rooms add column if not exists event_time timestamptz;

alter table members
  add column if not exists confirmed boolean not null default false,
  add column if not exists confirmed_at timestamptz;

-- ═══════════════════════════════════════════════════════════════════════
-- Feature: comitive (gruppi persistenti che contengono più eventi).
-- ═══════════════════════════════════════════════════════════════════════

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

do $$
declare
  tbls text[] := array['crews', 'crew_members'];
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

-- ═══════════════════════════════════════════════════════════════════════
-- Feature: denormalizzazione room_id + replica identity per realtime
-- affidabile.
--
-- 1) Aggiunge room_id alle tabelle figlie che ne erano prive, con backfill
--    dal parent, così ogni sottoscrizione realtime può filtrare per
--    room_id (prima 6 erano senza filtro e scatenavano refetch da
--    qualsiasi stanza).
-- 2) Imposta REPLICA IDENTITY FULL sulle tabelle scoped alla stanza:
--    senza, gli eventi DELETE portano solo la PK, quindi un filtro su
--    room_id (non-PK) li scarterebbe e le cancellazioni non
--    arriverebbero in tempo reale.
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

-- Trigger: popola room_id all'insert dal parent, così ogni nuova riga ha
-- room_id valorizzato senza toccare i componenti — il filtro realtime
-- room_id=eq matcha e la patch mirata scatta.
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

-- ═══════════════════════════════════════════════════════════════════════
-- Fix: appartenenza server-side, RLS scoped e RPC di ingresso atomiche.
-- Applicare tutto il blocco insieme; il client passa alle RPC solo dopo
-- conferma dell'applicazione. Il codice invito non limita le SELECT:
-- l'isolamento è garantito dalle policy, non dai filtri del browser.
-- ═══════════════════════════════════════════════════════════════════════
begin;

create table if not exists public.member_devices (
  member_id uuid not null references public.members(id) on delete cascade,
  auth_user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (member_id, auth_user_id)
);
create index if not exists idx_member_devices_user on public.member_devices(auth_user_id, member_id);
create index if not exists idx_members_room_user on public.members(room_id, auth_user_id);

create or replace function public.is_room_member(rid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.members m
    left join public.member_devices d on d.member_id = m.id
    where m.room_id = rid
      and (m.auth_user_id = auth.uid() or d.auth_user_id = auth.uid())
  )
$$;
create or replace function public.is_crew_member(cid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.crew_members m
    where m.crew_id = cid and m.auth_user_id = auth.uid()
  )
$$;

-- Gli helper privati non sono RPC pubbliche: solo le funzioni sottostanti
-- possono attribuire identità o creare gruppi usando i privilegi del proprietario.
create or replace function public.tt_require_session() returns uuid
language plpgsql security definer stable set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Sessione non disponibile. Riapri l''app e riprova.' using errcode = '42501';
  end if;
  return v_uid;
end $$;
create or replace function public.tt_display_name(p_name text) returns text
language plpgsql security definer immutable set search_path = public as $$
declare v_name text := btrim(coalesce(p_name, ''));
begin
  if char_length(v_name) not between 1 and 40 then
    raise exception 'Il nome deve contenere da 1 a 40 caratteri.' using errcode = '22023';
  end if;
  return v_name;
end $$;
create or replace function public.tt_invite_code() returns text
language plpgsql security definer volatile set search_path = public as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_mask int := 1;
  v_index int;
  v_code text := '';
begin
  while v_mask < char_length(v_alphabet) - 1 loop v_mask := (v_mask << 1) | 1; end loop;
  while char_length(v_code) < 7 loop
    -- Il primo byte di un UUID casuale non contiene bit fissi di versione.
    -- Maschera e rejection sampling restano uniformi cambiando alfabeto.
    v_index := get_byte(uuid_send(gen_random_uuid()), 0) & v_mask;
    if v_index < char_length(v_alphabet) then
      v_code := v_code || substr(v_alphabet, v_index + 1, 1);
    end if;
  end loop;
  return v_code;
end $$;

create or replace function public.resolve_invite(p_code text) returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare v_code text := upper(btrim(coalesce(p_code, ''))); v_id uuid;
begin
  perform public.tt_require_session();
  if char_length(v_code) between 1 and 64 then
    select id into v_id from public.rooms where invite_code = v_code and status = 'open';
    if found then return jsonb_build_object('kind', 'room', 'id', v_id); end if;
    select id into v_id from public.crews where invite_code = v_code;
    if found then return jsonb_build_object('kind', 'crew', 'id', v_id); end if;
  end if;
  return jsonb_build_object('kind', 'none', 'id', null);
end $$;

create or replace function public.join_room(p_room_id uuid, p_invite_code text, p_display_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public.tt_require_session();
  v_name text := public.tt_display_name(p_display_name);
  v_member uuid;
begin
  -- Il lock serializza due ingressi dello stesso device prima dell'insert.
  perform 1 from public.rooms where id = p_room_id and status = 'open'
    and invite_code = upper(btrim(coalesce(p_invite_code, ''))) for update;
  if not found then raise exception 'Invito non valido o evento non disponibile.' using errcode = '42501'; end if;
  select m.id into v_member from public.members m
    where m.room_id = p_room_id and (m.auth_user_id = v_uid or exists (
      select 1 from public.member_devices d where d.member_id = m.id and d.auth_user_id = v_uid
    )) order by m.created_at, m.id limit 1;
  if v_member is null then
    insert into public.members(room_id, display_name, auth_user_id, role)
      values (p_room_id, v_name, v_uid, 'guest') returning id into v_member;
  end if;
  return v_member;
end $$;

create or replace function public.join_crew(p_crew_id uuid, p_invite_code text, p_display_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public.tt_require_session();
  v_name text := public.tt_display_name(p_display_name);
  v_member uuid;
begin
  perform 1 from public.crews where id = p_crew_id
    and invite_code = upper(btrim(coalesce(p_invite_code, ''))) for update;
  if not found then raise exception 'Invito non valido o comitiva non disponibile.' using errcode = '42501'; end if;
  select id into v_member from public.crew_members where crew_id = p_crew_id and auth_user_id = v_uid;
  if v_member is null then
    insert into public.crew_members(crew_id, display_name, auth_user_id, role)
      values (p_crew_id, v_name, v_uid, 'member') returning id into v_member;
  end if;
  return v_member;
end $$;

create or replace function public.claim_member(p_member_id uuid, p_room_id uuid, p_invite_code text)
returns text language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public.tt_require_session(); v_name text;
begin
  select m.display_name into v_name from public.members m
    join public.rooms r on r.id = m.room_id
    where m.id = p_member_id and r.id = p_room_id
      and r.invite_code = upper(btrim(coalesce(p_invite_code, ''))) for update of r;
  if not found then raise exception 'Link di recupero non valido.' using errcode = '42501'; end if;
  insert into public.member_devices(member_id, auth_user_id)
    values (p_member_id, v_uid) on conflict do nothing;
  return v_name;
end $$;

create or replace function public.tt_create_group(p_kind text, p_title text, p_display_name text, p_crew_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public.tt_require_session();
  v_name text := public.tt_display_name(p_display_name);
  v_title text := btrim(coalesce(p_title, ''));
  v_code text; v_id uuid; v_member uuid; v_attempt int;
begin
  if p_kind is null or p_kind not in ('room', 'crew') or char_length(v_title) not between 1 and 80 then
    raise exception 'Nome del gruppo non valido: usa da 1 a 80 caratteri.' using errcode = '22023';
  end if;
  if p_crew_id is not null and not public.is_crew_member(p_crew_id) then
    raise exception 'Serve un invito per questa comitiva.' using errcode = '42501';
  end if;
  for v_attempt in 1..5 loop
    v_code := public.tt_invite_code();
    -- Il codice deve essere univoco anche fra stanze e comitive, non solo
    -- dentro ogni tabella. Il lock protegge le due verifiche concorrenti.
    perform pg_advisory_xact_lock(hashtextextended('tt:invite:' || v_code, 0));
    if exists (select 1 from public.rooms where invite_code = v_code)
      or exists (select 1 from public.crews where invite_code = v_code) then continue; end if;
    begin
      if p_kind = 'room' then
        insert into public.rooms(invite_code, title, created_by, crew_id)
          values (v_code, v_title, v_uid, p_crew_id) returning id into v_id;
        insert into public.members(room_id, display_name, auth_user_id, role)
          values (v_id, v_name, v_uid, 'creator') returning id into v_member;
      else
        insert into public.crews(invite_code, name, created_by)
          values (v_code, v_title, v_uid) returning id into v_id;
        insert into public.crew_members(crew_id, display_name, auth_user_id, role)
          values (v_id, v_name, v_uid, 'creator') returning id into v_member;
      end if;
      return jsonb_build_object('id', v_id, 'member_id', v_member, 'invite_code', v_code);
    exception when unique_violation then
      -- Il sub-blocco annulla anche il gruppo se fallisce il suo membro.
      if v_attempt = 5 then raise exception 'Creazione non riuscita. Riprova.' using errcode = '23505'; end if;
    end;
  end loop;
  raise exception 'Creazione non riuscita. Riprova.' using errcode = '23505';
end $$;
create or replace function public.create_room_and_join(p_title text, p_display_name text, p_crew_id uuid default null)
returns jsonb language sql security definer set search_path = public as $$
  select public.tt_create_group('room', p_title, p_display_name, p_crew_id)
$$;
create or replace function public.create_crew(p_name text, p_display_name text)
returns jsonb language sql security definer set search_path = public as $$
  select public.tt_create_group('crew', p_name, p_display_name, null)
$$;

-- La comitiva deve poter elencare e invitare ai suoi eventi prima del join:
-- un percorso autenticato dedicato evita di allargare la SELECT su rooms.
create or replace function public.list_crew_events(p_crew_id uuid default null)
returns setof public.rooms language sql security definer stable set search_path = public as $$
  select r.* from public.rooms r
  where (p_crew_id is null or r.crew_id = p_crew_id) and public.is_crew_member(r.crew_id)
  order by r.created_at desc, r.id
$$;

-- Non fidarsi del room_id inviato dal browser: deve coincidere sempre
-- con quello del parent, anche negli UPDATE e negli upsert.
create or replace function public.set_room_id_from_car() returns trigger
language plpgsql set search_path = public as $$
begin
  select c.room_id into new.room_id from public.cars c where c.id = new.car_id;
  if new.room_id is null then raise exception 'Auto non disponibile.' using errcode = '42501'; end if;
  return new;
end $$;
create or replace function public.set_room_id_from_proposal() returns trigger
language plpgsql set search_path = public as $$
begin
  select p.room_id into new.room_id from public.stop_proposals p where p.id = new.proposal_id;
  if new.room_id is null then raise exception 'Proposta non disponibile.' using errcode = '42501'; end if;
  return new;
end $$;
create or replace function public.set_room_id_from_expense() returns trigger
language plpgsql set search_path = public as $$
begin
  select e.room_id into new.room_id from public.general_expenses e where e.id = new.expense_id;
  if new.room_id is null then raise exception 'Spesa non disponibile.' using errcode = '42501'; end if;
  return new;
end $$;
do $$
declare t text;
begin
  foreach t in array array['car_passengers', 'car_expenses', 'car_cargo', 'delay_reports'] loop
    execute format('drop trigger if exists trg_room_id on public.%I', t);
    execute format('create trigger trg_room_id before insert or update on public.%I for each row execute function public.set_room_id_from_car()', t);
    execute format('update public.%I c set room_id = p.room_id from public.cars p where c.car_id = p.id and c.room_id is distinct from p.room_id', t);
  end loop;
end $$;
drop trigger if exists trg_room_id on public.stop_proposal_votes;
create trigger trg_room_id before insert or update on public.stop_proposal_votes
  for each row execute function public.set_room_id_from_proposal();
drop trigger if exists trg_room_id on public.general_expense_participants;
create trigger trg_room_id before insert or update on public.general_expense_participants
  for each row execute function public.set_room_id_from_expense();
update public.stop_proposal_votes v set room_id = p.room_id from public.stop_proposals p
  where v.proposal_id = p.id and v.room_id is distinct from p.room_id;
update public.general_expense_participants v set room_id = e.room_id from public.general_expenses e
  where v.expense_id = e.id and v.room_id is distinct from e.room_id;

-- Rimuovere tutte le policy precedenti: una sola permissiva rimasta
-- combinerebbe il suo USING con OR e riaprirebbe l'intera tabella.
do $$
declare
  t text; p record; v_scope text;
  v_tables text[] := array['rooms','members','cars','car_passengers','car_expenses','car_cargo',
    'delay_reports','general_expenses','general_expense_participants','board_notes','board_links',
    'radar_positions','room_checklist_items','stop_proposals','stop_proposal_votes','ride_requests',
    'crews','crew_members','member_devices'];
begin
  foreach t in array v_tables loop
    execute format('alter table public.%I enable row level security', t);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy if exists %I on public.%I', p.policyname, t);
    end loop;
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant select on table public.%I to anon, authenticated', t);
    if t = 'member_devices' then
      execute 'create policy "member_devices: own" on public.member_devices for select to authenticated using (auth_user_id = auth.uid())';
    else
      v_scope := case t
        when 'rooms' then 'public.is_room_member(id)'
        when 'crews' then 'public.is_crew_member(id)'
        when 'crew_members' then 'public.is_crew_member(crew_id)'
        else 'public.is_room_member(room_id)' end;
      execute format('create policy %I on public.%I for all to authenticated using (%s) with check (%s)', t || ': members', t, v_scope, v_scope);
      execute format('grant insert, update, delete on table public.%I to authenticated', t);
      execute format('alter table public.%I replica identity full', t);
    end if;
  end loop;
end $$;

-- Anche una sessione anonima Supabase usa il ruolo authenticated. Identità,
-- ruoli e creazione passano solo dalle RPC; gli altri campi restano collaborativi.
revoke insert, update, delete on public.rooms from anon, authenticated;
grant update (title, destination_label, destination_lat, destination_lng, event_time, status) on public.rooms to authenticated;
revoke insert, update, delete on public.members from anon, authenticated;
grant update (display_name, confirmed, confirmed_at) on public.members to authenticated;
revoke insert, update, delete on public.crews from anon, authenticated;
grant update (name) on public.crews to authenticated;
revoke insert, update, delete on public.crew_members from anon, authenticated;

revoke execute on function public.tt_require_session(), public.tt_display_name(text), public.tt_invite_code(), public.tt_create_group(text,text,text,uuid) from public, anon, authenticated;
revoke execute on function public.set_room_id_from_car(), public.set_room_id_from_proposal(), public.set_room_id_from_expense() from public, anon, authenticated;
revoke execute on function public.is_room_member(uuid), public.is_crew_member(uuid), public.resolve_invite(text), public.join_room(uuid,text,text), public.join_crew(uuid,text,text), public.claim_member(uuid,uuid,text), public.create_room_and_join(text,text,uuid), public.create_crew(text,text), public.list_crew_events(uuid) from public;
grant execute on function public.is_room_member(uuid), public.is_crew_member(uuid), public.resolve_invite(text), public.join_room(uuid,text,text), public.join_crew(uuid,text,text), public.claim_member(uuid,uuid,text), public.create_room_and_join(text,text,uuid), public.create_crew(text,text), public.list_crew_events(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
commit;

-- ═══ Fix: ordine cronologico e quote spesa univoche ═══
begin;

alter table public.car_expenses
  add column if not exists created_at timestamptz not null default now();
alter table public.car_cargo
  add column if not exists created_at timestamptz not null default now();
alter table public.board_links
  add column if not exists created_at timestamptz not null default now();

-- Evita nuovi duplicati fra la pulizia e la creazione del vincolo.
lock table public.general_expense_participants in share row exclusive mode;
delete from public.general_expense_participants as duplicato
using public.general_expense_participants as originale
where duplicato.expense_id = originale.expense_id
  and duplicato.member_id = originale.member_id
  and duplicato.ctid > originale.ctid;

create unique index if not exists idx_general_expense_participants_unique
  on public.general_expense_participants (expense_id, member_id);

notify pgrst, 'reload schema';
commit;

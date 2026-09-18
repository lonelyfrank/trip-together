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

-- ═══ Fix: riferimenti obbligatori, capienza auto e soste client-only ═══
begin;

lock table public.members, public.cars, public.car_passengers,
  public.board_notes, public.board_links, public.radar_positions
  in share row exclusive mode;

-- Ricostruisce solo appartenenze sostenute da riferimenti esistenti.
update public.cars c set room_id = m.room_id
from public.members m
where c.driver_member_id = m.id and c.room_id is null and m.room_id is not null;

with candidati as (
  select driver_member_id as member_id, room_id from public.cars
  union
  select cp.member_id, c.room_id from public.car_passengers cp
    join public.cars c on c.id = cp.car_id
  union
  select member_id, room_id from public.radar_positions
  union
  select paid_by_member_id, room_id from public.general_expenses
), univoci as (
  select member_id, min(room_id::text)::uuid as room_id
  from candidati where member_id is not null and room_id is not null
  group by member_id having count(distinct room_id) = 1
)
update public.members m set room_id = u.room_id
from univoci u where m.id = u.member_id and m.room_id is null;

update public.cars c set room_id = m.room_id
from public.members m
where c.driver_member_id = m.id and c.room_id is null and m.room_id is not null;

update public.radar_positions r set room_id = m.room_id
from public.members m
where r.member_id = m.id and r.room_id is null and m.room_id is not null;

-- Anche i figli tornano nello stesso ambito RLS dell'auto ricostruita.
do $$
declare t text;
begin
  foreach t in array array['car_passengers', 'car_expenses', 'car_cargo', 'delay_reports'] loop
    execute format('update public.%I child set room_id = c.room_id from public.cars c
      where child.car_id = c.id and c.room_id is not null
        and child.room_id is distinct from c.room_id', t);
  end loop;
end $$;

-- Senza autore o altro riferimento non si può indovinare l'evento/membro.
-- In quel caso annulla il blocco: nessuna cancellazione e nessun dato inventato.
do $$
declare r record; v_count bigint; v_missing text := '';
begin
  for r in select * from (values
    ('members', 'room_id'), ('cars', 'room_id'),
    ('cars', 'driver_member_id'), ('car_passengers', 'car_id'),
    ('car_passengers', 'member_id'), ('board_notes', 'room_id'),
    ('board_links', 'room_id'), ('radar_positions', 'room_id')
  ) as columns_to_check(table_name, column_name) loop
    execute format('select count(*) from public.%I where %I is null',
      r.table_name, r.column_name) into v_count;
    if v_count > 0 then
      v_missing := v_missing || format('%s.%s: %s; ', r.table_name, r.column_name, v_count);
    end if;
  end loop;
  if v_missing <> '' then
    raise exception 'Riferimenti non ricostruibili: %', v_missing
      using errcode = '23502', hint = 'Correggi i riferimenti segnalati e riesegui il blocco. Nessuna riga è stata cancellata.';
  end if;
end $$;

alter table public.members alter column room_id set not null;
alter table public.cars
  alter column room_id set not null,
  alter column driver_member_id set not null;
alter table public.car_passengers
  alter column car_id set not null,
  alter column member_id set not null;
alter table public.board_notes alter column room_id set not null;
alter table public.board_links alter column room_id set not null;
alter table public.radar_positions alter column room_id set not null;

-- Non aumentare la capienza dichiarata per nascondere un overbooking pregresso.
do $$
begin
  if exists (
    select 1 from public.cars c
    where c.seats_total < 1 or (select count(*) from public.car_passengers cp
      where cp.car_id = c.id) > c.seats_total - 1
  ) then
    raise exception 'Ci sono auto con capienza non valida o già sovraccariche.'
      using errcode = '23514', hint = 'Correggi posti e assegnazioni effettivi prima di rieseguire il blocco.';
  end if;
  if not exists (select 1 from pg_constraint
    where conrelid = 'public.cars'::regclass and conname = 'cars_seats_total_positive') then
    alter table public.cars add constraint cars_seats_total_positive check (seats_total >= 1);
  end if;
end $$;

create or replace function public.enforce_car_passenger_capacity()
returns trigger language plpgsql set search_path = public as $$
declare v_seats int; v_passengers bigint;
begin
  -- Lo stesso lock serializza ingressi concorrenti e modifiche alla capienza.
  select seats_total into v_seats from public.cars where id = new.car_id for update;
  if not found then
    raise exception 'Auto non disponibile.' using errcode = '42501';
  end if;
  select count(*) into v_passengers from public.car_passengers
    where car_id = new.car_id
      and id is distinct from new.id
      and member_id is distinct from new.member_id;
  if v_passengers >= v_seats - 1 then
    raise exception 'Quel posto è stato preso un istante prima.' using errcode = '23514';
  end if;
  return new;
end $$;

create or replace function public.enforce_car_seats_update()
returns trigger language plpgsql set search_path = public as $$
begin
  -- UPDATE ha già bloccato la riga dell'auto: non si può abbassare il limite
  -- sotto le assegnazioni esistenti mentre un passeggero sta entrando.
  if (select count(*) from public.car_passengers where car_id = new.id) > new.seats_total - 1 then
    raise exception 'La capienza è inferiore ai posti già assegnati.' using errcode = '23514';
  end if;
  return new;
end $$;

revoke execute on function public.enforce_car_passenger_capacity() from public, anon, authenticated;
revoke execute on function public.enforce_car_seats_update() from public, anon, authenticated;

drop trigger if exists trg_car_passengers_capacity on public.car_passengers;
create trigger trg_car_passengers_capacity before insert or update on public.car_passengers
  for each row execute function public.enforce_car_passenger_capacity();
drop trigger if exists trg_cars_seats_capacity on public.cars;
create trigger trg_cars_seats_capacity before update of seats_total on public.cars
  for each row execute function public.enforce_car_seats_update();

-- L'esito resta derivato da voti/scadenza sul client; nessuno status persistito obsoleto.
alter table public.stop_proposals drop column if exists status;

notify pgrst, 'reload schema';
commit;

-- ═══════════════════════════════════════════════════════════════════════
-- Feature: attività (itinerario dell'evento).
--
-- Due tabelle sole, sul modello già usato per le spese e le loro quote.
-- Nessuna colonna nuova su `rooms`: i giorni dell'itinerario si ricavano
-- dai `starts_at` distinti delle attività (più l'orario dell'evento),
-- quindi un evento di un giorno resta un evento di un giorno e il modello
-- di dominio non cambia.
--
-- `status` ha quattro valori e non contiene "da votare": l'interesse del
-- gruppo si legge dai partecipanti, come l'esito delle soste si legge dai
-- voti. Una colonna che ripete ciò che è già derivabile è la colonna che
-- prima o poi mente — è la ragione per cui `stop_proposals.status` è stata
-- rimossa.
--
-- `activity_participants` ha la chiave primaria composita invece di un `id`
-- con vincolo unico a parte: qui un doppio inserimento è impossibile per
-- costruzione, non per rimedio successivo (vedi il fix sulle quote spesa).
-- ═══════════════════════════════════════════════════════════════════════
begin;

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  title text not null,
  -- Null = tappa ancora da collocare nel programma.
  starts_at timestamptz,
  duration_minutes int,
  category text not null default 'altro'
    check (category in ('mare', 'cibo', 'cultura', 'drink', 'panorama', 'altro')),
  place_label text,
  lat float8,
  lng float8,
  status text not null default 'proposta'
    check (status in ('proposta', 'confermata', 'prenotata', 'annullata')),
  price_per_person numeric,
  note text,
  created_by uuid not null references public.members(id),
  created_at timestamptz not null default now(),
  -- I vincoli di dominio stanno qui perché il client scrive direttamente su
  -- questa tabella: senza, l'unica validazione sarebbe quella del browser.
  constraint activities_title_length check (char_length(btrim(title)) between 1 and 120),
  constraint activities_duration_positive check (duration_minutes is null or duration_minutes > 0),
  constraint activities_price_not_negative check (price_per_person is null or price_per_person >= 0),
  constraint activities_lat_range check (lat is null or lat between -90 and 90),
  constraint activities_lng_range check (lng is null or lng between -180 and 180),
  -- Una coordinata da sola non è una posizione.
  constraint activities_coords_paired check ((lat is null) = (lng is null))
);

create table if not exists public.activity_participants (
  activity_id uuid not null references public.activities(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (activity_id, member_id)
);

create index if not exists idx_activities_room on public.activities(room_id, starts_at, id);
create index if not exists idx_activity_participants_room on public.activity_participants(room_id);
create index if not exists idx_activity_participants_member on public.activity_participants(member_id);

-- Come per le altre tabelle figlie: `room_id` non si accetta dal browser, si
-- rilegge sempre dal parent, anche negli UPDATE.
create or replace function public.set_room_id_from_activity() returns trigger
language plpgsql set search_path = public as $$
begin
  select a.room_id into new.room_id from public.activities a where a.id = new.activity_id;
  if new.room_id is null then
    raise exception 'Attività non disponibile.' using errcode = '42501';
  end if;
  return new;
end $$;
revoke execute on function public.set_room_id_from_activity() from public, anon, authenticated;

drop trigger if exists trg_room_id on public.activity_participants;
create trigger trg_room_id before insert or update on public.activity_participants
  for each row execute function public.set_room_id_from_activity();

-- RLS scoped come il resto dello schema: una sola policy per tabella, perché
-- due policy permissive combinerebbero i loro USING in OR.
do $$
declare t text;
begin
  foreach t in array array['activities', 'activity_participants'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || ': members', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_room_member(room_id)) with check (public.is_room_member(room_id))', t || ': members', t);
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant select on table public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on table public.%I to authenticated', t);
    -- Senza REPLICA IDENTITY FULL un DELETE porterebbe solo la chiave e il
    -- filtro realtime su room_id lo scarterebbe.
    execute format('alter table public.%I replica identity full', t);
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Il room_id è del trigger, non del client; created_by resta scrivibile solo
-- all'inserimento.
revoke update on public.activities from anon, authenticated;
grant update (title, starts_at, duration_minutes, category, place_label, lat, lng, status, price_per_person, note)
  on public.activities to authenticated;

notify pgrst, 'reload schema';
commit;

-- ═══════════════════════════════════════════════════════════════════════
-- Feature: sondaggi di gruppo.
--
-- Le proposte di sosta (`stop_proposals`) sono una domanda sì/no che scade
-- in pochi minuti mentre si viaggia. Un sondaggio è l'altra metà: più
-- opzioni, nessuna urgenza, e serve a decidere *prima* — dove si cena,
-- quale spiaggia, a che ora si parte. Restano due tabelle distinte perché
-- hanno vincoli diversi: la sosta ha una scadenza obbligatoria e un'auto,
-- il sondaggio no.
--
-- Non è una chat travestita: la domanda è un campo corto e tipizzato, le
-- risposte sono un elenco chiuso di opzioni. Nessun campo libero di
-- risposta, coerentemente con il vincolo fondativo del prodotto.
--
-- Come per le soste, nessuno `status` persistito: un sondaggio è aperto
-- finché `closes_at` è nullo o futuro. Chiuderlo significa scrivere
-- `closes_at = now()`, non aggiornare un secondo campo che può divergere.
--
-- La chiave primaria di `room_poll_votes` è (poll_id, member_id): un voto a
-- testa per costruzione, cambiare idea è un UPDATE di `option_id`. La
-- chiave esterna composita (option_id, poll_id) impedisce di votare
-- un'opzione che appartiene a un altro sondaggio — un vincolo che il
-- browser non può garantire.
-- ═══════════════════════════════════════════════════════════════════════
begin;

create table if not exists public.room_polls (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  question text not null,
  -- Null = resta aperto finché qualcuno non lo chiude.
  closes_at timestamptz,
  created_by uuid not null references public.members(id),
  created_at timestamptz not null default now(),
  constraint room_polls_question_length check (char_length(btrim(question)) between 1 and 120)
);

create table if not exists public.room_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.room_polls(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now(),
  constraint room_poll_options_label_length check (char_length(btrim(label)) between 1 and 80),
  -- Due opzioni identiche nello stesso sondaggio sono un errore di battitura,
  -- non una scelta: il voto si spaccherebbe fra due righe indistinguibili.
  constraint room_poll_options_unique_label unique (poll_id, label),
  -- Bersaglio della chiave esterna composita dei voti.
  constraint room_poll_options_id_poll unique (id, poll_id)
);

create table if not exists public.room_poll_votes (
  poll_id uuid not null references public.room_polls(id) on delete cascade,
  option_id uuid not null,
  member_id uuid not null references public.members(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  voted_at timestamptz not null default now(),
  primary key (poll_id, member_id),
  constraint room_poll_votes_option_of_poll
    foreign key (option_id, poll_id) references public.room_poll_options(id, poll_id) on delete cascade
);

create index if not exists idx_room_polls_room on public.room_polls(room_id, created_at, id);
create index if not exists idx_room_poll_options_room on public.room_poll_options(room_id, poll_id);
create index if not exists idx_room_poll_votes_room on public.room_poll_votes(room_id);
create index if not exists idx_room_poll_votes_option on public.room_poll_votes(option_id);

-- Come per le altre tabelle figlie: `room_id` non si accetta dal browser, si
-- rilegge sempre dal sondaggio, anche negli UPDATE.
create or replace function public.set_room_id_from_poll() returns trigger
language plpgsql set search_path = public as $$
begin
  select p.room_id into new.room_id from public.room_polls p where p.id = new.poll_id;
  if new.room_id is null then
    raise exception 'Sondaggio non disponibile.' using errcode = '42501';
  end if;
  return new;
end $$;
revoke execute on function public.set_room_id_from_poll() from public, anon, authenticated;

drop trigger if exists trg_room_id on public.room_poll_options;
create trigger trg_room_id before insert or update on public.room_poll_options
  for each row execute function public.set_room_id_from_poll();

drop trigger if exists trg_room_id on public.room_poll_votes;
create trigger trg_room_id before insert or update on public.room_poll_votes
  for each row execute function public.set_room_id_from_poll();

do $$
declare t text;
begin
  foreach t in array array['room_polls', 'room_poll_options', 'room_poll_votes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || ': members', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_room_member(room_id)) with check (public.is_room_member(room_id))', t || ': members', t);
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant select on table public.%I to anon, authenticated', t);
    execute format('grant insert, delete on table public.%I to authenticated', t);
    -- Senza REPLICA IDENTITY FULL un DELETE porterebbe solo la chiave e il
    -- filtro realtime su room_id lo scarterebbe.
    execute format('alter table public.%I replica identity full', t);
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Aggiornabile solo ciò che cambia davvero: la domanda finché ha senso
-- correggerla, la chiusura, e l'opzione votata quando si cambia idea.
-- `room_id` resta del trigger, `created_by` scrivibile solo all'inserimento.
grant update (question, closes_at) on public.room_polls to authenticated;
grant update (label) on public.room_poll_options to authenticated;
grant update (option_id, voted_at) on public.room_poll_votes to authenticated;

notify pgrst, 'reload schema';
commit;

-- ═══════════════════════════════════════════════════════════════════════
-- Feature: rimborsi registrati.
--
-- `computeBalances` sa già chi deve quanto a chi, ma il rimborso vero
-- avviene fuori dall'app: contanti, un bonifico, un giro di birre. Finora
-- quel passaggio non era registrabile e il saldo restava aperto per
-- sempre, quindi l'unico modo di "chiudere i conti" era smettere di
-- guardarli.
--
-- Una riga qui è un fatto avvenuto: Tizio ha dato X a Caio. Per questo la
-- tabella non è aggiornabile — un importo sbagliato si cancella e si
-- riscrive, invece di essere riscritto sopra lasciando credere a chi lo
-- aveva già letto che avesse letto male.
--
-- `room_id` e la coerenza fra i due membri sono derivati dal server: due
-- membri di stanze diverse non possono comparire nello stesso rimborso.
-- ═══════════════════════════════════════════════════════════════════════
begin;

create table if not exists public.expense_settlements (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  from_member_id uuid not null references public.members(id) on delete cascade,
  to_member_id uuid not null references public.members(id) on delete cascade,
  amount numeric not null,
  note text,
  recorded_by uuid not null references public.members(id),
  settled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint expense_settlements_amount_positive check (amount > 0),
  constraint expense_settlements_note_length check (note is null or char_length(btrim(note)) between 1 and 80),
  -- Un rimborso a se stessi non sposta nulla: è sempre un errore di scelta.
  constraint expense_settlements_distinct_members check (from_member_id <> to_member_id)
);

create index if not exists idx_expense_settlements_room on public.expense_settlements(room_id, settled_at, id);

create or replace function public.set_room_id_from_settlement() returns trigger
language plpgsql set search_path = public as $$
declare v_from uuid; v_to uuid;
begin
  select m.room_id into v_from from public.members m where m.id = new.from_member_id;
  select m.room_id into v_to from public.members m where m.id = new.to_member_id;
  if v_from is null or v_to is null or v_from <> v_to then
    raise exception 'I due membri non appartengono allo stesso evento.' using errcode = '42501';
  end if;
  new.room_id := v_from;
  return new;
end $$;
revoke execute on function public.set_room_id_from_settlement() from public, anon, authenticated;

drop trigger if exists trg_room_id on public.expense_settlements;
create trigger trg_room_id before insert or update on public.expense_settlements
  for each row execute function public.set_room_id_from_settlement();

alter table public.expense_settlements enable row level security;
drop policy if exists "expense_settlements: members" on public.expense_settlements;
create policy "expense_settlements: members" on public.expense_settlements for all to authenticated
  using (public.is_room_member(room_id)) with check (public.is_room_member(room_id));
revoke all on table public.expense_settlements from public, anon, authenticated;
grant select on table public.expense_settlements to anon, authenticated;
-- Nessun UPDATE, di nessuna colonna: si cancella e si riscrive.
grant insert, delete on table public.expense_settlements to authenticated;
alter table public.expense_settlements replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'expense_settlements'
  ) then
    alter publication supabase_realtime add table public.expense_settlements;
  end if;
end $$;

notify pgrst, 'reload schema';
commit;

-- ═══════════════════════════════════════════════════════════════════════
-- Fix: l'autore dichiarato deve essere chi scrive.
--
-- Cinque tabelle hanno una colonna d'autore scritta dal browser
-- (`activities.created_by`, `stop_proposals.proposed_by`,
-- `room_checklist_items.created_by`, più le due nuove). Le policy
-- verificano l'appartenenza alla stanza, non l'identità: un membro poteva
-- firmare una riga col nome di un altro membro della stessa stanza.
--
-- Il controllo è uno solo, generico sulla colonna passata come argomento,
-- applicato a tutte e cinque insieme: chiuderne una sola avrebbe lasciato
-- le altre aperte e reso più difficile accorgersene.
--
-- All'INSERT l'autore deve essere chi scrive. All'UPDATE, invece, la
-- collaborazione resta intatta — chiunque può confermare la tappa proposta
-- da un altro o assegnarsi un compito scritto da un altro — e si vieta solo
-- di riscrivere l'autore: quella riga continua a dire chi l'ha creata.
--
-- La funzione non è `security definer`: gira coi privilegi di chi scrive e
-- legge `members` e `member_devices` attraverso le loro policy: il membro
-- citato è visibile solo se appartiene alla stanza, il device solo se è il
-- proprio. È la stessa identità di `is_room_member`, membro o device
-- rivendicato con un link di recupero.
-- ═══════════════════════════════════════════════════════════════════════
begin;

create or replace function public.tt_author_is_caller() returns trigger
language plpgsql set search_path = public as $$
declare
  v_member uuid := (to_jsonb(new) ->> tg_argv[0])::uuid;
begin
  if tg_op = 'UPDATE' then
    if v_member is distinct from (to_jsonb(old) ->> tg_argv[0])::uuid then
      raise exception 'L''autore di una riga non si cambia.' using errcode = '42501';
    end if;
    return new;
  end if;

  if not exists (
    select 1 from public.members m
    left join public.member_devices d on d.member_id = m.id
    where m.id = v_member and (m.auth_user_id = auth.uid() or d.auth_user_id = auth.uid())
  ) then
    raise exception 'Puoi scrivere solo a tuo nome.' using errcode = '42501';
  end if;
  return new;
end $$;
revoke execute on function public.tt_author_is_caller() from public, anon, authenticated;

do $$
declare r record;
begin
  for r in select * from (values
    ('activities', 'created_by'),
    ('stop_proposals', 'proposed_by'),
    ('room_checklist_items', 'created_by'),
    ('room_polls', 'created_by'),
    ('expense_settlements', 'recorded_by')
  ) as t(tbl, col) loop
    execute format('drop trigger if exists trg_author on public.%I', r.tbl);
    execute format(
      'create trigger trg_author before insert or update on public.%I for each row execute function public.tt_author_is_caller(%L)',
      r.tbl, r.col);
  end loop;
end $$;

commit;

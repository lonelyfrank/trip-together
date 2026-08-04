-- STEP 3b — denormalizzazione room_id + replica identity per realtime affidabile.
--
-- 1) Aggiunge room_id alle tabelle figlie che ne erano prive, con backfill dal
--    parent, così ogni sottoscrizione realtime può filtrare per room_id (prima
--    6 erano senza filtro e scatenavano refetch da qualsiasi stanza).
-- 2) Imposta REPLICA IDENTITY FULL sulle tabelle scoped alla stanza: senza,
--    gli eventi DELETE portano solo la PK, quindi un filtro su room_id (non-PK)
--    li scarterebbe e le cancellazioni non arriverebbero in tempo reale.
-- Idempotente.

-- ─── room_id sulle figlie + backfill ───────────────────────────────────
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

-- ─── trigger: popola room_id all'insert dal parent ────────────────────
-- Così ogni nuova riga ha room_id valorizzato senza toccare i componenti:
-- il filtro realtime room_id=eq matcha e la patch mirata scatta.
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

-- ─── replica identity full sulle tabelle scoped alla stanza ─────────────
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

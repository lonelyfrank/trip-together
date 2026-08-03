-- Feature 7: comitive (gruppi persistenti che contengono più eventi).

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

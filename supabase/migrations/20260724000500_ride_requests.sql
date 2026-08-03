-- Feature 5: matching passeggeri-auto.

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

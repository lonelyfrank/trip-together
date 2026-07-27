-- Feature 5: Matching passeggeri-auto
-- Adattato ai nomi reali: `members` (non `room_members`), `car_passengers`
-- (non `car_members`, che non esiste in questo schema).

create table if not exists ride_requests (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  member_id uuid not null references members(id),
  status text not null default 'pending' check (status in ('pending', 'matched', 'cancelled')),
  created_at timestamptz not null default now(),
  matched_car_id uuid references cars(id)
);

create index if not exists idx_ride_requests_room on ride_requests(room_id);

alter table ride_requests enable row level security;

create policy "ride_requests: scoped to room members" on ride_requests for all
using (
  exists (select 1 from members m where m.room_id = ride_requests.room_id and m.auth_user_id = auth.uid())
)
with check (
  exists (select 1 from members m where m.room_id = ride_requests.room_id and m.auth_user_id = auth.uid())
);

alter publication supabase_realtime add table ride_requests;

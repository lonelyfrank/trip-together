-- Feature 2: Ritardo dichiarato
-- Adattato ai nomi reali: `members` (non `room_members`).
-- delay_reports non ha room_id diretto (solo car_id) — la RLS scoped a
-- membri della stanza passa quindi per un join cars -> members.

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

alter table delay_reports enable row level security;

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

alter publication supabase_realtime add table delay_reports;

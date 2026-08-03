-- Feature 2: ritardo dichiarato per auto.

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

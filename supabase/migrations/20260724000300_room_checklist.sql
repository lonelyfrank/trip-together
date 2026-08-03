-- Feature 3: checklist di stanza (trasversale, distinta dal carico per auto).

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

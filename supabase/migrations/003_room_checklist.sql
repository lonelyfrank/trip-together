-- Feature 3: Checklist di stanza (trasversale, non per auto)
-- Adattato ai nomi reali: `members` (non `room_members`).

create table if not exists room_checklist_items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  title text not null,
  assigned_to uuid references members(id),
  status text not null default 'da_portare' check (status in ('da_portare', 'portato')),
  created_by uuid not null references members(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_room_checklist_room on room_checklist_items(room_id);

alter table room_checklist_items enable row level security;

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

alter publication supabase_realtime add table room_checklist_items;

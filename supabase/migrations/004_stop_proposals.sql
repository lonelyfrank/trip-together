-- Feature 4: Tappa proposta (sosta condivisa, votabile)
-- Adattato ai nomi reali: `members` (non `room_members`).
-- stop_proposal_votes non ha room_id/car_id diretto — RLS scoped tramite
-- doppio join: votes -> stop_proposals -> members.

create table if not exists stop_proposals (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
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

alter table stop_proposals enable row level security;
alter table stop_proposal_votes enable row level security;

create policy "stop_proposals: scoped to room members" on stop_proposals for all
using (
  exists (select 1 from members m where m.room_id = stop_proposals.room_id and m.auth_user_id = auth.uid())
)
with check (
  exists (select 1 from members m where m.room_id = stop_proposals.room_id and m.auth_user_id = auth.uid())
);

create policy "stop_proposal_votes: scoped to room members" on stop_proposal_votes for all
using (
  exists (
    select 1 from stop_proposals sp
    join members m on m.room_id = sp.room_id
    where sp.id = stop_proposal_votes.proposal_id and m.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from stop_proposals sp
    join members m on m.room_id = sp.room_id
    where sp.id = stop_proposal_votes.proposal_id and m.auth_user_id = auth.uid()
  )
);

alter publication supabase_realtime add table stop_proposals;
alter publication supabase_realtime add table stop_proposal_votes;

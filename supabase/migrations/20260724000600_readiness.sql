-- Feature 6: readiness pre-evento. Solo colonne (nessuna tabella nuova).

alter table rooms add column if not exists event_time timestamptz;

alter table members
  add column if not exists confirmed boolean not null default false,
  add column if not exists confirmed_at timestamptz;

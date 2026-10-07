-- Product Hub schema: Project → Version → Feature, with POCs, research, notes,
-- activity and shared saved filters. Mirrors the data model in design/README.md.
--
-- Access model: only the Next.js server talks to Supabase, using the
-- service-role key after Auth.js has verified the user. RLS is enabled on every
-- table with no policies, so the anon/public key can read or write nothing.
--
-- This replaces the earlier ProducSpace schema (tasks, project/task watching).
-- The `users` table is kept and extended so existing accounts keep working.

-- ---------------------------------------------------------------------------
-- Remove the earlier schema
-- ---------------------------------------------------------------------------
drop table if exists watches, activity, feature_notes, tasks, poc_projects, poc_features,
  features, versions, projects, pocs, research_items cascade;
drop type if exists version_status, confidence_level, feature_status, task_status,
  priority_level, research_status, watch_target cascade;

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- Users (team members). A row with no password_hash is a pending invite.
-- ---------------------------------------------------------------------------
create table if not exists users (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  name       text,
  image      text,
  created_at timestamptz not null default now()
);
alter table users
  add column if not exists password_hash       text,
  add column if not exists invited_by          uuid references users(id) on delete set null,
  add column if not exists invite_role         text,
  add column if not exists activated_at        timestamptz,
  add column if not exists role_title          text,
  add column if not exists timezone            text not null default 'Asia/Kolkata',
  add column if not exists notify_watch        boolean not null default true,
  add column if not exists notify_conf         boolean not null default true,
  add column if not exists password_changed_at timestamptz;

-- ---------------------------------------------------------------------------
-- Customer POCs
-- ---------------------------------------------------------------------------
create table pocs (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  org        text,
  role       text,
  email      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------
create table projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  status      text not null default 'Planned' check (status in ('Planned', 'Active', 'Completed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table project_owners (
  project_id uuid not null references projects(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index project_owners_user_idx on project_owners(user_id);

create table project_pocs (
  project_id uuid not null references projects(id) on delete cascade,
  poc_id     uuid not null references pocs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, poc_id)
);
create index project_pocs_poc_idx on project_pocs(poc_id);

-- ---------------------------------------------------------------------------
-- Versions (deleted with their project)
-- ---------------------------------------------------------------------------
create table versions (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  num         integer not null check (num > 0),
  name        text not null,
  description text,
  status      text not null default 'Planned' check (status in ('Planned', 'In Progress', 'Completed')),
  target_date date,
  confidence  integer not null default 50 check (confidence between 0 and 100),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (project_id, num)
);

create table confidence_history (
  id         uuid primary key default gen_random_uuid(),
  version_id uuid not null references versions(id) on delete cascade,
  from_value integer check (from_value between 0 and 100), -- null for the initial estimate
  to_value   integer not null check (to_value between 0 and 100),
  changed_by uuid references users(id) on delete set null,
  reason     text not null,
  created_at timestamptz not null default now()
);
create index confidence_history_version_idx on confidence_history(version_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Features — the unit of work. A null version_id means "No project"; deleting
-- a version (or its project) moves its features there.
-- ---------------------------------------------------------------------------
create table features (
  id           uuid primary key default gen_random_uuid(),
  version_id   uuid references versions(id) on delete set null,
  name         text not null,
  description  text,
  status       text not null default 'Planned' check (status in ('Planned', 'In Progress', 'Blocked', 'Completed')),
  priority     text not null default 'Medium' check (priority in ('High', 'Medium', 'Low')),
  stakeholders text,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index features_version_idx on features(version_id);

create table feature_owners (
  feature_id uuid not null references features(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (feature_id, user_id)
);
create index feature_owners_user_idx on feature_owners(user_id);

create table feature_watchers (
  feature_id uuid not null references features(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (feature_id, user_id)
);
create index feature_watchers_user_idx on feature_watchers(user_id);

create table feature_pocs (
  feature_id uuid not null references features(id) on delete cascade,
  poc_id     uuid not null references pocs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (feature_id, poc_id)
);
create index feature_pocs_poc_idx on feature_pocs(poc_id);

-- ---------------------------------------------------------------------------
-- Research
-- ---------------------------------------------------------------------------
create table research_items (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  url        text,
  category   text,
  status     text not null default 'To research' check (status in ('To research', 'Researching', 'Reviewed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table research_projects (
  research_id uuid not null references research_items(id) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (research_id, project_id)
);
create index research_projects_project_idx on research_projects(project_id);

-- ---------------------------------------------------------------------------
-- Notes: exactly one parent (project, version, feature or research item).
-- Body is markdown-lite; it may be empty when the note only has attachments.
-- ---------------------------------------------------------------------------
create table notes (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references projects(id) on delete cascade,
  version_id  uuid references versions(id) on delete cascade,
  feature_id  uuid references features(id) on delete cascade,
  research_id uuid references research_items(id) on delete cascade,
  body        text not null default '',
  author_id   uuid references users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint notes_one_parent check (num_nonnulls(project_id, version_id, feature_id, research_id) = 1)
);
create index notes_project_idx  on notes(project_id, created_at desc)  where project_id  is not null;
create index notes_version_idx  on notes(version_id, created_at desc)  where version_id  is not null;
create index notes_feature_idx  on notes(feature_id, created_at desc)  where feature_id  is not null;
create index notes_research_idx on notes(research_id, created_at desc) where research_id is not null;

-- Files live in the private `attachments` Storage bucket at storage_path.
create table note_attachments (
  id           uuid primary key default gen_random_uuid(),
  note_id      uuid not null references notes(id) on delete cascade,
  storage_path text not null unique,
  name         text not null,
  size         bigint not null default 0 check (size >= 0),
  mime_type    text,
  created_at   timestamptz not null default now()
);
create index note_attachments_note_idx on note_attachments(note_id);

-- ---------------------------------------------------------------------------
-- Activity feed. Types match the prototype's log() calls. Activity for a
-- deleted project goes with it; a deleted feature or version only unlinks.
-- ---------------------------------------------------------------------------
create table activity (
  id         uuid primary key default gen_random_uuid(),
  type       text not null check (type in ('completed', 'status', 'assigned', 'feature', 'confidence', 'note', 'due')),
  text       text not null,
  actor_id   uuid references users(id) on delete set null,
  project_id uuid references projects(id) on delete cascade,
  version_id uuid references versions(id) on delete set null,
  feature_id uuid references features(id) on delete set null,
  created_at timestamptz not null default now()
);
create index activity_created_idx on activity(created_at desc);
create index activity_project_idx on activity(project_id, created_at desc);
create index activity_feature_idx on activity(feature_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Saved filters, shared across the team.
-- rules: [{ "field": "project|version|status|owner|poc|priority", "op": "is|not", "value": "<id or label>" }]
-- ---------------------------------------------------------------------------
create table saved_filters (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  rules      jsonb not null check (jsonb_typeof(rules) = 'array'),
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create trigger pocs_updated_at           before update on pocs           for each row execute function set_updated_at();
create trigger projects_updated_at       before update on projects       for each row execute function set_updated_at();
create trigger versions_updated_at       before update on versions       for each row execute function set_updated_at();
create trigger features_updated_at       before update on features       for each row execute function set_updated_at();
create trigger research_items_updated_at before update on research_items for each row execute function set_updated_at();
create trigger notes_updated_at          before update on notes          for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Lock down direct access (the server uses the service-role key)
-- ---------------------------------------------------------------------------
alter table users              enable row level security;
alter table pocs               enable row level security;
alter table projects           enable row level security;
alter table project_owners     enable row level security;
alter table project_pocs       enable row level security;
alter table versions           enable row level security;
alter table confidence_history enable row level security;
alter table features           enable row level security;
alter table feature_owners     enable row level security;
alter table feature_watchers   enable row level security;
alter table feature_pocs       enable row level security;
alter table research_items     enable row level security;
alter table research_projects  enable row level security;
alter table notes              enable row level security;
alter table note_attachments   enable row level security;
alter table activity           enable row level security;
alter table saved_filters      enable row level security;

-- ---------------------------------------------------------------------------
-- Private Storage bucket for note attachments. No storage policies are added,
-- so only the service role can read or write; files are served via signed URLs.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do update set public = false;

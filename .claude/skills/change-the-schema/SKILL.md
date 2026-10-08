---
name: change-the-schema
description: >
  Change the Postgres schema behind Product Hub and carry the change through every place that mirrors
  it: a new migration in `supabase/migrations/`, the row types and `as const` value lists in
  `src/lib/types.ts`, the tone maps and select options in the hub, then queries, actions and view
  loaders. Trigger BEFORE adding or changing a table, column, check constraint, status or priority
  value, link table, foreign key, index or Storage bucket; before declaring a new row type or value
  list; and when the app needs to store something no column holds.
argument-hint: '[the table, column or value you need]'
---

# Change the schema

The schema is SQL, written by hand, in `supabase/migrations/`. There is no ORM and no generated
types: `src/lib/types.ts` mirrors the migration by hand, so every change is made twice, and the
compiler cannot tell you when the two disagree. That is what this skill guards.

Today there is one migration, `20261008000000_product_hub.sql`. It is destructive at the top (it
drops the earlier ProducSpace tables), which is one more reason never to re-run or edit it.

## must

1. **A change is a new migration file. Never edit one that has been applied.** Name it
   `supabase/migrations/<YYYYMMDDHHMMSS>_<what>.sql`, later than every existing file. An edited
   migration does not re-run anywhere it has already run, so the environments silently diverge.
   Apply it with the Supabase CLI (`supabase db push`, not a project dependency) or paste it into the
   SQL editor — and say in your report which you did, or that it is not applied yet.
2. **A fixed set of values is a `text` column with a `check` constraint**, not a Postgres enum:
   `status text not null default 'Planned' check (status in ('Planned', 'Active', 'Completed'))`.
   It is mirrored by an `as const` array in `src/lib/types.ts` (`PROJECT_STATUSES`, `PRIORITIES`,
   `ACTIVITY_TYPES` …) and a type derived from it (`(typeof X)[number]`). The array is what
   `oneOf()` validates against, so the SQL list and the array must match exactly, including case
   and spacing ("In Progress").
   To change one, drop and re-add the constraint — an inline check is named `<table>_<column>_check`:

   ```sql
   alter table features drop constraint features_status_check;
   alter table features add constraint features_status_check
     check (status in ('Planned', 'In Progress', 'In Review', 'Blocked', 'Completed'));
   ```

3. **A new value reaches every mirror in the same change:**
   - `src/lib/types.ts` — the array.
   - `src/lib/hub.ts` — `ST_TONE` / `PRI_TONE` / `ACT_TONE`, or it renders gray.
   - `src/components/hub/StatusSelect.tsx` (`OPTIONS`), `StatusPill.tsx` (`TONE`),
     `PrioritySelect.tsx` (`Priority`) — each keeps its own list, ported from the design.
   - `design/README.md` § "Status mapping" if the design should know it.
   `grep -rn "'In Progress'" src` finds the copies.
4. **Every new table gets RLS enabled, with no policies**:
   `alter table <t> enable row level security;`. The server reads with the service-role key, which
   bypasses RLS; the absence of policies is what makes the anon key useless. Never add a policy —
   that would open the table to the browser.
5. **Choose `on delete` deliberately, by what the row means:**
   | Reference                                    | Rule                     | Example                                   |
   | -------------------------------------------- | ------------------------ | ----------------------------------------- |
   | a part of its parent                         | `cascade`                | `versions.project_id`, `notes.*_id`       |
   | an optional home the row survives losing     | `set null`               | `features.version_id` → "No project"      |
   | who did it (author, actor, inviter)          | `set null`               | `notes.author_id`, `activity.actor_id`    |
   | both sides of a link table                   | `cascade`                | `feature_owners`                          |
   The delete-impact rules in `design/README.md` are the spec: deleting a project keeps its features,
   deleting a POC keeps what it was linked to.
6. **A nullable column is `T | null` in `types.ts`, never `T?`.** PostgREST returns the key with
   `null`; `?` would claim it can be missing.

## The shapes this schema already uses

- **Every entity**: `id uuid primary key default gen_random_uuid()`, `created_at timestamptz not null
  default now()`, and — if it is edited — `updated_at` plus the trigger:
  `create trigger <t>_updated_at before update on <t> for each row execute function set_updated_at();`
- **A link table**: both foreign keys `not null … on delete cascade`, a `created_at` (owners are shown
  in the order they were added, via `byLinkOrder`), a composite primary key, and an index on the
  second column for the reverse lookup:

  ```sql
  create table feature_pocs (
    feature_id uuid not null references features(id) on delete cascade,
    poc_id     uuid not null references pocs(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (feature_id, poc_id)
  );
  create index feature_pocs_poc_idx on feature_pocs(poc_id);
  ```

  The primary key is what makes a repeat insert fail with `23505`, which the actions treat as a no-op.
- **Exactly one of several parents**: nullable FKs plus
  `check (num_nonnulls(project_id, version_id, feature_id, research_id) = 1)`, mirrored by the
  `NoteParent` discriminated union in `types.ts`.
- **Soft state, not soft delete**: features archive with `archived_at timestamptz` (null = active).
  Everything else is hard-deleted; activity survives a feature or version delete by `set null`.
- **Partial indexes** for sparse FKs: `create index … on notes(feature_id, created_at desc) where
  feature_id is not null`. Index the column a list filters on, ordered the way it sorts.
- **Files** live in the private `attachments` bucket with no storage policies; rows store the path
  and the app serves signed URLs.

## After the migration

In order — each step needs the one before:

1. `src/lib/types.ts`: the row interface and any value array.
2. `src/lib/queries.ts`: the select fragment and row type that expose it (`add-server-action`).
3. `src/lib/actions.ts`: validation with `validate.ts`, the write, and the activity entry.
4. The view loader (`src/lib/*-view.ts`) and the view.
5. `npm run verify`. It proves the TypeScript agrees with itself — not that it agrees with the
   database. Without `SUPABASE_URL` set, nothing in this repo can check the SQL; say so.

## should

- Write the migration so it can be read top to bottom as the change: a short header comment saying
  what and why, then DDL. `if not exists` where re-running is plausible.
- Default new columns so existing rows stay valid (`not null default …`), rather than a two-step
  backfill.
- Prefer deriving a hub list from `src/lib/types.ts` (hub may import it) when you are already
  editing that hub file — it removes one mirror for next time.
- Keep `CLAUDE.md`'s pointer to the schema file current if you add the first migration after this one.

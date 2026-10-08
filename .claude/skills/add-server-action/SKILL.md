---
name: add-server-action
description: >
  Add or change a read or a write: a query in `src/lib/queries.ts`, a server action in
  `src/lib/actions.ts`, a view loader, or the page that loads data for a view. Covers the session
  check every entry point owes (RLS has no policies, so nothing else protects the data), input
  validation, the activity log, revalidation, and how drawers reload. Trigger BEFORE adding or
  editing anything in `src/lib/actions.ts`, `src/lib/queries.ts` or `src/lib/*-view.ts`, before a
  page under `src/app/(app)/` loads data, before a client component calls the server, and when a
  screen needs data no query returns yet.
argument-hint: '[what the action or query does]'
---

# Add a server action or query

There is no API layer. Server components read through `src/lib/queries.ts`; client components write
(and occasionally read) through the server actions in `src/lib/actions.ts`. Both use `db()` from
`src/lib/supabase.ts`, which holds the **service-role key** — it bypasses RLS entirely. Every table
has RLS enabled with **no policies**, so the browser can reach nothing, and the only thing standing
between a request and the data is the session check in the entry point. `src/proxy.ts` redirects
signed-out page visits, but it is not a substitute: actions and pages check again.

## must

1. **Every write is an exported `async` function in `src/lib/actions.ts` that returns
   `run(async (me) => { … })`.** `run()` calls `requireUser()`, turns a `ValidationError` into
   `{ error }`, calls `revalidatePath('/', 'layout')` on success, and lets anything else throw. Do not
   call `requireUser()` or `revalidatePath` yourself, and do not catch database errors — an
   unexpected failure should throw.
2. **Validate every argument with `src/lib/validate.ts`, inside `run`.** Arguments from the client
   are `unknown` in practice whatever the TypeScript signature says. `uuid`, `uuids`, `text`,
   `optText`, `oneOf`, `optDate`, `clampInt`, `bool`. Each throws a `ValidationError` with a
   user-facing sentence ("Name is required."). A status or priority goes through
   `oneOf(v, FEATURE_STATUSES, 'Status')` with the `as const` array from `src/lib/types.ts`.
3. **Resolve the target row before writing**, through the `get*Ctx` helpers (`getFeatureCtx`,
   `getVersionCtx`, `getProjectCtx`, `getPocCtx`, `getMember`). A miss throws
   `ValidationError('Feature not found.')`, and the context carries what the activity entry needs.
4. **Every database call goes through `unwrap()`**, which throws on a Supabase error. The one
   deliberate exception: a link-table insert reads `{ error }` itself so a duplicate
   (`error?.code === '23505'`) is a no-op.
5. **Log the change types the design shows with `log(me, type, text, refs)`.** `type` is one of
   `ACTIVITY_TYPES`; `refs` carries `projectId` / `versionId` / `featureId` so it appears on the
   right feed. Text is lower-case and past tense, as the prototype writes it: `` `moved ${f.name} to ${status}` ``.
6. **Reads used by a page live in `queries.ts`**, which is `server-only` and checks nothing. So the
   page must: `const [me, data] = await requireUserWith((uid) => Promise.all([...]))`. That starts
   the reads concurrently with the account check and only returns them once it passes.
   `/pocs` and `/research` currently call their query bare and rely on the layout's check; do not
   copy that.
7. **A read the client calls on demand** (a drawer loader, the search index) is an action in
   `actions.ts` wrapped in `requireUserWith`, not `run` — it must not revalidate. It returns `null`
   for an invalid id rather than throwing (see `getFeatureDrawer`).
8. **Delete Storage files before the rows that point at them** — `removeNoteFiles(column, ids)` —
   because `on delete cascade` removes the `note_attachments` rows and with them the paths.

## should

- **Select fragments, not ad-hoc strings.** `MEMBER`, `FEATURE`, `NOTE`, `PROJECT_LINKS` at the top
  of `queries.ts` are the PostgREST embeds every list reuses. Link tables come back as
  `{ created_at, user }[]`; flatten them with `byLinkOrder` so owners appear in the order they were
  added.
- **Type the row once, next to the query**: `export type FeatureRow = Feature & { … }` built from
  `src/lib/types.ts`. PostgREST's inferred types are not used, so the cast after `unwrap` is
  `as unknown as RawX[]` followed by a `toX()` mapper — keep that cast in one place per entity.
- **One round trip where PostgREST allows it.** `listFeatures` inner-joins its owner/watcher/project
  filters into the same request; independent reads go in `Promise.all`; `inOrder()` runs lookups
  together while reporting the first failure in order.
- **A view loader** (`src/lib/feature-view.ts`, `poc-view.ts`, `research-view.ts`) turns query rows
  into the exact props a drawer or `NoteThread` expects — relative times, avatar colours, signed
  attachment URLs via `threadNotes()`. Put that shaping there, not in the component.
- **Patch actions take a partial and write only what changed**: build `fields: Record<string, unknown>`
  from the keys that are `!== undefined`, return early when empty, then log only real transitions
  (`fields.status !== f.status`).
- A create returns `{ id }` so the client can open what it made.

## On the client

- Pages are thin server components: `requireUserWith`, reshape into view props, render a
  `'use client'` view from `src/components/`.
- Views call actions directly inside `useTransition`, with `useOptimistic` for instant feedback.
  Check the result: `if (res.error) return setErr(res.error);`.
- `revalidatePath` refreshes server-rendered pages, **not drawers**. A drawer host
  (`FeatureDrawerHost`, `PocDrawerHost`, …) loads through its `get*Drawer` action and must call its
  `reload()` after every mutation, as `poc-drawer.tsx`'s local `run()` does.
- Files go up as `FormData` (see `addNote`): 5 MB per file, 25 MB per note; `next.config.ts` raises
  the server-action body limit to 26 MB to match.

## The shape of an action

```ts
/** Sets a feature's stakeholders. */
export async function setStakeholders(id: string, value: string) {
  return run(async (me) => {
    const f = await getFeatureCtx(uuid(id, 'feature'));
    const stakeholders = optText(value, 'Stakeholders', 500);
    unwrap(await db().from('features').update({ stakeholders }).eq('id', f.id));
    await log(me, 'status', `updated stakeholders on ${f.name}`, {
      projectId: f.projectId,
      versionId: f.version_id,
      featureId: f.id,
    });
  });
}
```

Check `design/README.md` § "Interactions & behaviour" and the prototype's `log()` calls before
deciding whether a change is logged at all — not every mutation is.

## Related skills

- `change-the-schema` — a new column or table comes before the query that reads it.
- `type-strictly` — the input types, and why `?` on a patch field is fine but on a decision is not.
- `verify-changes` — `npm run verify`, and what you cannot verify without a database.

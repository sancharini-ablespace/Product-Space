---
name: type-strictly
description: >
  Keep the types honest: no optional parameter that stands in for a decision, no default in front of
  a required argument, no sentinel value meaning "none", no `!` or `as` to quiet the compiler. When a
  value is genuinely absent sometimes, model both cases as a union so every caller handles both.
  Trigger BEFORE adding `?` to a parameter or property; before a default value on a parameter;
  before `!`, `as`, `?? ''` or `?.` written to satisfy the compiler; when a function takes a boolean
  that changes what it does; when an empty string, `0` or `-1` is about to mean "none"; and when
  declaring the input type of a server action.
argument-hint: '[the signature or shape you are declaring]'
---

# Type strictly

`tsconfig.json` is `strict`. The compiler only helps where the types tell the truth: every `?` claims
a caller may ignore the value, and every sentinel (`''`, `0`) is a claim it cannot check at all.

## must

1. **No optional parameter when its absence is a decision.** If leaving an argument out selects
   different behaviour, name the choice. An optional cannot tell "I mean the other case" from
   "I forgot".

   ```ts
   // As written today in queries.ts: what does an absent `archived` mean? (Both, it turns out.)
   interface FeatureFilter { archived?: boolean; /* true = archived, false = active, undefined = both */ }

   // Stated, and unreachable by omission:
   type ArchiveScope = 'active' | 'archived' | 'all';
   ```

2. **No sentinel standing in for absence.** `createFeature` documents "versionId empty = No
   project", so `''`, `null` and `undefined` all mean the same thing and the type admits all three.
   A new shape says it once: `versionId: string | null`, where `null` is "No project".

3. **No default in front of a required parameter.** `f(a: string, b = false, c: string)` compiles,
   but no caller can leave `b` out. Required first, defaulted last — as `uuid(v, what = 'id')` and
   `text(v, label, max = 200)` do.

4. **Never satisfy the compiler with `!`, `as` or `?? ''`.** Narrow instead and let the branch that
   cannot continue throw. `no-non-null-assertion` is a warning with 41 standing — `requireProfile`'s
   `(await accountRow(user.id))!`, `av()`'s `n[0]!` — so do not add the 42nd. A cast needs a reason
   on the line above (`write-comments`).

5. **No `any`.** ESLint error. Take `unknown` and narrow, or declare the shape. The one allowed form
   is a generic constraint where `unknown[]` would reject every concrete callback, with an inline
   disable and its reason.

6. **A union beats a bag of optional fields.** Two optionals describe four shapes, of which perhaps
   two are real. `NoteParent` is the model: `{ kind: 'project'; id } | { kind: 'version'; id } | …`,
   matching the `notes_one_parent` check in SQL. `ActionResult { error?: string; id?: string }` is
   the standing counter-example — a new result type should be `{ error: string } | { id: string }`.

7. **A server action's parameter types are a wish, not a guarantee.** The client can send anything.
   Treat each argument as `unknown` and run it through `src/lib/validate.ts` inside `run()`;
   `oneOf(v, FEATURE_STATUSES, 'Status')` is what makes `FeatureStatus` true at runtime.

## should

- **Two functions over one behaviour-switching boolean.** `deleteProjects(ids, true)` says nothing
  at the call site; `setProjectLink(…, on)` toggles between an insert and a delete. For a new action
  prefer `deleteProjectsAndFeatures(ids)` / `deleteProjects(ids)`, or an options object with a named
  field. The ceiling `max-params: 4` exists for the same reason.
- **Optional is right when absence has one meaning that nobody branches on.** Patch inputs
  (`updateFeature(id, patch: { name?: string; … })`) are the good case: absent means "unchanged",
  and the code checks `!== undefined` exactly once.
- **Widen at the edge, resolve once.** A value the client may omit is optional at the action's
  boundary; the moment it is validated, it becomes a required internal value (`optText` returns
  `string | null`, never `undefined`).
- **Let the narrow type flow.** If a helper returns `T | null` and its one caller cannot continue
  without a `T`, throw in the helper — as `getFeatureCtx` does — and return `T`.
- **`interface` for object shapes** (`consistent-type-definitions`, warn); `type` for unions,
  intersections and mapped types. **`import { type X }`** inline (`consistent-type-imports`).
- **PostgREST results are untyped here**, so a query casts once: `unwrap(res) as unknown as RawX[]`,
  then maps through a typed `toX()`. Keep that one cast beside the select string it describes, so a
  reader can check one against the other. `.maybeSingle()` callers cast to `T | null` and handle the
  `null` — never to `T`.
- **Use the generated route types.** `npm run typecheck` runs `next typegen` first, which declares
  the global `PageProps<'/projects/[id]'>` and `LayoutProps<'/'>`. Type a page's props with them
  rather than writing `params` by hand.

## Before removing a `?`

Removing an optional moves the problem; it does not delete it. Find who relied on the absence
(`grep -rn "filter.archived" src`). If some path really has no value, the field was honest and the fix
is a union. An empty string satisfies `string`, so the build stays green while the behaviour changes.

## Verify

```bash
npm run typecheck
npm run lint
```

`tsc` passing is necessary, not sufficient: this skill guards against code that typechecks and lies.
Trace one real call through the path you changed.

## Related skills

- `add-server-action` — validation at the action boundary.
- `change-the-schema` — nullable columns are `T | null`, and value arrays mirror check constraints.
- `write-comments` — every cast and disable carries its reason.

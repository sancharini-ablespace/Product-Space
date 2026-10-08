---
name: verify-changes
description: >
  The verification ladder for this app, in the order that catches things: typecheck (with Next's
  route type generation), lint, build, then render what changed. One Next.js app, no test runner, so
  these steps are the whole safety net — and without a `.env` most pages cannot load data, which has
  to be said rather than glossed. Trigger when a code change is finished and before saying it works,
  before asking to commit, after a dependency or config change, and when a typecheck or build fails
  in a way that looks stale.
argument-hint: '[what changed]'
---

# Verify changes

## must

1. **Walk the ladder in order, and stop at the first failure.** Later rungs only add noise.

   ```bash
   npm run typecheck   # next typegen && tsc --noEmit
   npm run lint        # eslint . — must report 0 errors
   npm run build       # next build
   ```

   `npm run verify` runs the three in sequence and stops at the first failure.

2. **`npm run typecheck`, not bare `tsc`.** `next typegen` writes the global `PageProps` /
   `LayoutProps` route types into `.next/types`; plain `tsc --noEmit` on a fresh checkout or after a
   route change reports errors that are not real.
3. **Lint has two tiers.** `error` is the must tier — `no-explicit-any`, `no-empty-object-type`,
   `no-unused-expressions`, `rules-of-hooks`, `prettier/prettier`, and the layer rules
   (`@/components/ui/*` outside `hub/`, data access inside `hub/`, `../../`). Any error fails.
   `warn` is the should tier and does not fail — but **add no new warning to a file you touched**.
   The backlog is 84 warnings: 41 `no-non-null-assertion`, 31 `no-nested-ternary`, 9 `complexity`,
   3 `max-lines` (`src/lib/actions.ts`, `src/components/hub/NoteThread.tsx`,
   `src/components/feature/features-view.tsx`). Compare the count before and after.
4. **Report what you actually ran.** If the build was not run, or a screen was not rendered, say so.
   Never call a change verified on the strength of a typecheck.
5. **Ask before committing.** Show the diff and wait, even when everything is green.

## Rendering a UI change

`next build` prerenders and so executes module-level code, but it does not click anything. For a
visible change, run it:

```bash
AUTH_SECRET=dev-only-dummy npm run dev     # http://localhost:3000
```

What can and cannot render depends on the environment, and `.env*` is gitignored:

- **No `.env`** (no `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`): `/login` and `/setup` render with
  a dummy `AUTH_SECRET`, since a signed-out visitor triggers no database read. Every page under
  `src/app/(app)/` redirects to `/login`, and anything past sign-in throws from `db()`. A hub
  component can be checked by rendering it on `/login` temporarily — remove the probe before you
  finish.
- **With a `.env` pointing at a Supabase project**: sign in and exercise the screen. A mutation
  writes real rows — use a project you are allowed to write to, and say which.

State in the report which of these you did. "Typechecks, lints and builds; not rendered — no `.env`"
is a complete, honest report. "Works" is not, unless you saw it work.

## should

- `npm run lint:fix` applies the autofixable rules (including Prettier); `npm run lint` never
  rewrites. `npm run format:check` covers the files ESLint does not lint (CSS, JSON, `.mjs`).
- After a rule change, ask ESLint what it resolved: `npx eslint --print-config src/lib/actions.ts`.
  For a new rule, plant a violation, see it fail, delete the probe.
- After changing `globals.css`, check the class exists in the build output
  (`style-with-tailwind` → "Debugging a class that does nothing").
- For a schema change, the ladder proves only that the TypeScript agrees with itself. Whether the
  migration applies, and whether the select strings match the columns, needs a database — say if
  you did not have one.
- For a large mechanical diff, read only the lines that are *not* the mechanical change:
  `git diff -U0 | grep '^[+-]' | grep -v '<the expected pattern>'`.
- Check `git status` before reporting: a stray `lint:fix`, a `next dev` rewrite of `AGENTS.md`
  (it re-adds its block on every run) or a CLI that touched `package.json` should be called out.

## A failure that looks stale

- Type errors about `PageProps` or a route that no longer exists → `rm -rf .next` and re-run
  `npm run typecheck`.
- A resolution error that names an old version → `rm -f tsconfig.tsbuildinfo` (it is `incremental`).

## There are no tests

No test runner is configured: no `test` script, no spec files. That is why the order above matters
and why runtime behaviour has to be stated as unverified when it is.

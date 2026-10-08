---
name: upgrade-a-dependency
description: >
  Upgrade a dependency in this npm app without leaving a half-migrated tree: start from a green
  baseline, move locked version sets together, respect the versions held back on purpose, then walk
  the verification ladder after every bump. Trigger BEFORE changing any version in `package.json`,
  before `npm update` or `npm install <pkg>@<version>`, when asked to "update the packages" or take a
  security fix, when a deprecation warning appears, and when a bump has already broken the build and
  you need a way back.
argument-hint: '[the dependency, or "audit"]'
---

# Upgrade a dependency

One Next.js app, npm, one `package-lock.json`. The `dependency-updater` agent runs the whole pipeline;
this skill is the rulebook it and you work under.

## must

1. **Green baseline first.** `git status` clean, `npm run verify` green. Without it the first failure
   is unattributable.
2. **One dependency, or one locked set, per change.** A change that moves Next and Supabase together
   cannot be reverted usefully.
3. **Read the release notes for every version crossed.** Do not migrate from memory of the API. For
   Next, also read `node_modules/next/dist/docs/` after the install — `AGENTS.md` says why: this
   version differs from most training data.
4. **Move a locked set together, in the same change:**
   - `next` **and** `@next/eslint-plugin-next`. `next` is pinned exactly and the plugin by caret, so
     `npm update` alone moves the plugin (16.4.0 is waiting) and splits them. Keep them on the same
     version.
   - `react` **and** `react-dom`, both exact, same version. `@types/react` / `@types/react-dom` are
     `^19` and currently resolve to 19.3.0 types over a 19.2.8 runtime; check that before trusting a
     type that only exists in the newer release.
   - `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-config-prettier`,
     `eslint-plugin-prettier`.
   - `tailwindcss` **and** `@tailwindcss/postcss`; `tailwind-merge` follows the Tailwind major, and
     its `extendTailwindMerge` config in `src/lib/utils.ts` must still match the scales in
     `globals.css`.
   - `radix-ui`, `cmdk` and `lucide-react` are what the shadcn primitives in `src/components/ui/` are
     built on; after a major, re-check those files rather than re-running `shadcn add` over them.
5. **Respect what is held back** (table below). Re-check the blocker; never bump a held package to
   quiet `npm outdated`.
6. **Never hand-edit `package-lock.json`.** Roll back with
   `git checkout -- package.json package-lock.json && npm ci`. Keep the manifest's range style: an
   exact pin stays exact (`npm install --save-exact next@<v>`), a caret stays a caret.
7. **Do not leave it half-done.** Either it lands green, or it is reverted and the blocker recorded
   in the held table.

## Held back on purpose

| Package        | Held at                   | Why                                                                                       |
| -------------- | ------------------------- | ----------------------------------------------------------------------------------------- |
| `typescript`   | 6.0.x                     | `typescript-eslint` 8.x peers `typescript >=4.8.4 <6.1.0`. TS 7 (npm `latest`) breaks lint. The manifest says `^6.0.3`, which would admit 6.1 the day it ships; `~6.0.3` says what is meant |
| `@types/node`  | 24.x                      | Matches the Node 24 runtime (`engines: >=24.21.0`). Types ahead of the runtime describe APIs that are not there; 26.x is `latest` |
| `next-auth`    | 5.0.0-beta.x              | Auth.js v5 is still beta. npm's `latest` tag is **4.24** — `npm install next-auth@latest` is a downgrade to an incompatible API. Bump by exact beta number and read its changelog |
| `next`/`react` | exact pins                | Moved deliberately with their sets above, never by `npm update`                           |

`eslint-config-next` is deliberately not used: it pulls in `eslint-plugin-react`, which caps ESLint at
9. Next's rules come from `@next/eslint-plugin-next` directly.

## The ladder, after every bump

Stop at the first failure.

```bash
npm install                                  # read the peer warnings; a new ERESOLVE is a stop
npm ls react react-dom next                  # exactly one version of each
npm run typecheck                            # next typegen && tsc --noEmit
npm run lint                                 # 0 errors; the warning count should not move
npm run build                                # bundler, config schema, prerendered module code
npm ci                                       # the lockfile and manifest agree
```

`skipLibCheck` is on, so a library's own type breakage stays invisible until your code touches it —
the build and a render (`verify-changes`) find the rest. Finish with a manual pass over a screen the
dependency drives: `/login` for `next-auth`, a drawer or dialog for `radix-ui`, ⌘K for `cmdk`, any
page with data for `@supabase/supabase-js` (needs a `.env`; say so if you had none).

A Prettier or ESLint bump can change formatting or add rules: run `npm run lint:fix`, then read the
diff — a rule that newly fires belongs in the right tier in `eslint.config.mjs`, not in a disable.

## Reading a failure

| What you see                                   | Usually                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| Type error in your code                        | The real migration work. Fix the call site; do not cast it away.       |
| `ERESOLVE` / peer conflict on install          | A locked set moved out of step, or a package peers a major you lack.   |
| A lint rule "does not exist"                   | Renamed in the plugin. Check its changelog before deleting the rule.   |
| Lint crashes in the parser                     | TypeScript outside `typescript-eslint`'s peer range.                   |
| A Tailwind class silently stops working        | Config or theme semantics changed; see `style-with-tailwind`.          |
| `PageProps` / route type errors after a Next bump | `rm -rf .next` and `npm run typecheck` again.                       |
| Sign-in loops or the session is empty          | An Auth.js beta changed callbacks or cookie names; read its notes.     |

## Codemods and renames

Rename by import and let `tsc` list the call sites; never a blind find-and-replace over the source,
which also rewrites user-visible strings. Next ships codemods (`npx @next/codemod@latest`); run one,
then read every hunk it produced.

## Node itself

Out of scope unless asked. If asked: the latest **LTS**, `engines` in `package.json` raised to match,
`@types/node` to the same major, then `rm -rf node_modules && npm ci` so native modules rebuild, then
the whole ladder.

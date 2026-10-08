@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Skills

`.claude/skills/` holds the conventions as skills, so the rule arrives with the task. Each is split
into **must** (a violation is a defect) and **should** (convention), mirroring the two ESLint tiers.

| Skill                  | Use it before                                                         |
| ---------------------- | --------------------------------------------------------------------- |
| `use-ui-component`     | writing any UI — decides what already exists in `hub/`                |
| `create-hub-component` | adding a shadcn primitive or a new `src/components/hub/` component    |
| `style-with-tailwind`  | writing a className, picking a colour, or editing `globals.css`       |
| `add-server-action`    | any read in `queries.ts`, write in `actions.ts`, or new page loader   |
| `change-the-schema`    | any table, column, check constraint or enum change                    |
| `type-strictly`        | writing `?`, a parameter default, `!`, `as`, or a boolean parameter   |
| `write-comments`       | writing comments, docblocks, or a suppression that needs a reason     |
| `upgrade-a-dependency` | bumping any version                                                   |
| `verify-changes`       | reporting a change complete, and before every commit                  |

## Commands

```bash
npm run dev        # next dev on http://localhost:3000
npm run typecheck  # next typegen && tsc --noEmit (typegen emits the global PageProps/LayoutProps)
npm run lint       # eslint . — must exit with 0 errors
npm run lint:fix   # lint never rewrites files; this does
npm run format     # prettier --write .
npm run build      # next build
npm run verify     # typecheck → lint → build, the ladder to run before calling a change done
```

There is no test runner configured. Next.js 16 (App Router, Turbopack, React 19) is a newer version than most training data; read `node_modules/next/dist/docs/` before relying on a Next API, as `AGENTS.md` says.

Required env vars (read in `src/lib/supabase.ts` and `src/lib/accounts.ts`; `.env*` is gitignored):
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SECRET` (Auth.js), `AUTH_TRUST_HOST=true` when deployed anywhere but Vercel (Auth.js trusts the host only on Vercel), optional `ALLOWED_EMAIL_DOMAIN` (default `ablespace.io`) and `ADMIN_EMAILS` (comma-separated emails that may sign up without an invite).

Database schema lives in `supabase/migrations/20261008000000_product_hub.sql`; apply it with the Supabase CLI or SQL editor. It also creates the private `attachments` storage bucket.

## What this is

"Product Hub": an internal PM tool for AbleSpace. Work is organised **Project → Version → Feature** (features may have no project). Around it: customer **POCs**, a **Research** list, a personal **Watchlist** / **My work**, and **Profile/Team** (invites). The app is a faithful port of the HTML prototype in `design/` (see below).

## Architecture

### Data access: server only, service-role key, no RLS policies

Only the Next.js server talks to Supabase, via `db()` in `src/lib/supabase.ts` using the service-role key. RLS is enabled on every table with **no policies**, so nothing is reachable from the browser. Consequently every data entry point must verify the session first:

- **Session** (`src/lib/session.ts`): `requireUser()` redirects to `/login` if signed out *or* the user row is gone. `requireUserWith(load)` starts `load(userId)` concurrently with the account check; use it in pages so data loads in parallel with auth. All of these are `cache()`d per request.
- **Auth** (`src/auth.ts`): Auth.js v5 with a single Credentials provider, JWT sessions, `token.uid → session.user.id`. Passwords are bcrypt hashes in `users.password_hash`; a `users` row with no hash is a pending invite. `src/proxy.ts` (Next 16's replacement for middleware) redirects signed-out visitors for every route except `/login`, `/setup`, and `/api/auth`. The JWT carries `pwdAt` (`users.password_changed_at` at sign-in) and `getCurrentUser` rejects a session whose `pwdAt` no longer matches the row, so changing, resetting or setting up a password ends every older session; `changePassword` re-issues the caller's own. `next-auth` is a beta and pinned exactly.
- **Queries** (`src/lib/queries.ts`): all reads. Uses PostgREST embedded selects (`version:versions(...)`, `owners:feature_owners(created_at, user:users(...))`) and then flattens link tables with `byLinkOrder`. `unwrap()` throws on Supabase errors. Reusable select fragments (`MEMBER`, `FEATURE`, `NOTE`) are at the top.
- **Actions** (`src/lib/actions.ts`, `"use server"`): all writes, plus a few reads the client calls on demand (drawer loaders, search index). Every action goes through `run()`, which calls `requireUser()`, catches `ValidationError` into `{ error }`, and calls `revalidatePath("/", "layout")` on success. Unexpected DB errors throw. Inputs are checked with the helpers in `src/lib/validate.ts` (`uuid`, `text`, `oneOf`, `optDate`, ...). Most mutations also write an `activity` row via `log()`.
- **Auth actions** (`src/lib/auth-actions.ts`): sign in, sign out, and first-time `/setup` for invited emails. Email domain is enforced by `isAllowedEmail`.
- **View loaders** (`src/lib/feature-view.ts`, `poc-view.ts`, `research-view.ts`, `note-view.ts`): server-only functions that turn query rows into the exact props the drawer/NoteThread components expect (relative times, avatar colours, signed attachment URLs). `threadNotes()` signs every attachment path across several note lists in one call.
- **Types** (`src/lib/types.ts`): row types mirroring the migration plus the status/priority enums as `as const` arrays, which both validation and selects use.

### Pages and views

Routes under `src/app/(app)/` are thin server components: `requireUserWith(() => Promise.all([...queries]))`, reshape, then render a `"use client"` view from `src/components/`. The `(app)` layout renders `AppShell` and mounts every drawer host once, so drawers open on any page.

**Drawers live in the URL** (`src/components/drawer-url.ts`): `?feature=`, `?poc=`, `?research=`, `?new=project|version|feature|poc[&parent=]`. Opening one calls `history.pushState` (no server round trip), so the page beneath keeps filters, selection and scroll; only one drawer is open at a time. Drawer hosts read `useSearchParams()` and fetch their data through a server action (`getFeatureDrawer`, etc.), so they are not refreshed by `revalidatePath` and must `reload()` themselves after mutations.

Client views keep UI state locally (`useOptimistic`, `useTransition`) and call server actions directly. Tables share `useTable()` (`src/components/use-table.ts`): click-to-cycle sorting (asc → desc → reset, `descFirst` columns reverse that) and checkbox selection with an indeterminate select-all. The project page remounts `ProjectView` via `key` when the URL asks for a different tab/version.

### Design system and styling

`design/` is the source of truth: `design/README.md` is the handoff spec (screens, interactions, delete-impact rules, data model), `design/PM Dashboard v3.dc.html` is the full working prototype, and `design/*.dc.html` are the components. Code comments reference prototype function names (`isFeatDrawer`, `renderVals`, `mkT`) so you can find the behaviour being ported. `design/SKILL.md` makes this a user-invocable skill.

- **Three layers, lint-enforced.** `src/components/ui/` holds shadcn primitives (`components.json`, new-york, `radix-ui`), restyled to the tokens. `src/components/hub/` is the 1:1 React port of the design components (Button, Select, StatusSelect, PeopleButton, NoteThread, SelectionBar, ConfirmDialog, ...) and the only layer allowed to import `ui/`; `hub/Button` wraps `ui/button` and `hub/ConfirmDialog` wraps `ui/dialog`. Everything else is feature code and builds from `hub/`. `no-restricted-imports` fails lint on a `@/components/ui/*` import outside `hub/`, and on `hub/` importing `@/lib/actions|queries|session|supabase`. Use `/create-hub-component` to add one.
- **After `npx shadcn@latest add`:** point `cn` at `@/lib/utils` if the CLI wrote `from "cn"`, replace `bg-muted` with `bg-surface-muted` (`muted` is a text colour here), use `bg-scrim` for overlays, keep dialogs at `z-60` and floating content at `z-80`, then run Prettier. `tw-animate-css` is deliberately not installed, so shadcn's enter/exit animations stay inert, per the motion rule below. `cn()` uses tailwind-merge extended with the custom text and radius scales; add a new scale there too.
- `src/lib/hub.ts` and `src/lib/derive.ts` port the prototype's display helpers (avatar hashing, tone maps, date formatting, progress, current version).
- Styling is **Tailwind v4 mapped onto the design tokens** in `src/app/globals.css`: the `:root` block is `design/tokens.css` verbatim, and `@theme inline` exposes them as utilities (`bg-surface`, `text-faint`, `border-border-strong`, `rounded-md`, `text-base`, `shadow-pop`, `bg-tone-blue-bg`). Root font size is 13px and `--spacing` is pinned to 4px. Use the token utilities or `var(--…)`, never raw hex. Default Tailwind `text-*` and `rounded-*` scales are disabled.
- Visual rules from `design/design-system-readme.md`: sentence case, no emoji, no icon fonts (inline stroke SVGs in `hub/icons.tsx`), colour only for meaning via `--tone-*`, primary action is ink-black, transitions 120–150ms and no other motion.

### Notes and attachments

Notes attach to a project, version, feature, or research item (`NoteParent`). `LiveNoteThread` wraps the `NoteThread` component with optimistic adds and uploads files through the `addNote` server action as `FormData`. Files are capped at 5 MB each and 25 MB per note; `next.config.ts` raises the server action body limit to 26 MB to match. Attachments are served through short-lived signed URLs from the private bucket.

## Code style

- Prettier: 120 columns, single quotes, trailing commas, LF (`.prettierrc.json`). `design/`, Markdown and migrations are not formatted.
- **ESLint 10, flat config** (`eslint.config.mjs`), with Next's rules taken from `@next/eslint-plugin-next` directly; `eslint-config-next` would bring `eslint-plugin-react`, which caps at ESLint 9.
- **must (`error`)**: `no-explicit-any` (use `unknown` and narrow), Prettier, rules-of-hooks, and the import layering above. Also no `../../` climbing; use `@/…`.
- **should (`warn`)**: type-only imports inline, `interface` over `type` for object shapes, no `!`, no unused bindings, no `console.log`, `eqeqeq`, no nested ternary, no param reassign, and the ceilings `max-params` 4, `max-depth` 4, `complexity` 15, `max-nested-callbacks` 3, `max-lines` 500. The backlog when the tier landed was 84 warnings (41 `!`, 31 nested ternaries, 9 complexity, 3 max-lines); fix the ones in a file you touch.
- **TypeScript 6.0.x strict.** It stays on 6.0 because typescript-eslint 8 peers `typescript <6.1`. `@types/node` stays on 24 to match the Node 24 runtime (`engines`).

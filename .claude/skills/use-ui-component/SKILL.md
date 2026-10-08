---
name: use-ui-component
description: >
  The required first step before writing any UI. Decides, in order, whether a component in
  `src/components/hub/` already does it, whether a shadcn primitive in `src/components/ui/` should be
  wrapped in a new hub component, or whether it is genuinely one screen's markup. Feature code never
  imports `@/components/ui/*`. Trigger BEFORE writing or editing any component, page or view that
  renders UI: (1) a button, select, dialog, menu, popover, drawer, tooltip, checkbox, tabs, pill or
  avatar anywhere outside `src/components/hub/`; (2) you are about to write raw `<button`, `<select`,
  `<dialog` or a `fixed inset-0` overlay; (3) you are about to import from `@/components/ui/*`;
  (4) you catch yourself copying markup between two views.
argument-hint: '[what you are building]'
---

# Use a UI component

`design/` is the source of truth. Every `design/*.dc.html` component has a 1:1 React port in
`src/components/hub/`, and the screens in `design/PM Dashboard v3.dc.html` are built from them. A
screen built from the hub layer looks like the prototype by construction; one built from raw markup
drifts from it.

Three layers, checked by ESLint (`no-restricted-imports`, `error`):

| Layer                   | What it is                                               | Who may import it            |
| ----------------------- | -------------------------------------------------------- | ---------------------------- |
| `src/components/ui/`    | shadcn primitives (new-york, `radix-ui`), restyled       | `hub/` only                  |
| `src/components/hub/`   | the design system: one file per `design/*.dc.html`       | everything                   |
| everything else         | feature views, drawers, pages under `src/app/`           | —                            |

## The decision, in order

Stop at the first match.

1. **A hub component does it** → `import { X } from '@/components/hub/X'`. One file per component,
   no barrel.
2. **A shadcn primitive does it, but no hub component wraps it** → run `/create-hub-component`,
   then use the new hub component. Primitives installed today: `alert-dialog`, `button`,
   `checkbox`, `command`, `dialog`, `dropdown-menu`, `popover`, `sheet`, `tooltip`. Only `button`
   and `dialog` are wrapped so far.
3. **No primitive either** → `/create-hub-component` covers adding one with `npx shadcn@latest add`.
4. **It is one screen's layout** → write it in that feature's folder (`src/components/<feature>/`),
   composed from hub components. A table grid, a page header or a drawer body is feature markup;
   a control a second screen would want is hub work.

## Hub inventory

| Component       | Purpose                                                                      |
| --------------- | ---------------------------------------------------------------------------- |
| `AddChip`       | Dashed "+ Add owner/POC/watcher" pill                                        |
| `Avatar`        | Initials on a hashed colour; round for people, `square` for customers        |
| `AvatarStack`   | Overlapping avatars with a `+N` overflow (`people`, `max`, `align`, `empty`) |
| `Button`        | Every action: `variant` primary/secondary/ghost/danger, `size` md/sm         |
| `Confidence`    | Ship-confidence %, toned by `high`/`low` thresholds                          |
| `ConfirmDialog` | Destructive confirm with an impact list and optional checkbox (`ui/dialog`)  |
| `EmptyState`    | Icon, title, body and action for an empty table or tab                       |
| `MoreButton`    | Row ⋯ menu trigger                                                           |
| `NoteThread`    | Notes composer + list: markdown-lite, lists, attachments, previews           |
| `PeopleButton`  | Avatar stack that opens the people/POC picker                                |
| `PersonSelect`  | Single person, avatar-only trigger over a native select (unused today)       |
| `PrioritySelect`| Inline priority edit: toned text + chevron                                   |
| `ProgressBar`   | Work completed, neutral                                                      |
| `Select`        | Every dropdown — forms, filters, "+ Link …" pickers (native `<select>`)      |
| `SelectionBar`  | Floating bulk-action bar with an inline "are you sure"                       |
| `StatusPill`    | Read-only status, toned by value                                             |
| `StatusSelect`  | Inline status edit for a feature, version or project                         |
| `Tabs`          | Page tabs with counts                                                        |
| `icons.tsx`     | Inline stroke SVGs (`ChevronSm`, `SelectChevron`) — the only icon source     |

Feature-level pieces that are shared but not design components live beside the views:
`sort-header.tsx` and `use-table.ts` (click-to-cycle sort, select-all), `popovers.tsx`,
`new-button.tsx`, `live-note-thread.tsx` (wires `NoteThread` to the `addNote` action).

```bash
ls src/components/hub src/components/ui     # check, rather than guess
```

## must

1. **Never import `@/components/ui/*` outside `src/components/hub/`.** It is an ESLint error with a
   message naming the fix. A primitive in a feature bypasses the design's prop contract and its
   styles.
2. **Never hand-roll a control a hub component covers.** No bare `<button>` styled to look like
   `Button`, no second status pill, no copied select chevron.
3. **A hub component renders what it is given.** It may not import `@/lib/actions`,
   `@/lib/queries`, `@/lib/session`, `@/lib/supabase` or `@/app/*` (ESLint error). Data and
   callbacks arrive as props, so the same component renders in a page, a drawer and the design
   showcase.
4. **No `../../` imports anywhere.** Use `@/components/…` or `@/lib/…` (ESLint error).

## should

- Match the prototype before inventing. Search `design/PM Dashboard v3.dc.html` for the behaviour
  (the prototype's function names — `isFeatDrawer`, `tPoc`, `mnOpen` — are cited in comments at the
  top of each view) and port what it does.
- Keep feature folders by domain: `feature/`, `poc/`, `project/`, `research/`. A drawer, its
  delete dialog and its `url.ts` live together.

## The backlog: hand-rolled overlays

These predate the primitives. Each re-implements Escape handling, outside-click and positioning that
Radix provides. Move one onto its primitive (through a hub component) when you are already changing
it, not as a drive-by:

| Today                                        | Target primitive              |
| -------------------------------------------- | ----------------------------- |
| `src/components/popovers.tsx` (people picker, date picker) | `ui/popover`    |
| `src/components/feature/row-menu.tsx`        | `ui/dropdown-menu`            |
| `src/components/search-overlay.tsx` (⌘K)     | `ui/command`                  |
| feature / POC / research / create drawers    | `ui/sheet`                    |

Keep the design's look when you move one: 540px drawers with `shadow-drawer`, 252–260px popovers
with `shadow-pop`, and the Escape order in `design/README.md` — the topmost popover first, then the
drawer.

## Related skills

- `create-hub-component` — wrapping a primitive, adding one with the shadcn CLI.
- `style-with-tailwind` — tokens, the replaced scales, z-index layers, motion.
- `verify-changes` — what to run, and how to render a UI change.

---
name: create-hub-component
description: >
  Add a component to the design-system layer in `src/components/hub/`, usually by wrapping a shadcn
  primitive from `src/components/ui/` — including adding that primitive with the shadcn CLI and the
  edits the CLI output always needs here. Trigger BEFORE creating any file in `src/components/hub/`,
  before running `npx shadcn@latest add`, when `use-ui-component` reaches step 2 or 3, and when ESLint
  reports an `@/components/ui/*` import in feature code — that means a hub wrapper is missing.
argument-hint: '[component or primitive name]'
---

# Create a hub component

Reach this through `use-ui-component`, which checks first that nothing in `hub/` already covers the
need. `hub/` is the 1:1 port of `design/*.dc.html`; a primitive from `ui/` is how a hub component
gets behaviour (focus trap, Escape, positioning, keyboard nav), never how it gets its look.

## Steps

1. **Read the design.** Open `design/<Name>.dc.html` if it exists: the template, the
   `renderVals()` logic, and the `data-props` JSON on the `<script>` tag — the props contract.
   `design/README.md` § "Component inventory" lists the props in plain form.
2. **Add the primitive** if `ls src/components/ui` does not have it (next section).
3. **Write `src/components/hub/<Name>.tsx`** — PascalCase file, one named export.
4. **Use it** from the feature, and move any hand-rolled version onto it.
5. **Verify** with `verify-changes`, and render it.

## Adding a shadcn primitive

`components.json` at the root is configured (new-york, `rsc: true`, lucide, aliases `@/components/ui`,
`@/lib/utils`). Primitives import from the unified `radix-ui` package.

```bash
npx shadcn@latest add <name>
git status && git diff package.json src/app/globals.css
```

The generated file is never right as it lands. Apply every item:

| Check                                   | Fix                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------- |
| `import { cn } from "cn"`               | `import { cn } from '@/lib/utils'`, then `npm uninstall cn` if the CLI added it       |
| `bg-muted`                              | `bg-surface-muted`. Here `muted` is a grey **text** colour, so `bg-muted` paints grey ink as a fill |
| `bg-black/50`, `bg-black/80` overlays   | `bg-scrim`                                                                            |
| overlay / dialog / sheet `z-50`         | `z-60` — above drawers (40/41) and the mobile nav (54/55)                              |
| popover / dropdown / tooltip content    | `z-80` — above dialogs, so a menu inside a dialog is not hidden                       |
| CLI edited `globals.css` or added `tw-animate-css` | revert it. Animation is deliberately not installed                         |
| double quotes, long lines               | `npx prettier --write src/components/ui/<name>.tsx`                                   |

`text-muted-foreground`, `bg-popover`, `bg-background`, `border-input`, `ring-ring`, `bg-accent` and
`bg-destructive` already work: `globals.css` maps those shadcn names onto the tokens (see
`style-with-tailwind`). Leave them.

The `data-[state=open]:animate-in`, `fade-in-0`, `zoom-in-95` classes are inert because
`tw-animate-css` is not installed. That is intended — the design allows only 120–150ms transitions
— so leave them rather than churn the file. Lucide icons stay inside `ui/`; nothing else uses them.

`ui/` is exempt from the layer and type-definition lint rules so it stays diffable against upstream,
but `prettier/prettier` still applies, hence the format step.

When a variant name has to change for the design, restyle the variant and keep shadcn's name, as
`ui/button.tsx` does: other primitives (`dialog`, `alert-dialog`) render `Button` with
`variant="outline"` and would break on a rename.

## The hub component

```tsx
'use client'; // only if it uses state, effects or event handlers that need the client

// design/Toggle.dc.html — one line saying what it is, as every hub file starts.
import { Switch } from '@/components/ui/switch';

export function Toggle({
  checked = false,
  label = 'Notify me',
  size = 'md',
  onChange,
}: {
  checked?: boolean;
  label?: string;
  size?: 'md' | 'sm';
  onChange?: (on: boolean) => void;
}) {
  return (/* the design's markup, with the primitive supplying behaviour */);
}
```

Models to read first: `hub/Button.tsx` (maps the design's `primary/secondary/ghost/danger` onto the
primitive's `default/outline/ghost/destructive` with a `const` lookup) and `hub/ConfirmDialog.tsx`
(`ui/dialog` supplies Escape, scrim click, focus trap and focus return; the hub file supplies the
design's layout).

## must

1. **The prop names, values and defaults mirror `data-props`.** `variant: 'primary' | …`, not
   shadcn's names; `options: { v, l }[]` because the design says so. Existing hub components default
   to the design's preview values (`SelectionBar`'s `label = '3 selected'`) so they render
   standalone. Callers are written against the design's API, not the primitive's.
2. **Design token classes only** — `bg-surface`, `text-muted`, `border-border-strong`, `rounded-md`,
   `text-base`, `shadow-pop`. No hex, no `rgba()`. A value the design uses that has no token is a
   missing token: add it to `globals.css` (`style-with-tailwind`). `ConfirmDialog` and
   `SelectionBar` still carry arbitrary `rgba()` shadows because the design's dialog shadow has no
   token yet; add one rather than copy them.
3. **No data access.** No `@/lib/actions|queries|session|supabase`, no `@/app/*` (ESLint error).
   Data and callbacks come in as props.
4. **No icon library.** Icons are inline stroke SVGs in `hub/icons.tsx` (`currentColor`,
   1.3–1.6px stroke). Lucide stays inside `ui/`.
5. **Imports are `@/…` or `./Sibling`.** Never `../../`.

## should

- **Merge with `cn()` from `@/lib/utils`, caller last,** when a hub component passes classes
  through to a primitive: `cn('justify-start', className)`. Most hub components take no `className`
  at all — the design fixes their appearance — so only add one when a real caller needs layout
  control.
- A value computed from props at render time (a tone, a width from `maxWidth`) may go in
  `style={{}}` as `var(--…)`, as `StatusPill` and `Select` do. A static one belongs in a class.
- `'use client'` only when needed. `Button`, `StatusPill`, `SelectionBar` have none and render in
  server components too.
- Keep the design's quirks when they are behaviour, and say so in one line — `hub/Button` only sets
  `disabled` on a submit button, "as in the prototype".

## Argument

`/create-hub-component <name>` — add or wrap `<name>` (e.g. `/create-hub-component popover`).

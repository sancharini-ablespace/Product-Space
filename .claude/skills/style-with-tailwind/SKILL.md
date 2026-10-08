---
name: style-with-tailwind
description: >
  How to style anything here: Tailwind 4 mapped onto the design tokens in `src/app/globals.css`, the
  replaced text and radius scales, the 13px root and 4px spacing unit, tone colours only for meaning,
  icons, motion, the shadcn name bridge and its one collision, and the z-index layers. Trigger BEFORE
  writing or changing any `className`, picking a colour, adding a `style={{}}`, editing
  `globals.css` or `src/lib/utils.ts`, adding an icon, adding a transition or animation, setting a
  `z-*`, and when a class you expect to work has no visible effect.
argument-hint: '[what you are styling]'
---

# Style with Tailwind

Tailwind 4, configured entirely in CSS — there is no `tailwind.config`. `src/app/globals.css` holds
three things: the `:root` block (copied from `design/tokens.css`), base element styles in
`@layer base`, and `@theme inline`, which turns each token into utilities. `design/README.md` and
`design/design-system-readme.md` are the rules this file enforces.

## must

1. **Colour comes from a token utility or `var(--…)`. Never a hex, `rgb()` or a Tailwind palette
   shade.** `bg-surface`, `text-faint`, `border-border-strong`, `bg-tone-blue-bg`. Tailwind's
   palette (`bg-gray-100`, `text-red-600`) is still generated, so nothing stops you — which is why
   this is a rule. A value the design uses with no token is a missing token: add it (below).
   About 26 hex literals and a few `rgba()` shadows/scrims remain in feature views (`#f6f6f3`,
   `#d6d4cf`, `#cfcdc8`, `#ebeae6` …) — prototype values that never got a token. Do not copy them;
   tokenise one when you touch it.
2. **Colour only for meaning.** `--tone-*` (gray, blue, green, amber, red; `-bg`, `-fg`, `-dot`) is
   for status, confidence, priority and alerts. Chrome is neutral. The primary action is ink
   (`bg-primary` = `--ink`), not a brand colour. Map a value to a tone through `src/lib/hub.ts`
   (`ST_TONE`, `PRI_TONE`, `ACT_TONE`, `confTone`, `T`), not with a new local map.
3. **The text and radius scales are the design's, not Tailwind's.** `@theme` resets both
   (`--text-*: initial`, `--radius-*: initial`), so only these exist:
   - text: `xs` 11.5 · `sm` 12 · `md` 12.5 · `base` 13 · `lg` 13.5 · `xl` 15 · `h2` 19 · `h1` 20 ·
     `display` 22 (px)
   - radius: `xs` 4 · `sm` 5 · `md` 6 · `lg` 8 · `xl` 10 · `pill` 999 (px), plus `rounded-full`
   `text-2xl`, `rounded-2xl` or `rounded-3xl` compile to nothing.
4. **Adding a token means four edits:** the variable in `:root`, its `--color-*` / `--text-*` /
   `--radius-*` / `--shadow-*` line in `@theme inline`, `design/tokens.css` if the design should
   know it, and — for a new text, radius or shadow **name** — the matching list in `cn()`'s
   `extendTailwindMerge` in `src/lib/utils.ts`. Without that last edit `cn('text-md', 'text-ink')`
   drops one class, because tailwind-merge reads an unknown `text-*` as a colour.
5. **No emoji, no icon fonts, no icon library outside `ui/`.** Icons are inline stroke SVGs with
   `currentColor` at a 1.3–1.6px stroke; reusable ones go in `src/components/hub/icons.tsx`. Lucide
   is a dependency only because the shadcn primitives in `src/components/ui/` use it.
6. **Motion is 120–150ms colour, border or transform transitions, and nothing else.**
   `transition-colors duration-150`. No keyframes, no slide-ins, no spring. `tw-animate-css` is
   deliberately not installed, so shadcn's `animate-in`/`fade-in-0` classes are inert — leave them.
   The mobile nav in `app-shell.tsx` still uses `duration-200`; do not copy it.
7. **Merge classes with `cn()` from `@/lib/utils`, caller's `className` last.**

## The scales you are on

- **The root font size is 13px**, and `--spacing` is pinned to `4px`, so `p-3` is 12px and `gap-2.5`
  is 10px exactly — independent of the root. Arbitrary pixel values are normal for geometry the
  prototype specifies (`w-[min(540px,100vw)]`, `pt-[18px]`).
- **Prefer the token when a pixel size matches one.** Views carry ~190 `text-[Npx]` classes ported
  from the prototype. `text-[13px]` is `text-base`, `text-[20px]` is `text-h1`; sizes the scale lacks
  (14px, 16px) stay arbitrary until the design adds them.
- **Shadows:** `shadow-pop` (popovers) and `shadow-drawer` (drawers) are tokens. Tailwind's own
  `shadow-sm/md/lg` still exist and appear only inside `ui/`. The design's dialog shadow has no token.
- **Font:** Geist via `next/font` in `src/app/layout.tsx`; weights 400/500/600 only.
- **Content:** sentence case everywhere, short plain verbs ("Add note", "Unwatch"), tabular numbers.

## The shadcn name bridge

The end of `@theme inline` maps shadcn's vocabulary onto the tokens so `src/components/ui/*` renders
in the design's palette: `background`, `foreground`, `card`, `popover` (+ `-foreground`),
`primary-foreground`, `secondary`, `muted-foreground`, `accent`, `destructive`, `input`, `ring`.

**`muted` is the one collision.** In the design `--muted` is a grey **text** colour (`text-muted`).
In shadcn, `bg-muted` is a light fill. So `bg-muted` here paints a grey-ink rectangle; write
`bg-surface-muted`. `text-muted-foreground` is mapped and fine.

In feature and hub code, use the design names (`bg-surface`, `text-ink`, `bg-danger`), not the
bridge names. The bridge exists for the primitives.

## Z-index layers

| Layer                                         | z         | Where                                       |
| --------------------------------------------- | --------- | ------------------------------------------- |
| inline menus inside a table/composer          | 2, 30–31  | `features-view.tsx` filter builder          |
| mobile top bar                                | 20        | `app-shell.tsx`                             |
| `SelectionBar`                                | 35        | `hub/SelectionBar.tsx`                      |
| drawer scrim / drawer panel                   | 40 / 41   | feature, POC, research, create drawers      |
| mobile nav scrim / nav                        | 54 / 55   | `app-shell.tsx`                             |
| dialogs, sheets, ⌘K search                    | 60        | `ui/dialog`, `ui/alert-dialog`, `ui/sheet`  |
| legacy hand-rolled popovers                   | 70–73     | `popovers.tsx`, `feature/row-menu.tsx`      |
| primitive floating content                    | 80        | `ui/popover`, `ui/dropdown-menu`, `ui/tooltip` |
| attachment preview                            | 200       | `hub/NoteThread.tsx`                        |

`z-60` and `z-80` are Tailwind 4 bare-number utilities; the others are written `z-[41]`. A new
overlay picks the layer it belongs to rather than a bigger number.

## should

- `style={{}}` only for a value computed at render time — a tone from data, a width from a prop —
  and then as `var(--…)`. A static value belongs in a class.
- Hover is a light fill (`hover:bg-hover`) or a darker border (`hover:border-border-hover`).
- `dark:` is not used. Tailwind 4's default `dark:` follows the OS setting, and two shadcn
  primitives (`ui/checkbox`, `ui/dropdown-menu`) still carry `dark:` classes that will fire on a
  dark-mode OS. Do not add more.

## Debugging a class that does nothing

1. Is it a real token name? `grep -n -- '--color-<name>' src/app/globals.css`. `text-2xl`,
   `rounded-2xl` and `bg-muted`-as-a-fill are the usual suspects.
2. Is `cn()` dropping it? Check that the scale is in `extendTailwindMerge` in `src/lib/utils.ts`.
3. Is it `z-*` lower than the layer above it (table above)?
4. Check the built CSS after `npm run build`:
   `grep -rho '\.bg-surface-muted{[^}]*}' .next/static --include='*.css'`. No match means the class
   was never generated.

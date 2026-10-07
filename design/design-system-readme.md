# Product Hub — design system

Internal PM command center: Project → Version → Feature. Minimal, neutral, information-dense.

## How it's wired
- **tokens.css** — every color, tone, radius, type size and shadow as CSS variables. All screens and components link it and use `var(--…)`. Edit a token → everything updates.
- **Components** — each is its own Design Component file, imported by screens with `<dc-import name="…">`. Edit the file → every usage updates.
- **Design System.dc.html** — live showcase of tokens and components.
- **PM Dashboard v3.dc.html** — the app, built on the tokens + components. (v1/v2 are earlier, self-contained snapshots.)

## Components
| File | Purpose | Key props |
|---|---|---|
| Button | Actions | label, variant (primary/secondary/ghost/danger), size (md/sm), disabled, on-click |
| StatusPill | Read-only status | value, tone? |
| StatusSelect | Inline status edit | value, kind (feature/version/project), on-change |
| PrioritySelect | Inline priority edit | value, on-change |
| PersonSelect | Avatar + person picker | value, names, size, on-change |
| Avatar | Person initial | av {i,bg,fg}, size, ring, overlap |
| AvatarStack | Watchers | people[], max, align |
| ProgressBar | Work complete (neutral) | value, max-width |
| Confidence | Ship confidence (toned) | value, high, low, on-click? |
| Tabs | Page tabs | items [{label,count,active,go}] |
| NoteThread | Lightweight notes | thread {draft,onDraft,addNote,notes} |
| MoreButton | Row ⋯ menu trigger | active, on-click |
| Select | Every dropdown (forms, filters, link pickers) | value, options [{v,l}], size (md/sm), variant (default/active/dashed), muted, block, max-width, on-change |
| PeopleButton | Avatar stack that opens the people/POC picker | people[], max, label, label-color, size, edge, align, on-click |
| AddChip | Dashed "+ Add …" pill | label, on-click |
| SelectionBar | Floating bulk-action bar | label, actions [{label,onClick}], asking, ask-message, on-confirm, on-cancel, on-clear |
| ConfirmDialog | Destructive confirmation with impact list | title, message, impact [{text,sub,tone}], check-label, checked, on-check, confirm-label, on-confirm, on-cancel |

## Content
Sentence case everywhere. Short, plain verbs ("Add note", "Update", "Unwatch"). No emoji. Numbers are tabular.

## Visual foundations
- Neutral warm-gray ground (`--bg`), white surfaces, 1px subtle borders; no gradients, no illustrations.
- Color only for meaning: status, confidence, priority, alerts — via `--tone-*` (gray, blue, green, amber, red; shared OKLCH lightness/chroma).
- Primary action is ink-black, not a brand color.
- Radii 4–10px. Shadows only on floating layers (popovers, drawers).
- Hover = light fill (`--hover`) or darker border; no motion beyond 120–150ms transitions.
- Type: Geist 400/500/600; scale in `--fs-*`.

## Iconography
Minimal inline stroke glyphs (chevrons, ⋯, filter, trash) at 1.3–1.6px stroke, `currentColor`. No icon font. No emoji.

## Logo
None provided — the brand name is set in plain type ("Product Hub") with a simple initial mark.

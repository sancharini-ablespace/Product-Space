# Handoff: Product Hub — PM Dashboard

## Overview
Product Hub is an internal tool for product managers. Work is organised **Project → Version → Feature**. Features can also exist **without a project** ("No project"). Around that core sit customer **POCs** (people who requested features), a **Research** list of tools under evaluation, a personal **Watchlist** and **My work** view, and a **Profile/Team** area.

## About the design files
The files in this bundle are **design references built in HTML**: working prototypes that show the intended look and behaviour. They are **not production code to copy directly**. Recreate them in the target codebase using its existing framework, component library and patterns (React, Vue, etc.). If no codebase exists yet, React + TypeScript with CSS variables (or Tailwind mapped to `tokens.css`) is a good fit.

Each `*.dc.html` file is a self-contained "Design Component". It has a template (HTML with `{{ }}` holes), a logic class (`renderVals()` returns the template's data and handlers) and a props schema (the `data-props` JSON on its `<script>` tag). Open any file directly in a browser to see it running. `support.js` is the prototype runtime only; don't port it.

## Fidelity
**High-fidelity.** Colours, type, spacing, radii, states and interactions are final. Recreate them pixel-accurately with your codebase's primitives, and keep all values tied to the tokens in `tokens.css`.

## Component inventory (build these first)
Every file below is a reusable component. The props listed are the contract; full TS types are in each file's `data-props` JSON.

| Component | Purpose | Props |
|---|---|---|
| Button | All actions | `label`, `variant` primary/secondary/ghost/danger, `size` md(30px)/sm(26px), `disabled`, `title`, `onClick` |
| Select | Every dropdown | `value`, `options [{v,l}]`, `size` md(34px)/sm(30px), `variant` default/active (filter applied)/dashed ("+ Link …"), `muted`, `block` (full width), `maxWidth`, `onChange(e)` |
| StatusPill | Read-only status | `value`, `tone?` |
| StatusSelect | Inline status edit (toned pill + chevron) | `value`, `kind` feature/version/project, `onChange` |
| PrioritySelect | Inline priority (toned text + chevron) | `value` High/Medium/Low, `onChange` |
| PersonSelect | Single person, avatar-only trigger | `value`, `names`, `size`, `onChange` |
| PeopleButton | Avatar stack that opens the multi-select people/POC picker | `people[]`, `max`, `label`, `labelColor`, `size`, `edge` (negative-margin alignment), `align`, `onClick` |
| AddChip | Dashed "+ Add owner/POC/watcher" pill | `label`, `onClick` |
| Avatar / AvatarStack | Person initials (round) or customer (square) | `av {i,bg,fg}`, `size`, `square`; stack: `people`, `max`, `align`, `empty` |
| ProgressBar | Work completed (neutral) | `value` "%", `maxWidth` |
| Confidence | Ship confidence %, toned by thresholds | `value`, `high`, `low`, `onClick?` |
| Tabs | Page tabs with counts | `items [{label,count,active,go}]` |
| MoreButton | Row ⋯ menu trigger | `active`, `onClick` |
| NoteThread | Notes composer + list (markdown-lite, lists, attachments, previews) | `thread {draft,onDraft,addNote(atts),notes[]}` |
| SelectionBar | Floating bulk-action bar | `label`, `actions [{label,onClick}]`, `asking`, `askMessage`, `onConfirm`, `onCancel`, `onClear` |
| ConfirmDialog | Destructive confirm with an impact list | `title`, `message`, `impact [{text,sub?,tone? red/amber/gray}]`, `checkLabel?`, `checked`, `onCheck`, `confirmLabel`, `onConfirm`, `onCancel` |

`Design System.dc.html` shows every token and component live.

## Screens
All screens live in `PM Dashboard v3.dc.html`. The app shell is a left sidebar (240px, `--surface-sunken`, sticky). Under **900px** the sidebar becomes an off-canvas drawer behind a top menu bar with a scrim. Content max-width is 1320px, with padding `18px clamp(16px,4vw,32px) 40px`.

1. **Dashboard:** date + greeting, summary cards (my open features, due within 14 days, blocked), current versions with progress and confidence, and a recent activity feed.
2. **Projects:** table with columns checkbox / Project (name + description) / Current version / Progress / Confidence / Target / Owners (PeopleButton) / Status (StatusSelect). Rows open the project page.
3. **Project page:**
   - Breadcrumb, title and description.
   - Header actions: "Delete project" (ghost) and "+ Add version" (primary).
   - Meta row: Owners (multi-select), POCs, Status.
   - Tabs: Overview (current + next version cards), Versions (expandable version rows with their features), Features, Notes.
4. **Features:**
   - Search and a filter builder (rules of field / is-is not / value, saved filters).
   - Table: checkbox / Feature / Status / Project / Version / Owners / POCs / Priority / Watchers / Updated, plus a ⋯ menu (Watch, Archive, Delete).
   - Archived features have their own view.
5. **Watchlist:** features I watch. The bulk action is "Unwatch".
6. **My work:** features I own.
7. **POCs:** customer contacts (name, org, role, email), requested-feature chips and linked projects. The drawer edits details and links projects and features.
8. **Research:** tools under evaluation (status To research / Researching / Reviewed, linked projects, notes).
9. **Profile:** profile, password, notifications, team invite.

**Drawers** slide in on the right (`min(540px,100vw)`, `--shadow-drawer`, scrim `--scrim`). There are drawers for feature, POC, research and create (project/version/feature/POC).

**The feature drawer:**
- Header: a breadcrumb (Project → Version), or a Select if the feature has no project, plus Delete, Watch and ✕.
- Fields: Status, Priority, Owners, POCs, Watchers, Stakeholders.
- Then notes and activity.

## Interactions & behaviour
- **Tables:**
  - The row checkbox selects that row. The header checkbox selects every row matching the current filters (with an indeterminate state).
  - Sorting is click-to-cycle: asc → desc → reset. Watchers and Updated sort descending first.
  - Selected rows use `--selected`.
- **SelectionBar** appears while one or more rows are selected. It floats 24px from the bottom, centred, and wraps on mobile. Bulk actions:
  - Features: Archive, Delete
  - Projects: Delete
  - POCs: Delete
  - Research: Delete (inline confirm)
  - Watchlist: Unwatch
- **Delete (projects, features, POCs)** always opens ConfirmDialog. Its impact list is computed from live data:
  - **Feature:** versions whose progress will recalculate, owners losing it from My work, watchers, POCs unlinked (the POCs stay), notes deleted.
  - **Project:** versions deleted; features **kept and moved to "No project"** by default, with a "Also delete its N features" checkbox that switches the impact rows; research and POC links removed; notes deleted; activity removed from the feed.
  - **POC:** features and projects it is removed from (those stay).
  - Esc or clicking the scrim cancels. Deleting the project you're viewing navigates to Projects.
- **Project is optional on features.** The create form defaults to "No project" unless it's opened from inside a project. Unassigned features show "No project" / "—".
- **Multiple owners** on projects and features use PeopleButton → a picker popover (search, checklist, 256px wide, flips above when there isn't room below).
- **Notes (NoteThread):**
  - Toolbar: Bold (⌘B), Italic (⌘I), Strikethrough, a list menu (Bulleted ⌘⇧8, Numbered ⌘⇧7, Checklist ⌘⇧9) and Attach.
  - Enter continues a list; Enter on an empty item exits it. ⌘Enter submits.
  - Storage is markdown-lite: `**b**`, `_i_`, `~~s~~`, `- `, `1. `, `- [ ] `/`- [x] `.
  - Attachments show as chips and open in a preview modal.
- **Shortcuts:** ⌘K opens global search. Esc closes the topmost popover, then the drawer.
- **Hover:** a light fill (`--hover`) or a stronger border (`--border-hover`). Transitions are 120–150ms. There is no other motion.
- **Validation:** the create form needs a name, and shows an inline error otherwise.

## State & data
The prototype keeps everything in one store, persisted to `localStorage`. In production, replace it with your API.
```
projects:  {id,name,desc,owners[],pocs[customerId],status: Planned|Active|Completed,notes[]}
versions:  {id,p:projectId,num,name,desc,status: Planned|In Progress|Completed,target:ISO date,conf:0-100,confHistory[],notes[]}
features:  {id,v:versionId|'' (no project),name,desc,status: Planned|In Progress|Blocked|Completed,priority: High|Medium|Low,
            owners[],pocs[customerId],stake,watchers[],notes[],archived?,created,updated}
customers: {id,name,org,role,email}            // POCs
research:  {id,name,url,cat,status,projects[],notes[]}
activity:  {id,ts,who,type,text,p?,f?}
notes:     {id,text,atts[{name,size,ext,url,type}],author,ts}
```
UI state includes: page, pid, tab, drawer {type,id}, filters / rules / saved filters, sort per table, selection per table, picker popover (pk), row menu, delete confirmation (`delAsk {kind,ids,keepF}`), and narrow/navOpen.

Every mutation writes an activity entry (status change, owner added, POC linked, archived, deleted, etc.).

## Design tokens
All tokens are in `tokens.css`. The key values:
- **Neutrals:** bg `#f7f7f5`, surface `#ffffff`, surface-sunken `#fbfbfa`, hover `#efeee9`, selected `#ecebe7`, border `#e6e5e1`, border-strong `#e0dfdb`, border-subtle `#f1f0ec`, border-hover `#b9b7b1`.
- **Ink:** ink `#1c1b1a`, ink-2 `#3a3935`, ink-3 `#55534e`, muted `#6e6c66`, faint `#8a8882`, fainter `#9d9a93`.
- **Primary** is ink (`#1c1b1a`, hover `#3a3935`). Danger is `oklch(0.55 0.17 25)`.
- **Tones** (bg / fg / dot), shared lightness and chroma at hue 250 blue, 150 green, 65 amber, 25 red, plus gray:
  - bg `oklch(0.955 0.03 h)`
  - fg `oklch(0.46 0.12 h)`
  - dot `oklch(0.65 0.14 h)`
- **Status mapping:**
  - Planned → gray
  - In Progress / Active → blue
  - Blocked → red
  - Completed → green
  - Priority: High red, Medium amber, Low gray
- **Radius:** 4 / 5 / 6 / 8 / 10px, plus pill.
- **Type:** Geist 400/500/600. Sizes 11.5 / 12 / 12.5 / 13 / 13.5 / 15 / 19 / 20 / 22px. Body text is 13px.
- **Shadows:**
  - Popovers: `0 10px 28px rgba(28,27,26,.14)`
  - Drawer: `-12px 0 32px rgba(28,27,26,.08)`
  - Dialog: `0 20px 48px rgba(28,27,26,.2)`

## Assets
There are no images or icon fonts. Icons are small inline stroke SVGs (chevrons, list glyphs, ⋯) using `currentColor` at a 1.4–1.6px stroke. Avatars are initials on hashed OKLCH colours (`bg oklch(.92 .04 h)`, `fg oklch(.42 .09 h)`).

## Files
- `PM Dashboard v3.dc.html`: the full app, with every screen and interaction.
- `Design System.dc.html`: live token and component showcase.
- `tokens.css`: design tokens.
- Component files: `Button`, `Select`, `StatusPill`, `StatusSelect`, `PrioritySelect`, `PersonSelect`, `PeopleButton`, `AddChip`, `Avatar`, `AvatarStack`, `ProgressBar`, `Confidence`, `Tabs`, `MoreButton`, `NoteThread`, `SelectionBar`, `ConfirmDialog` (`.dc.html`).
- `design-system-readme.md`: content and visual rules (tone of voice, colour usage, iconography).
- `support.js`: the prototype runtime, needed only to open the HTML files locally.

---
name: write-comments
description: >
  How to comment code in this repo. A comment earns its place by saying something the code cannot:
  the constraint behind a line, the prototype behaviour it ports, the reason a safe-looking change
  would break something, or the contract of an exported helper — never a restatement of the syntax.
  Trigger when adding, editing or reviewing comments, JSDoc or docblocks; when adding an
  `eslint-disable`, a `@ts-expect-error` or a non-obvious cast, each of which must carry a reason;
  when porting behaviour from `design/`; and when you catch yourself about to write a comment that
  repeats the line under it.
argument-hint: '[file or area]'
---

# Write comments

## must

1. **A suppression carries its reason.** Every `eslint-disable`, `@ts-expect-error` or surprising
   cast is preceded by why it is needed and what would happen otherwise:

   ```ts
   // The constraint must be `any[]`: `unknown[]` makes no concrete callback assignable to T.
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
   ```

2. **Never leave commented-out code.** Delete it; git remembers. A commented block does not say
   whether it is a plan, a fallback or a leftover.
3. **Do not describe what the next line does.** `// update the feature` above
   `db().from('features').update(…)` is noise.
4. **A comment that is now wrong is worse than none.** When you change a line, read the comment
   above it — and the file's header comment, which names the prototype function it ports.
5. **Two lines, not ten.** State the constraint and stop. Only a docblock on an exported helper in
   `src/lib/` runs longer, and only because its caller will not read the implementation.
6. **Do not narrate the bug you just fixed.** A comment holds the constraint that stands now. The
   symptom, the investigation and the reasoning belong in the commit message. Past tense earns a
   clause only where it warns off a change someone would otherwise make.

## The repo's own convention: cite the prototype

This app is a port of `design/PM Dashboard v3.dc.html` and `design/*.dc.html`. Code that reproduces
prototype behaviour says where it came from, by the prototype's own names, so a reader can find the
original with one search:

- **File header**, first line of every view, page and hub component:
  `// POCs — design/PM Dashboard v3.dc.html (isPocs).`
  `// design/ConfirmDialog.dc.html — destructive confirmation with an impact list.`
- **Behaviour that looks arbitrary** gets "as in the prototype" and the reason it was kept:
  `// The prototype bumps a feature's "Updated" time for any owner/watcher/POC change.`
  `// As in the prototype, only a submit button sets `disabled`; any other one just ignores clicks.`
- **Prototype identifiers** in backticks or parentheses — `renderVals`, `isFeatDrawer`, `tPoc`,
  `mnOpen`, `linkedN`, `delAsk` — not a paraphrase. `grep -n "isFeatDrawer" "design/PM Dashboard v3.dc.html"`
  must find it.

If you change behaviour away from the prototype on purpose, say so in one line, so the next person
does not "fix" it back.

## should

**Comment the constraint, not the mechanics.** The useful comments here answer "why is it written
this way, and what breaks otherwise":

```ts
// globals.css replaces Tailwind's text and radius scales with the design tokens. Without this,
// tailwind-merge reads `text-md` as a colour and drops a `text-ink` beside it.
```

```ts
// Via a resolved promise so a synchronous throw in `load` (e.g. input validation) is held too.
```

**Give an exported helper in `src/lib/` a docblock** saying what it is for and what the caller must
know — the invariant, the failure mode. `requireUserWith` and `unwrap` are the model: one says the
load result is withheld until the account check passes, the other that `.maybeSingle()` callers cast
to `T | null`.

**Say when a list is load-bearing.** The `as const` arrays in `src/lib/types.ts` mirror check
constraints in the migration, and the file's header names that migration. A new list another file
depends on says what to change with it.

**Prefer a name over a comment.** If a comment explains what a variable holds, rename the variable.

**Match the density of the file.** A shadcn primitive in `src/components/ui/` carries none beyond
what the CLI wrote; `session.ts` carries several. Do not docblock every handler in a view because a
helper in `lib/` has one. Long files in `src/lib/` use the `// ----` section banners already there;
keep to them rather than inventing another divider.

**Write prose, in full sentences, in the third person.** No `TODO(me)`, no first-person notes, no
issue shorthand.

## The test

Before keeping a comment, ask: *if I delete this, does a competent reader lose information they
cannot recover from the code or the prototype?* If no, delete it. If yes, make it say exactly that
in as few lines as it takes.

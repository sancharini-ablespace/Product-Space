"use client";

// Features page — design/PM Dashboard v3.dc.html (isFeatures, tFeat, filter builder, saved filters).
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { Button } from "@/components/hub/Button";
import { EmptyState } from "@/components/hub/EmptyState";
import { PeopleButton } from "@/components/hub/PeopleButton";
import { PrioritySelect, type Priority } from "@/components/hub/PrioritySelect";
import { Select, type SelectOption } from "@/components/hub/Select";
import { SelectionBar } from "@/components/hub/SelectionBar";
import { StatusSelect } from "@/components/hub/StatusSelect";
import { NewButton } from "@/components/new-button";
import { anchorOf, type Anchor } from "@/components/popovers";
import { SortHeader } from "@/components/sort-header";
import { useTable, type Column } from "@/components/use-table";
import { deleteSavedFilter, saveFilter, setFeaturesArchived, updateFeature } from "@/lib/actions";
import { memberAv, memberName, pocAv, rel, sortFeatures } from "@/lib/hub";
import type { FeatureRow } from "@/lib/queries";
import { FEATURE_STATUSES, PRIORITIES, type FilterField, type SavedFilter } from "@/lib/types";
import { DeleteFeaturesDialog } from "./delete-features-dialog";
import { FeaturePicker, type FeatureLinkKind, type PocOption, type TeamMember } from "./feature-picker";
import { openFeature } from "./url";

type Rule = { id: string; field: FilterField; op: "is" | "not"; value: string };
type VersionOption = { id: string; num: number; name: string; project: { id: string; name: string } };

const COLS =
  "grid-cols-[20px_minmax(220px,2fr)_124px_110px_minmax(150px,1fr)_150px_150px_84px_92px_84px]";
const FIELD_L: Record<FilterField, string> = { project: "Project", version: "Version", status: "Status", owner: "Owner", poc: "POC", priority: "Priority" };
const FIELD_OPTS: SelectOption[] = (Object.keys(FIELD_L) as FilterField[]).map((v) => ({ v, l: FIELD_L[v] }));
const OP_OPTS: SelectOption[] = [{ v: "is", l: "is" }, { v: "not", l: "is not" }];
const ORD: Record<string, number> = { Blocked: 0, "In Progress": 1, Planned: 2, Completed: 3 };
const PRI = ["High", "Medium", "Low"];
const ZZ = "￿";
const lc = (s: string) => s.toLowerCase();
const uid = () => Math.random().toString(36).slice(2, 9);

/** Value used by a rule's field for one feature (prototype valOf). */
function valOf(f: FeatureRow, k: FilterField): string | string[] {
  if (k === "project") return f.version?.project.id ?? "";
  if (k === "version") return f.version_id ?? "";
  if (k === "owner") return f.owners.map((o) => o.id);
  if (k === "poc") return f.pocs.map((c) => c.id);
  return f[k];
}
const has = (f: FeatureRow, k: FilterField, x: string) => {
  const y = valOf(f, k);
  return Array.isArray(y) ? y.includes(x) : y === x;
};

type Change = { ids: string[]; patch?: Partial<FeatureRow>; remove?: boolean };

export function FeaturesView({
  features: serverFeatures,
  members,
  pocOptions,
  projects,
  versions,
  savedFilters,
  meId,
}: {
  features: FeatureRow[];
  members: TeamMember[];
  pocOptions: PocOption[];
  projects: { id: string; name: string }[];
  versions: VersionOption[];
  savedFilters: SavedFilter[];
  meId: string;
}) {
  const [features, apply] = useOptimistic(serverFeatures, (cur: FeatureRow[], c: Change) =>
    c.remove ? cur.filter((f) => !c.ids.includes(f.id)) : cur.map((f) => (c.ids.includes(f.id) ? { ...f, ...c.patch } : f)),
  );
  const [, startTransition] = useTransition();
  const [rules, setRules] = useState<Rule[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [picker, setPicker] = useState<{ id: string; kind: FeatureLinkKind; anchor: Anchor } | null>(null);
  const [deleting, setDeleting] = useState<FeatureRow[] | null>(null);

  // ---------------------------------------------------------------------------
  // Filtering (prototype: rules on the same field match any value; all others must match)
  // ---------------------------------------------------------------------------
  const projIs = rules.filter((r) => r.field === "project" && r.op === "is" && r.value).map((r) => r.value);
  const optsFor = (k: FilterField): SelectOption[] =>
    k === "project"
      ? projects.map((p) => ({ v: p.id, l: p.name }))
      : k === "version"
        ? versions
            .filter((v) => !projIs.length || projIs.includes(v.project.id))
            .map((v) => ({ v: v.id, l: `${v.project.name} · V${v.num} — ${v.name}` }))
        : k === "status"
          ? FEATURE_STATUSES.map((x) => ({ v: x, l: x }))
          : k === "owner"
            ? members.map((m) => ({ v: m.id, l: memberName(m) }))
            : k === "poc"
              ? pocOptions.map((c) => ({ v: c.id, l: c.name + (c.org ? " · " + c.org : "") }))
              : PRIORITIES.map((x) => ({ v: x, l: x }));
  const labelOf = (k: FilterField, v: string) => {
    const o = optsFor(k).find((x) => x.v === v);
    if (o) return o.l;
    const ver = k === "version" && versions.find((x) => x.id === v);
    return ver ? `${ver.project.name} · V${ver.num}` : v;
  };
  const setRule = (id: string, patch: Partial<Rule>) => setRules((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRule = (id: string) => setRules((rs) => rs.filter((r) => r.id !== id));
  const live = rules.filter((r) => r.value);
  const byField: Partial<Record<FilterField, string[]>> = {};
  live.filter((r) => r.op === "is").forEach((r) => (byField[r.field] ??= []).push(r.value));
  const filtered = features.filter(
    (f) =>
      Object.entries(byField).every(([k, vals]) => vals!.some((x) => has(f, k as FilterField, x))) &&
      live.filter((r) => r.op === "not").every((r) => !has(f, r.field, r.value)),
  );
  const hasFilters = live.length > 0;
  const clearFilters = () => setRules([]);
  const saveCurrent = () => {
    const name = saveName.trim();
    if (!name || !live.length) return;
    startTransition(async () => {
      await saveFilter(name, live.map(({ field, op, value }) => ({ field, op, value })));
      setSaveName("");
      setSavedOpen(false);
    });
  };

  // ---------------------------------------------------------------------------
  // Table
  // ---------------------------------------------------------------------------
  const columns: Column<FeatureRow>[] = [
    { key: "name", label: "Feature", sort: (r) => lc(r.name) },
    { key: "status", label: "Status", sort: (r) => ORD[r.status]! },
    { key: "project", label: "Project", sort: (r) => lc(r.version?.project.name ?? "No project") },
    { key: "version", label: "Version", sort: (r) => lc(r.version?.project.name ?? "No project") + String(r.version?.num ?? 0).padStart(4, "0") },
    { key: "owners", label: "Owners", sort: (r) => (r.owners[0] ? lc(memberName(r.owners[0])) : ZZ) },
    { key: "pocs", label: "POCs", sort: (r) => (r.pocs[0] ? lc(r.pocs[0].name) : ZZ) },
    { key: "priority", label: "Priority", sort: (r) => PRI.indexOf(r.priority) },
    { key: "watchers", label: "Watchers", descFirst: true, sort: (r) => r.watchers.length },
    { key: "updated", label: "Updated", descFirst: true, sort: (r) => r.updated_at },
  ];
  const t = useTable(sortFeatures(filtered), columns);
  const selAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selAllRef.current) selAllRef.current.indeterminate = t.someSelected;
  }, [t.someSelected]);

  const mutate = (change: Change, run: () => Promise<unknown>) =>
    startTransition(async () => {
      apply(change);
      await run();
    });
  const pickerFeature = picker && features.find((f) => f.id === picker.id);
  const openCount = filtered.filter((f) => f.status !== "Completed").length;

  return (
    <div className="flex max-w-[1400px] flex-col gap-3.5 px-[clamp(16px,4vw,32px)] pt-6 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 text-[20px] font-semibold tracking-[-0.015em]">Features</h1>
          <div className="mt-1 text-[13px] text-muted">
            {filtered.length} features · {openCount} open
          </div>
        </div>
        <NewButton label="+ New feature" href="/features?new=feature" />
      </div>

      {features.length ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setFilterOpen((o) => !o)}
                className="flex h-[30px] cursor-pointer items-center gap-[7px] rounded-md border px-2.5 text-md font-medium hover:border-border-hover!"
                style={{
                  borderColor: filterOpen || hasFilters ? "var(--faint)" : "var(--border-strong)",
                  background: filterOpen ? "var(--surface-muted)" : "#fff",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1.5 3 H10.5 M3.5 6 H8.5 M5 9 H7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                Filter
                {hasFilters && (
                  <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[9px] bg-ink px-[5px] text-[11px] text-on-primary">
                    {live.length}
                  </span>
                )}
              </button>
              {filterOpen && (
                <>
                  <div
                    onClick={() => {
                      setFilterOpen(false);
                      setSavedOpen(false);
                    }}
                    className="fixed inset-0 z-30"
                  />
                  <div className="absolute top-9 left-0 z-[31] flex w-[min(580px,90vw)] flex-col gap-3 rounded-xl border border-border bg-surface p-3.5 shadow-[0_12px_32px_var(--scrim)]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[14px] font-semibold">Filters</span>
                        <span
                          title="Rules on the same field match any value; all other rules must match."
                          className="inline-flex size-3.5 cursor-help items-center justify-center rounded-full border-[1.3px] border-fainter text-[9px] font-bold text-faint"
                        >
                          i
                        </span>
                      </div>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setSavedOpen((o) => !o)}
                          className="flex h-[30px] cursor-pointer items-center gap-1.5 rounded-md border border-border-strong bg-surface px-2.5 text-md font-medium hover:bg-surface-muted"
                        >
                          Saved filters
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 3.5 L5 6.5 L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        {savedOpen && (
                          <div className="absolute top-[34px] right-0 z-[2] w-[250px] rounded-lg border border-border bg-surface p-1 shadow-[0_10px_28px_var(--scrim)]">
                            {savedFilters.map((sv) => (
                              <div key={sv.id} className="flex items-center gap-1 rounded-[5px] hover:bg-surface-muted">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRules(sv.rules.map((r) => ({ ...r, id: uid() })));
                                    setSavedOpen(false);
                                  }}
                                  className="flex h-8 min-w-0 flex-1 cursor-pointer justify-between gap-2 border-0 bg-transparent px-2.5 text-left text-[13px] leading-8"
                                >
                                  <span className="truncate">{sv.name}</span>
                                  <span className="text-[12px] text-fainter">
                                    {sv.rules.length} {sv.rules.length === 1 ? "rule" : "rules"}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  title="Delete saved filter"
                                  onClick={() => startTransition(async () => void (await deleteSavedFilter(sv.id)))}
                                  className="mr-1 size-6 cursor-pointer rounded-[5px] border-0 bg-transparent p-0 text-[13px] text-fainter hover:bg-[#e9e8e4] hover:text-ink"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            {!savedFilters.length && <div className="px-2.5 py-2 text-md text-faint">No saved filters yet.</div>}
                            <div className="mt-1 flex gap-1.5 border-t border-hover px-1.5 pt-2 pb-1">
                              <input
                                value={saveName}
                                onChange={(e) => setSaveName(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && saveCurrent()}
                                placeholder="Name current filters"
                                className="h-7 min-w-0 flex-1 rounded-[5px] border border-border-strong px-2 text-md outline-none focus:border-faint"
                              />
                              <Button label="Save" variant="primary" size="sm" onClick={saveCurrent} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {rules.length > 0 && (
                      <div className="flex flex-col gap-2 rounded-lg bg-bg p-2.5">
                        {rules.map((r) => (
                          <div key={r.id} className="grid grid-cols-[140px_104px_minmax(0,1fr)_30px] items-center gap-2">
                            <Select value={r.field} options={FIELD_OPTS} block onChange={(e) => setRule(r.id, { field: e.target.value as FilterField, value: "" })} />
                            <Select value={r.op} options={OP_OPTS} block onChange={(e) => setRule(r.id, { op: e.target.value as "is" | "not" })} />
                            <Select
                              value={r.value}
                              options={[{ v: "", l: `Select ${FIELD_L[r.field].toLowerCase()}…` }, ...optsFor(r.field)]}
                              block
                              muted={!r.value}
                              onChange={(e) => setRule(r.id, { value: e.target.value })}
                            />
                            <button
                              type="button"
                              title="Remove rule"
                              onClick={() => removeRule(r.id)}
                              className="flex size-[30px] cursor-pointer items-center justify-center rounded-md border-0 bg-transparent p-0 text-muted hover:bg-[#e9e8e4] hover:text-ink"
                            >
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path
                                  d="M2.5 4 H11.5 M5.5 4 V2.5 H8.5 V4 M3.5 4 L4.2 12 H9.8 L10.5 4"
                                  stroke="currentColor"
                                  strokeWidth="1.3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setRules((rs) => [...rs, { id: uid(), field: "status", op: "is", value: "" }])}
                        className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-border-strong bg-surface px-3 text-[13px] font-medium hover:bg-surface-muted"
                      >
                        <span className="text-[15px] leading-none">+</span>Add filter
                      </button>
                      {rules.length > 0 && <Button label="Clear all" variant="ghost" size="sm" onClick={clearFilters} />}
                    </div>
                  </div>
                </>
              )}
            </div>
            {live.map((r) => (
              <span
                key={r.id}
                className="inline-flex h-7 items-center gap-1 rounded-[14px] border border-border-strong bg-surface pr-1 pl-2.5 text-md"
              >
                <span className="text-faint">
                  {FIELD_L[r.field]}
                  {r.op === "not" ? " is not" : ""}:
                </span>
                <span className="font-medium">{labelOf(r.field, r.value)}</span>
                <button
                  type="button"
                  title="Remove filter"
                  onClick={() => removeRule(r.id)}
                  className="size-5 cursor-pointer rounded-full border-0 bg-transparent p-0 text-[13px] leading-none text-fainter hover:bg-hover hover:text-ink"
                >
                  ×
                </button>
              </span>
            ))}
            {hasFilters && <Button label="Clear all" variant="ghost" size="sm" onClick={clearFilters} />}
          </div>

          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <div className="min-w-[1340px]">
              <div className={`grid ${COLS} items-center gap-3 border-b border-border bg-surface-sunken px-4 py-1.5 text-[12px] font-medium text-faint`}>
                <input
                  ref={selAllRef}
                  type="checkbox"
                  title="Select all"
                  checked={t.allSelected}
                  onChange={t.toggleAll}
                  className="m-0 size-[15px] cursor-pointer accent-[var(--ink)]"
                />
                {t.headers.map((h) => (
                  <SortHeader key={h.label} label={h.label} right={h.right} arrow={h.arrow} active={h.active} onClick={h.onClick} />
                ))}
              </div>
              {t.rows.map((f) => {
                const checked = t.isSelected(f.id);
                const pocs = f.pocs;
                return (
                  <div
                    key={f.id}
                    onClick={() => openFeature(f.id)}
                    className={`grid ${COLS} h-11 cursor-pointer items-center gap-3 border-b border-border-subtle px-4 text-[13px] hover:bg-surface-hover!`}
                    style={{ background: checked ? "var(--selected)" : "transparent" }}
                  >
                    <div onClick={(e) => e.stopPropagation()} className="flex h-full items-center">
                      <input type="checkbox" checked={checked} onChange={() => t.toggle(f.id)} className="m-0 size-[15px] cursor-pointer accent-[var(--ink)]" />
                    </div>
                    <div className="truncate font-medium" style={{ color: f.status === "Completed" ? "var(--faint)" : "var(--ink)" }}>
                      {f.name}
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <StatusSelect
                        kind="feature"
                        value={f.status}
                        onChange={(e) => {
                          const status = e.target.value as FeatureRow["status"];
                          mutate({ ids: [f.id], patch: { status } }, () => updateFeature(f.id, { status }));
                        }}
                      />
                    </div>
                    <span className="truncate text-ink-2">{f.version?.project.name ?? "No project"}</span>
                    <span className="truncate text-ink-3">{f.version ? `Version ${f.version.num} · ${f.version.name}` : "—"}</span>
                    <PeopleButton
                      people={f.owners.map((o) => ({ ...memberAv(o), name: memberName(o) }))}
                      max={3}
                      label={f.owners.length ? "" : "Add owner"}
                      labelColor={f.owners.length ? "var(--ink)" : "var(--fainter)"}
                      size="md"
                      edge="start"
                      title="Edit owners"
                      onClick={(e) => setPicker({ id: f.id, kind: "owners", anchor: anchorOf(e.currentTarget) })}
                    />
                    <PeopleButton
                      people={pocs.map(pocAv)}
                      max={2}
                      label={pocs.length ? pocs[0]!.name + (pocs.length > 1 ? ` +${pocs.length - 1}` : "") : "Add POC"}
                      labelColor={pocs.length ? "var(--ink)" : "var(--fainter)"}
                      size="md"
                      edge="start"
                      title="Edit POCs"
                      onClick={(e) => setPicker({ id: f.id, kind: "pocs", anchor: anchorOf(e.currentTarget) })}
                    />
                    <div onClick={(e) => e.stopPropagation()}>
                      <PrioritySelect
                        value={f.priority as Priority}
                        onChange={(e) => {
                          const priority = e.target.value as FeatureRow["priority"];
                          mutate({ ids: [f.id], patch: { priority } }, () => updateFeature(f.id, { priority }));
                        }}
                      />
                    </div>
                    <PeopleButton
                      people={f.watchers.map((w) => ({ ...memberAv(w), name: memberName(w) }))}
                      max={3}
                      align="start"
                      label=""
                      size="md"
                      edge="start"
                      title="Edit watchers"
                      onClick={(e) => setPicker({ id: f.id, kind: "watchers", anchor: anchorOf(e.currentTarget) })}
                    />
                    <span className="text-md text-faint">{rel(f.updated_at)}</span>
                  </div>
                );
              })}
              {!filtered.length && (
                <EmptyState
                  icon="filter"
                  size="sm"
                  title="No features match these filters"
                  body="Try removing a rule or clearing all filters."
                  actionLabel="Clear filters"
                  actionVariant="secondary"
                  onAction={clearFilters}
                />
              )}
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          icon="list"
          title="No features yet"
          body="Capture what needs to be built. You can attach a feature to a project version now or later."
          actionLabel="+ New feature"
          actionHref="/features?new=feature"
          bordered
        />
      )}

      {pickerFeature && picker && (
        <FeaturePicker
          feature={pickerFeature}
          kind={picker.kind}
          anchor={picker.anchor}
          members={members}
          pocOptions={pocOptions}
          meId={meId}
          onLocal={(patch) => apply({ ids: [pickerFeature.id], patch })}
          onClose={() => setPicker(null)}
        />
      )}
      {t.selectedIds.length > 0 && (
        <SelectionBar
          label={`${t.selectedIds.length} selected`}
          actions={[
            {
              label: "Archive",
              onClick: () => {
                const ids = t.selectedIds;
                t.clear();
                mutate({ ids, remove: true }, () => setFeaturesArchived(ids, true));
              },
            },
            { label: "Delete", onClick: () => setDeleting(features.filter((f) => t.selectedIds.includes(f.id))) },
          ]}
          onClear={t.clear}
        />
      )}
      {deleting && (
        <DeleteFeaturesDialog
          features={deleting}
          onCancel={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            t.clear();
          }}
        />
      )}
    </div>
  );
}

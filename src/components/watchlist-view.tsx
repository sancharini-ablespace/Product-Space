"use client";

// Watchlist — design/PM Dashboard v3.dc.html (isWatch, tWatch). Features the current user watches.
import { useEffect, useOptimistic, useRef, useTransition } from "react";
import { AvatarStack } from "@/components/hub/AvatarStack";
import { Button } from "@/components/hub/Button";
import { EmptyState } from "@/components/hub/EmptyState";
import { SelectionBar } from "@/components/hub/SelectionBar";
import { StatusPill } from "@/components/hub/StatusPill";
import { openFeature } from "@/components/feature/url";
import { SortHeader } from "@/components/sort-header";
import { useTable, type Column } from "@/components/use-table";
import { setFeatureLink } from "@/lib/actions";
import { fmt, memberAv, memberName, rel, sortFeatures, targetColor } from "@/lib/hub";
import type { FeatureRow } from "@/lib/queries";

const COLS = "grid-cols-[20px_minmax(240px,2fr)_120px_minmax(150px,1fr)_130px_116px_72px_96px_84px]";
const ORD: Record<string, number> = { Blocked: 0, "In Progress": 1, Planned: 2, Completed: 3 };
const ZZ = "￿";
const lc = (s: string) => s.toLowerCase();

export function WatchlistView({ features, me }: { features: FeatureRow[]; me: { id: string; name: string } }) {
  const [rows, unwatchLocal] = useOptimistic(features, (cur: FeatureRow[], ids: string[]) => cur.filter((f) => !ids.includes(f.id)));
  const [, startTransition] = useTransition();

  const columns: Column<FeatureRow>[] = [
    { key: "name", label: "Feature", sort: (r) => lc(r.name) },
    { key: "project", label: "Project", sort: (r) => lc(r.version?.project.name ?? "No project") },
    { key: "version", label: "Version", sort: (r) => lc(r.version?.project.name ?? "No project") + String(r.version?.num ?? 0).padStart(4, "0") },
    { key: "owners", label: "Owners", sort: (r) => (r.owners[0] ? lc(memberName(r.owners[0])) : ZZ) },
    { key: "status", label: "Status", sort: (r) => ORD[r.status]! },
    { key: "target", label: "Target", sort: (r) => r.version?.target_date || "9999" },
    { key: "updated", label: "Last updated", descFirst: true, sort: (r) => r.updated_at },
    { key: null, label: "" },
  ];
  const t = useTable(sortFeatures(rows), columns);
  const selAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selAllRef.current) selAllRef.current.indeterminate = t.someSelected;
  }, [t.someSelected]);

  const unwatch = (ids: string[]) =>
    startTransition(async () => {
      unwatchLocal(ids);
      for (const id of ids) await setFeatureLink(id, "watchers", me.id, false);
    });

  return (
    <div className="flex max-w-[1400px] flex-col gap-3.5 px-[clamp(16px,4vw,32px)] pt-6 pb-10">
      <div>
        <h1 className="m-0 text-[20px] font-semibold tracking-[-0.015em]">Watchlist</h1>
        <div className="mt-1 text-[13px] text-muted">
          Features {me.name} is watching. Watching keeps you informed — owners still own the work.
        </div>
      </div>
      {rows.length ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <div className="min-w-[1180px]">
            <div className={`grid ${COLS} items-center gap-3 border-b border-border bg-surface-sunken px-4 py-1.5 text-[12px] font-medium text-faint`}>
              <input
                ref={selAllRef}
                type="checkbox"
                title="Select all"
                checked={t.allSelected}
                onChange={t.toggleAll}
                className="m-0 size-[15px] cursor-pointer accent-[var(--ink)]"
              />
              {t.headers.map((h, i) => (
                <SortHeader key={h.label || i} label={h.label} right={h.right} arrow={h.arrow} active={h.active} onClick={h.onClick} />
              ))}
            </div>
            {t.rows.map((f) => {
              const checked = t.isSelected(f.id);
              const done = f.status === "Completed";
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
                  <div className="truncate font-medium" style={{ color: done ? "var(--faint)" : "var(--ink)" }}>
                    {f.name}
                  </div>
                  <span className="text-ink-2">{f.version?.project.name ?? "No project"}</span>
                  <span className="truncate text-ink-3">{f.version ? `Version ${f.version.num} · ${f.version.name}` : "—"}</span>
                  <span className="flex min-w-0 items-center gap-1.5">
                    <AvatarStack people={f.owners.map((o) => ({ ...memberAv(o), name: memberName(o) }))} max={3} empty="" />
                    <span className="truncate">{f.owners.length ? "" : "Add owner"}</span>
                  </span>
                  <span>
                    <StatusPill value={f.status} />
                  </span>
                  <span style={{ color: targetColor(f.version?.target_date, done) }}>{fmt(f.version?.target_date)}</span>
                  <span className="text-md text-faint">{rel(f.updated_at)}</span>
                  <span className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button label="Unwatch" variant="ghost" size="sm" onClick={() => unwatch([f.id])} />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState
          icon="eye"
          title="You’re not watching anything"
          body="Watch a feature to follow its progress without owning it. Open any feature and choose Watch."
          actionLabel="Browse features"
          actionVariant="secondary"
          actionHref="/features"
          bordered
        />
      )}
      {t.selectedIds.length > 0 && (
        <SelectionBar
          label={`${t.selectedIds.length} selected`}
          actions={[
            {
              label: "Unwatch",
              onClick: () => {
                const ids = t.selectedIds;
                t.clear();
                unwatch(ids);
              },
            },
          ]}
          onClear={t.clear}
        />
      )}
    </div>
  );
}

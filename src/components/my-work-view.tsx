"use client";

// My work — design/PM Dashboard v3.dc.html (isMine, myStats, myRows). Features the current user owns.
import { useOptimistic, useTransition } from "react";
import { EmptyState } from "@/components/hub/EmptyState";
import { PrioritySelect, type Priority } from "@/components/hub/PrioritySelect";
import { StatusSelect } from "@/components/hub/StatusSelect";
import { openFeature } from "@/components/feature/url";
import { updateFeature } from "@/lib/actions";
import { T, days, fmt, sortFeatures, targetColor } from "@/lib/hub";
import type { FeatureRow } from "@/lib/queries";

const COLS = "grid-cols-[minmax(240px,2.2fr)_120px_minmax(170px,1.2fr)_124px_84px_76px]";

export function MyWorkView({ features, meName }: { features: FeatureRow[]; meName: string }) {
  const [rows, patchLocal] = useOptimistic(features, (cur: FeatureRow[], c: { id: string; patch: Partial<FeatureRow> }) =>
    cur.map((f) => (f.id === c.id ? { ...f, ...c.patch } : f)),
  );
  const [, startTransition] = useTransition();
  const save = (id: string, patch: { status?: FeatureRow["status"]; priority?: FeatureRow["priority"] }) =>
    startTransition(async () => {
      patchLocal({ id, patch });
      await updateFeature(id, patch);
    });

  // Prototype: myOpen, dueSoon, myBlocked.
  const myOpen = rows.filter((f) => f.status !== "Completed");
  const dueSoon = myOpen.filter((f) => f.version?.target_date && days(f.version.target_date) <= 14).length;
  const myBlocked = myOpen.filter((f) => f.status === "Blocked").length;
  const stats = [
    { label: "My features", value: myOpen.length, color: "var(--ink)" },
    { label: "Shipping in 2 weeks", value: dueSoon, color: dueSoon ? T.amber.fg : "var(--ink)" },
    { label: "Blocked", value: myBlocked, color: myBlocked ? T.red.fg : "var(--ink)" },
  ];

  return (
    <div className="flex max-w-[1200px] flex-col gap-4 px-[clamp(16px,4vw,32px)] pt-6 pb-10">
      <div>
        <h1 className="m-0 text-[20px] font-semibold tracking-[-0.015em]">My work</h1>
        <div className="mt-1 text-[13px] text-muted">Features {meName} owns</div>
      </div>
      <div className="flex flex-wrap gap-3">
        {stats.map((c) => (
          <div key={c.label} className="flex min-w-[150px] items-baseline justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-2.5">
            <span className="text-md font-medium text-muted">{c.label}</span>
            <span className="text-[20px] font-semibold tabular-nums" style={{ color: c.color }}>
              {c.value}
            </span>
          </div>
        ))}
      </div>
      {rows.length ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <div className="min-w-[920px]">
            <div className={`grid ${COLS} gap-3 border-b border-border bg-surface-sunken px-4 py-[9px] text-[12px] font-medium text-faint`}>
              <span>Feature</span>
              <span>Project</span>
              <span>Version</span>
              <span>Status</span>
              <span>Priority</span>
              <span>Target</span>
            </div>
            {sortFeatures(rows).map((f) => {
              const done = f.status === "Completed";
              return (
                <div
                  key={f.id}
                  onClick={() => openFeature(f.id)}
                  className={`grid ${COLS} h-[42px] cursor-pointer items-center gap-3 border-b border-border-subtle px-4 text-[13px] hover:bg-surface-hover`}
                >
                  <div className="truncate font-medium" style={{ color: done ? "var(--faint)" : "var(--ink)" }}>
                    {f.name}
                  </div>
                  <span className="text-ink-2">{f.version?.project.name ?? "No project"}</span>
                  <span className="truncate text-ink-3">{f.version ? `Version ${f.version.num} · ${f.version.name}` : "—"}</span>
                  <div onClick={(e) => e.stopPropagation()}>
                    <StatusSelect kind="feature" value={f.status} onChange={(e) => save(f.id, { status: e.target.value as FeatureRow["status"] })} />
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <PrioritySelect value={f.priority as Priority} onChange={(e) => save(f.id, { priority: e.target.value as FeatureRow["priority"] })} />
                  </div>
                  <span style={{ color: targetColor(f.version?.target_date, done) }}>{fmt(f.version?.target_date)}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState
          icon="user"
          title="Nothing assigned to you"
          body="Features where you’re an owner will be listed here with their status and target date."
          actionLabel="+ New feature"
          actionVariant="secondary"
          actionHref="/my-work?new=feature"
          bordered
        />
      )}
    </div>
  );
}

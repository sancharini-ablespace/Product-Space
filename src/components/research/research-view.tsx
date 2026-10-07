"use client";

// Research page — design/PM Dashboard v3.dc.html (isResearch, resTabs, tRes).
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/hub/Button";
import { EmptyState } from "@/components/hub/EmptyState";
import { SelectionBar } from "@/components/hub/SelectionBar";
import { SortHeader } from "@/components/sort-header";
import { useTable, type Column } from "@/components/use-table";
import { createResearch, deleteResearch } from "@/lib/actions";
import { RS_TONE, rel, stripMd } from "@/lib/hub";
import type { ResearchRow } from "@/lib/queries";
import { RESEARCH_STATUSES } from "@/lib/types";
import { openResearch } from "./url";

const COLS = "grid-cols-[20px_minmax(220px,1.4fr)_minmax(120px,0.8fr)_120px_minmax(170px,1fr)_minmax(240px,2fr)_60px]";
const ZZ = "￿";
const lc = (s: string) => s.toLowerCase();

export function ResearchView({ items }: { items: ResearchRow[] }) {
  const [tab, setTab] = useState<string>("all");
  const [asking, setAsking] = useState(false);
  const [pending, startTransition] = useTransition();
  const rows = items.filter((r) => tab === "all" || r.status === tab);

  const columns: Column<ResearchRow>[] = [
    { key: "name", label: "Software", sort: (r) => lc(r.name) },
    { key: "cat", label: "Category", sort: (r) => (r.category ? lc(r.category) : ZZ) },
    { key: "status", label: "Status", sort: (r) => RESEARCH_STATUSES.indexOf(r.status) },
    { key: "projects", label: "Linked projects", sort: (r) => (r.projects[0] ? lc(r.projects[0].name) : ZZ) },
    { key: "notes", label: "Key functionalities", descFirst: true, sort: (r) => r.notes[0]?.created_at ?? "" },
    { key: "count", label: "Notes", right: true, descFirst: true, sort: (r) => r.notes.length },
  ];
  const t = useTable(rows, columns);
  const selAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selAllRef.current) selAllRef.current.indeterminate = t.someSelected;
  }, [t.someSelected]);

  const tabs = [
    { id: "all", label: "All", count: items.length },
    ...RESEARCH_STATUSES.map((s) => ({ id: s, label: s, count: items.filter((r) => r.status === s).length })),
  ];
  const n = t.selectedIds.length;
  const addSoftware = () =>
    startTransition(async () => {
      // Prototype addResearch(): creates "New software" right away and opens its drawer.
      const res = await createResearch();
      if (res.id) openResearch(res.id);
    });

  return (
    <div className="flex max-w-[1400px] flex-col gap-3.5 px-[clamp(16px,4vw,32px)] pt-6 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 text-[20px] font-semibold tracking-[-0.015em]">Research</h1>
          <div className="mt-1 text-[13px] text-muted">
            Software to study, linked to the projects it informs · {items.length} tools ·{" "}
            {items.filter((r) => r.status === "Reviewed").length} reviewed
          </div>
        </div>
        <Button
          label="+ Add software"
          variant="primary"
          onClick={addSoftware}
        />
      </div>

      {items.length ? (
        <>
          <div className="inline-flex max-w-full items-center gap-0.5 self-start overflow-x-auto rounded-lg border border-border bg-surface-sunken p-0.5">
            {tabs.map((x) => {
              const act = tab === x.id;
              return (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => setTab(x.id)}
                  className="flex h-[26px] cursor-pointer items-center gap-1.5 rounded-md border-0 px-2.5 text-md font-medium whitespace-nowrap hover:text-ink!"
                  style={{
                    background: act ? "#fff" : "transparent",
                    boxShadow: act ? "0 1px 2px rgba(0,0,0,0.08), 0 0 0 1px var(--border)" : "none",
                    color: act ? "var(--ink)" : "var(--muted)",
                  }}
                >
                  {x.label}
                  <span className="text-[11.5px] tabular-nums" style={{ color: act ? "var(--faint)" : "var(--fainter)" }}>
                    {x.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <div className="min-w-[1100px]">
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
              {t.rows.map((r) => {
                const checked = t.isSelected(r.id);
                const tone = RS_TONE[r.status] ?? RS_TONE["To research"]!;
                const ln = r.notes[0];
                const lastNote = ln ? stripMd(ln.body) || (ln.attachments.length ? `${ln.attachments.length} attachment(s)` : "") : "No notes yet";
                return (
                  <div
                    key={r.id}
                    onClick={() => openResearch(r.id)}
                    className={`grid ${COLS} cursor-pointer items-center gap-3 border-b border-border-subtle px-4 py-[9px] text-[13px] hover:bg-surface-hover!`}
                    style={{ background: checked ? "var(--selected)" : "transparent" }}
                  >
                    <div onClick={(e) => e.stopPropagation()} className="flex h-full items-center">
                      <input type="checkbox" checked={checked} onChange={() => t.toggle(r.id)} className="m-0 size-[15px] cursor-pointer accent-[var(--ink)]" />
                    </div>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{r.name}</span>
                      <span className="block truncate text-[12px] text-faint">{r.url ?? ""}</span>
                    </span>
                    <span className="truncate text-ink-2">{r.category || "—"}</span>
                    <span className="inline-flex items-center gap-1.5 text-md font-medium whitespace-nowrap" style={{ color: tone.fg }}>
                      <span className="size-[7px] shrink-0 rounded-full" style={{ background: tone.dot }} />
                      {r.status}
                    </span>
                    <span className="flex min-w-0 flex-nowrap items-center gap-1.5 overflow-hidden">
                      {r.projects.slice(0, 2).map((p) => (
                        <span
                          key={p.id}
                          className="inline-flex h-[22px] min-w-0 shrink items-center overflow-hidden rounded-xs bg-surface-muted px-2 text-[12px] text-ellipsis whitespace-nowrap text-ink-2"
                        >
                          {p.name}
                        </span>
                      ))}
                      <span className="shrink-0 text-[12px] whitespace-nowrap text-faint">{r.projects.length > 2 ? `+${r.projects.length - 2}` : ""}</span>
                      {!r.projects.length && <span className="text-fainter">—</span>}
                    </span>
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="min-w-0 flex-1 truncate" style={{ color: ln ? "var(--ink-3)" : "var(--fainter)" }}>
                        {lastNote}
                      </span>
                      <span className="text-[12px] whitespace-nowrap text-fainter">{ln ? rel(ln.created_at) : ""}</span>
                    </span>
                    <span className="text-right text-ink-3 tabular-nums">{r.notes.length}</span>
                  </div>
                );
              })}
              {!rows.length && <EmptyState icon="" size="sm" title="Nothing in this status" body="" />}
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          icon="flask"
          title="No research yet"
          body="Add software you want to study and link it to the projects it informs."
          actionLabel="+ Add software"
          onAction={addSoftware}
          bordered
        />
      )}

      {n > 0 && (
        <SelectionBar
          label={`${n} selected`}
          actions={[{ label: "Delete", onClick: () => setAsking(true) }]}
          asking={asking}
          askMessage={`Permanently delete ${n} item${n > 1 ? "s" : ""}?`}
          onCancel={() => setAsking(false)}
          onConfirm={() => {
            if (pending) return;
            const ids = t.selectedIds;
            startTransition(async () => {
              await deleteResearch(ids);
              setAsking(false);
              t.clear();
            });
          }}
          onClear={() => {
            setAsking(false);
            t.clear();
          }}
        />
      )}
    </div>
  );
}

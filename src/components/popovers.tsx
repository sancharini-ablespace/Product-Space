"use client";

// Popovers from design/PM Dashboard v3.dc.html: the people/POC picker (pk) and the date picker (dp).
import { useEffect, useState } from "react";
import { Avatar } from "@/components/hub/Avatar";
import { Button } from "@/components/hub/Button";
import type { Av } from "@/lib/hub";

/** Where a popover opens: the trigger's bounding box. */
export type Anchor = { x: number; right: number; top: number; bottom: number };

export const anchorOf = (el: Element): Anchor => {
  const r = el.getBoundingClientRect();
  return { x: r.left, right: r.right, top: r.top, bottom: r.bottom };
};

function useEsc(onClose: () => void) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  }, [onClose]);
}

// ---------------------------------------------------------------------------
// People / POC picker
// ---------------------------------------------------------------------------
export type PickerItem = { id: string; name: string; sub: string; av: Av; square?: boolean };

export function PeoplePicker({
  anchor,
  title,
  placeholder,
  items,
  selected,
  onToggle,
  onAddNew,
  onClose,
}: {
  anchor: Anchor;
  title: string;
  placeholder: string;
  items: PickerItem[];
  selected: string[];
  onToggle: (id: string, on: boolean) => void;
  /** POC pickers only: add the typed name as a new POC. */
  onAddNew?: (name: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  useEsc(onClose);
  const q2 = q.trim().toLowerCase();
  const list = items.filter((x) => !q2 || x.name.toLowerCase().includes(q2) || x.sub.toLowerCase().includes(q2));
  const canAdd = !!onAddNew && !!q2 && !items.some((x) => x.name.toLowerCase() === q2);
  const addNew = () => {
    if (!q.trim() || !onAddNew) return;
    onAddNew(q.trim());
    setQ("");
  };
  const H = 390;
  const left = Math.max(8, Math.min(anchor.x, window.innerWidth - 268));
  const top = anchor.bottom + H > window.innerHeight ? Math.max(8, anchor.top - H - 4) : anchor.bottom + 4;

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-[72]" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="fixed z-[73] flex w-[260px] flex-col gap-1 rounded-lg border border-border bg-surface p-1.5 shadow-pop"
        style={{ left, top }}
      >
        <div className="px-1.5 pt-1 pb-0.5 text-[11.5px] font-semibold tracking-[0.05em] text-faint uppercase">{title}</div>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (list[0]) onToggle(list[0].id, !selected.includes(list[0].id));
              else if (canAdd) addNew();
            }
          }}
          placeholder={placeholder}
          className="h-[30px] rounded-md border border-border-strong bg-surface px-2 text-md outline-none focus:border-faint"
        />
        <div className="max-h-[260px] overflow-auto">
          {list.map((x) => {
            const on = selected.includes(x.id);
            return (
              <button
                key={x.id}
                type="button"
                onClick={() => onToggle(x.id, !on)}
                className="flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-[5px] border-0 bg-transparent px-2 py-1 text-left text-ink hover:bg-surface-muted"
              >
                <Avatar av={x.av} size={22} square={x.square} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px]">{x.name}</span>
                  <span className="block truncate text-[11.5px] text-faint">{x.sub}</span>
                </span>
                <span
                  className="flex size-4 shrink-0 items-center justify-center rounded-[4px] border text-[10px] font-bold text-on-primary"
                  style={{
                    borderColor: on ? "var(--ink)" : "var(--border-strong)",
                    background: on ? "var(--ink)" : "var(--surface)",
                  }}
                >
                  {on ? "✓" : ""}
                </span>
              </button>
            );
          })}
          {!list.length && !canAdd && <div className="p-2 text-md text-faint">No matches.</div>}
        </div>
        {canAdd && (
          <button
            type="button"
            onClick={addNew}
            className="flex h-8 w-full cursor-pointer items-center rounded-b-[5px] border-0 border-t border-hover bg-transparent px-2 text-left text-md font-medium text-ink hover:bg-surface-muted"
          >
            + Add “{q.trim()}” as a new POC
          </button>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Date picker
// ---------------------------------------------------------------------------
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function DatePicker({
  anchor,
  value,
  onPick,
  onClose,
}: {
  anchor: Anchor;
  value: string | null;
  /** ISO date, or "" to clear. */
  onPick: (iso: string) => void;
  onClose: () => void;
}) {
  const today = new Date();
  const [ym, setYm] = useState(value ? value.slice(0, 7) : `${today.getFullYear()}-${pad(today.getMonth() + 1)}`);
  useEsc(onClose);
  const [yy, mm] = ym.split("-").map(Number) as [number, number];
  const first = new Date(yy, mm - 1, 1);
  const start = new Date(yy, mm - 1, 1 - ((first.getDay() + 6) % 7));
  const tIso = isoOf(today);
  const choose = (v: string) => {
    onPick(v);
    onClose();
  };
  const shift = (k: number) => {
    const x = new Date(yy, mm - 1 + k, 1);
    setYm(`${x.getFullYear()}-${pad(x.getMonth() + 1)}`);
  };
  const W = 252;
  const H = 300;
  const left = Math.max(8, Math.min(anchor.x, window.innerWidth - W - 8));
  const top = anchor.bottom + H > window.innerHeight ? Math.max(8, anchor.top - H - 4) : anchor.bottom + 4;
  const navBtn =
    "flex size-[26px] cursor-pointer items-center justify-center rounded-[5px] border-0 bg-transparent text-muted hover:bg-hover hover:text-ink";

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-[70]" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="fixed z-[71] w-[252px] rounded-lg border border-border bg-surface p-2.5 shadow-[0_10px_28px_var(--scrim)]"
        style={{ left, top }}
      >
        <div className="mb-1.5 flex items-center justify-between">
          <button type="button" onClick={() => shift(-1)} title="Previous month" className={navBtn}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M6.5 2 L3.5 5 L6.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="text-[13px] font-semibold">
            {MONTHS[mm - 1]} {yy}
          </span>
          <button type="button" onClick={() => shift(1)} title="Next month" className={navBtn}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M3.5 2 L6.5 5 L3.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 pt-0.5 pb-1 text-center text-[11px] font-medium text-fainter">
          {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: 42 }, (_, i) => {
            const x = new Date(start);
            x.setDate(start.getDate() + i);
            const k = isoOf(x);
            const sel = k === value;
            const inM = x.getMonth() === mm - 1;
            const isT = k === tIso;
            return (
              <button
                key={k}
                type="button"
                onClick={() => choose(k)}
                className={`h-[30px] cursor-pointer rounded-[5px] border p-0 text-md tabular-nums ${sel ? "hover:bg-ink!" : "hover:bg-hover!"}`}
                style={{
                  borderColor: isT && !sel ? "#cfcdc8" : "transparent",
                  background: sel ? "var(--ink)" : "transparent",
                  color: sel ? "#fff" : inM ? "var(--ink)" : "var(--disabled)",
                  fontWeight: sel || isT ? 600 : 400,
                }}
              >
                {x.getDate()}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between border-t border-hover pt-2">
          <Button label="Clear" variant="ghost" size="sm" onClick={() => choose("")} />
          <Button label="Today" variant="secondary" size="sm" onClick={() => choose(tIso)} />
        </div>
      </div>
    </>
  );
}

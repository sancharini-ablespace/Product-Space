"use client";

// design/Tabs.dc.html — page tabs with counts.
import { useState } from "react";

export type TabItem = { label: string; count?: string | number; active?: boolean; go?: () => void };

const DEFAULT_ITEMS: TabItem[] = [
  { label: "Overview" },
  { label: "Versions", count: 2 },
  { label: "Features", count: 5 },
  { label: "Activity" },
];

export function Tabs({ items = DEFAULT_ITEMS }: { items?: TabItem[] }) {
  const [local, setLocal] = useState(0);
  const hasActive = items.some((t) => t.active);
  return (
    <div className="flex gap-[22px] border-b border-border">
      {items.map((t, i) => {
        const a = hasActive ? !!t.active : i === local;
        return (
          <button
            key={t.label}
            type="button"
            onClick={t.go ?? (() => setLocal(i))}
            className="-mb-px flex cursor-pointer items-center gap-1.5 border-0 border-b-2 border-solid bg-transparent py-2 text-lg font-medium hover:text-ink!"
            style={{ borderBottomColor: a ? "var(--ink)" : "transparent", color: a ? "var(--ink)" : "var(--muted)" }}
          >
            {t.label}
            <span className="text-sm text-fainter">{t.count ?? ""}</span>
          </button>
        );
      })}
    </div>
  );
}

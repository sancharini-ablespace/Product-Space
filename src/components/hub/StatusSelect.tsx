"use client";

// design/StatusSelect.dc.html
import { useState } from "react";
import { ST_TONE } from "@/lib/hub";
import { SelectChevron } from "./icons";

export type StatusKind = "feature" | "version" | "project";

const OPTIONS: Record<StatusKind, string[]> = {
  feature: ["Planned", "In Progress", "Blocked", "Completed"],
  version: ["Planned", "In Progress", "Completed"],
  project: ["Planned", "Active", "Completed"],
};

export function StatusSelect({
  value,
  kind = "feature",
  onChange,
}: {
  value?: string;
  kind?: StatusKind;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  const [local, setLocal] = useState<string | null>(null);
  const v = value ?? local ?? "Planned";
  const t = ST_TONE[v] || "gray";
  const fg = `var(--tone-${t}-fg)`;
  return (
    <span onClick={(e) => e.stopPropagation()} className="relative inline-flex items-center">
      <select
        value={v}
        onChange={onChange ?? ((e) => setLocal(e.target.value))}
        className="cursor-pointer appearance-none rounded-xs border-0 py-[3px] pr-5 pl-2 text-sm font-medium outline-none"
        style={{ background: `var(--tone-${t}-bg)`, color: fg }}
      >
        {OPTIONS[kind].map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <SelectChevron color={fg} />
    </span>
  );
}

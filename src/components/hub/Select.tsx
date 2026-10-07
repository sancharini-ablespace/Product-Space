"use client";

// design/Select.dc.html
import { useState } from "react";

export type SelectOption = { v: string; l: string };

const DEFAULT_OPTIONS: SelectOption[] = [
  { v: "", l: "Choose…" },
  { v: "a", l: "Option A" },
  { v: "b", l: "Option B" },
];

export function Select({
  value,
  options = DEFAULT_OPTIONS,
  onChange,
  size = "md",
  variant = "default",
  muted,
  block,
  width = "auto",
  maxWidth = "100%",
  title,
}: {
  value?: string;
  options?: SelectOption[];
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  size?: "md" | "sm";
  variant?: "default" | "active" | "dashed";
  muted?: boolean;
  block?: boolean;
  width?: string;
  maxWidth?: string;
  title?: string;
}) {
  const [local, setLocal] = useState<string | null>(null);
  const sm = size === "sm";
  const active = variant === "active";
  const isMuted = muted || variant === "dashed";
  return (
    <span
      onClick={(e) => e.stopPropagation()}
      className="relative min-w-0 items-center"
      style={{ display: block ? "flex" : "inline-flex", width: block ? "100%" : width, maxWidth }}
    >
      <select
        value={value ?? local ?? ""}
        onChange={onChange ?? ((e) => setLocal(e.target.value))}
        title={title || undefined}
        className="w-full min-w-0 cursor-pointer appearance-none overflow-hidden text-ellipsis rounded-md border pr-7 pl-2.5 outline-none hover:border-border-hover!"
        style={{
          height: sm ? 30 : 34,
          borderStyle: variant === "dashed" ? "dashed" : "solid",
          borderColor: active ? "var(--faint)" : "var(--border-strong)",
          background: active ? "var(--border-subtle)" : "var(--surface)",
          fontSize: sm ? "var(--fs-base)" : "var(--fs-lg)",
          fontWeight: active ? 500 : 400,
          color: isMuted ? "var(--muted)" : "var(--ink)",
        }}
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
      <svg
        width="10"
        height="6"
        viewBox="0 0 10 6"
        className="pointer-events-none absolute top-1/2 right-[11px] -mt-[3px] text-faint"
      >
        <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

// design/StatusPill.dc.html
import type { ToneName } from "@/lib/hub";

const TONE: Record<string, ToneName> = {
  Planned: "gray",
  Todo: "gray",
  "In Progress": "blue",
  Active: "blue",
  Blocked: "red",
  Done: "green",
  Completed: "green",
  High: "red",
  Medium: "amber",
  Low: "gray",
};

export function StatusPill({ value = "Planned", tone }: { value?: string; tone?: ToneName | "" }) {
  const t = tone || TONE[value] || "gray";
  return (
    <span
      className="inline-flex h-5 items-center gap-1.5 whitespace-nowrap rounded-xs px-2 text-sm font-medium"
      style={{ background: `var(--tone-${t}-bg)`, color: `var(--tone-${t}-fg)` }}
    >
      <span className="size-1.5 rounded-full" style={{ background: `var(--tone-${t}-dot)` }} />
      {value}
    </span>
  );
}

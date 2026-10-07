// Shared display helpers ported from the script in design/PM Dashboard v3.dc.html.

export type Av = { i: string; bg: string; fg: string; name?: string; square?: boolean };

/** Initials avatar on a hashed OKLCH colour (prototype `av()`). */
export function av(n: string | null | undefined): Av {
  if (!n) return { i: "", bg: "#eee", fg: "#999" };
  let h = 0;
  for (const c of n) h = (h * 31 + c.charCodeAt(0)) % 360;
  return { i: n[0]!.toUpperCase(), bg: `oklch(0.92 0.04 ${h})`, fg: `oklch(0.42 0.09 ${h})`, name: n };
}

// ---------------------------------------------------------------------------
// Tones
// ---------------------------------------------------------------------------
export type ToneName = "gray" | "blue" | "green" | "amber" | "red";
export type Tone = { bg: string; fg: string; dot: string };

const tk = (n: ToneName): Tone => ({
  bg: `var(--tone-${n}-bg)`,
  fg: `var(--tone-${n}-fg)`,
  dot: `var(--tone-${n}-dot)`,
});

export const T: Record<ToneName, Tone> = {
  green: tk("green"),
  amber: tk("amber"),
  red: tk("red"),
  blue: tk("blue"),
  gray: tk("gray"),
};

export const ST_TONE: Record<string, ToneName> = {
  Planned: "gray",
  "In Progress": "blue",
  Active: "blue",
  Blocked: "red",
  Completed: "green",
};

export const PRI_TONE: Record<string, ToneName> = { High: "red", Medium: "amber", Low: "gray" };

export const ACT_TONE: Record<string, ToneName> = {
  completed: "green",
  confidence: "amber",
  assigned: "blue",
  feature: "blue",
  due: "gray",
  note: "gray",
  status: "gray",
};

/** Confidence colour thresholds (prototype `confHigh` / `confLow` defaults). */
export const CONF_HIGH = 70;
export const CONF_LOW = 50;

export function confTone(c: number, hi = CONF_HIGH, lo = CONF_LOW): ToneName {
  return c >= hi ? "green" : c >= lo ? "amber" : "red";
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Oct 18" from an ISO date or timestamp; "—" when empty. */
export function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${MON[m! - 1]} ${d}`;
}

export function today0(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

/** Whole days from today to an ISO date (negative when past). */
export function days(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round((new Date(y!, m! - 1, d).getTime() - today0().getTime()) / 864e5);
}

/** "just now", "5m ago", "3h ago", "2d ago", then "Oct 18". */
export function rel(ts: string): string {
  const m = (Date.now() - new Date(ts).getTime()) / 6e4;
  if (m < 1) return "just now";
  if (m < 60) return Math.floor(m) + "m ago";
  if (m < 1440) return Math.floor(m / 60) + "h ago";
  if (m < 10080) return Math.floor(m / 1440) + "d ago";
  return fmt(new Date(ts).toISOString());
}

// ---------------------------------------------------------------------------
// People, POCs and feature ordering (prototype avd / cav / sortF)
// ---------------------------------------------------------------------------
export const memberName = (m: { name: string | null; email: string }) => m.name ?? m.email;

/** Avatar for a team member. */
export const memberAv = (m: { name: string | null; email: string }): Av => av(memberName(m));

/** Square avatar for a customer POC: colour from the organisation, two-letter initials. */
export function pocAv(c: { name: string; org: string | null }): Av {
  const x = av(c.org || c.name);
  const pp = c.name.trim().split(/\s+/);
  return { ...x, i: ((pp[0] || "?")[0]! + (pp[1] ? pp[1][0] : "")).toUpperCase(), name: c.name, square: true };
}

const ORD: Record<string, number> = { Blocked: 0, "In Progress": 1, Planned: 2, Completed: 3 };
const PRI_ORDER = ["High", "Medium", "Low"];

/** Blocked → In Progress → Planned → Completed, then by priority. */
export function sortFeatures<F extends { status: string; priority: string }>(fs: F[]): F[] {
  return [...fs].sort(
    (x, y) => ORD[x.status]! - ORD[y.status]! || PRI_ORDER.indexOf(x.priority) - PRI_ORDER.indexOf(y.priority),
  );
}

/** Target-date colour (prototype tgtColor). */
export function targetColor(target: string | null | undefined, featureCompleted = false): string {
  if (!target) return "#a3a19b";
  if (featureCompleted) return "var(--faint)";
  const n = days(target);
  return n < 0 ? T.red.fg : n <= 14 ? T.amber.fg : "var(--ink-2)";
}

// ---------------------------------------------------------------------------
// Attachments (same formatting as NoteThread's pending chips)
// ---------------------------------------------------------------------------
export const fileSize = (b: number) =>
  b < 1024 ? b + " B" : b < 1048576 ? Math.round(b / 1024) + " KB" : (b / 1048576).toFixed(1) + " MB";

export const fileExt = (n: string) => {
  const m = /\.([a-z0-9]{1,5})$/i.exec(n || "");
  return (m ? m[1]! : "file").toUpperCase();
};

// ---------------------------------------------------------------------------
// Research (prototype RS_TONE / stripMd)
// ---------------------------------------------------------------------------
export const RS_TONE: Record<string, { dot: string; fg: string }> = {
  "To research": { dot: "#b4b2ac", fg: "var(--ink-3)" },
  Researching: { dot: "oklch(0.72 0.14 70)", fg: "oklch(0.5 0.1 70)" },
  Reviewed: { dot: "oklch(0.66 0.13 150)", fg: "oklch(0.45 0.1 150)" },
};

/** A note's markdown-lite text as one plain line (lines joined with " · "). */
export const stripMd = (t: string) =>
  (t || "")
    .replace(/\*\*|~~|`|_/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[-*•]\s+/gm, "")
    .split("\n")
    .filter(Boolean)
    .join(" · ");

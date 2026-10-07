// Explicit input checks for server actions. Each throws ValidationError with a
// user-facing message; actions catch it and return { error }.

export class ValidationError extends Error {}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function uuid(v: unknown, what = "id"): string {
  if (typeof v !== "string" || !UUID_RE.test(v)) throw new ValidationError(`Invalid ${what}.`);
  return v;
}

export function uuids(v: unknown, what = "ids"): string[] {
  if (!Array.isArray(v) || !v.length) throw new ValidationError(`Nothing selected.`);
  return v.map((x) => uuid(x, what));
}

/** Required trimmed text. */
export function text(v: unknown, label: string, max = 200): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) throw new ValidationError(`${label} is required.`);
  if (s.length > max) throw new ValidationError(`${label} is too long.`);
  return s;
}

/** Optional text: empty becomes null. */
export function optText(v: unknown, label: string, max = 5000): string | null {
  if (v == null) return null;
  if (typeof v !== "string") throw new ValidationError(`Invalid ${label.toLowerCase()}.`);
  const s = v.trim();
  if (s.length > max) throw new ValidationError(`${label} is too long.`);
  return s || null;
}

export function oneOf<T extends string>(v: unknown, options: readonly T[], label: string): T {
  if (typeof v !== "string" || !options.includes(v as T)) throw new ValidationError(`Invalid ${label.toLowerCase()}.`);
  return v as T;
}

/** Optional YYYY-MM-DD date: empty becomes null. */
export function optDate(v: unknown, label: string): string | null {
  if (v == null || v === "") return null;
  if (typeof v !== "string" || !DATE_RE.test(v) || Number.isNaN(Date.parse(v))) {
    throw new ValidationError(`Invalid ${label.toLowerCase()}.`);
  }
  return v;
}

/** Whole number clamped to [min, max] (the prototype clamps confidence the same way). */
export function clampInt(v: unknown, min: number, max: number, label: string): number {
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  if (!Number.isFinite(n)) throw new ValidationError(`Invalid ${label.toLowerCase()}.`);
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function bool(v: unknown, label: string): boolean {
  if (typeof v !== "boolean") throw new ValidationError(`Invalid ${label.toLowerCase()}.`);
  return v;
}

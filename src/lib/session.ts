import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getProfile } from "./queries";
import type { User } from "./types";

export type SessionUser = { id: string; email: string; name: string | null };

/** The user id carried by the session cookie (no database read). Deduped per request. */
const sessionUserId = cache(async (): Promise<string | null> => (await auth())?.user?.id ?? null);

/**
 * The signed-in user's row. One read per request, shared by the session check and the
 * profile (layout, dashboard, profile page). A failed read counts as signed out, as before.
 */
const accountRow = cache(async (id: string): Promise<User | null> => getProfile(id).catch(() => null));

/**
 * The signed-in user, or null. Checks the database too, so a deleted account
 * loses access on its next request. Deduped per request.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const id = await sessionUserId();
  if (!id) return null;
  const row = await accountRow(id);
  return row ? { id: row.id, email: row.email, name: row.name } : null;
});

/** Returns the signed-in user or redirects to /login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** The signed-in user's full profile row (same read as requireUser) or a redirect to /login. */
export async function requireProfile(): Promise<User> {
  const user = await requireUser();
  return (await accountRow(user.id))!;
}

/**
 * Like requireUser, but starts `load` straight away instead of after the account check,
 * so the two run concurrently. `load` gets the session's user id. Its result is only
 * returned once the check has passed: a signed-out or removed account still redirects to
 * /login (and that wins over any error from `load`), and nothing loaded is exposed.
 */
export async function requireUserWith<T>(load: (userId: string) => Promise<T>): Promise<[SessionUser, T]> {
  const id = await sessionUserId();
  if (!id) redirect("/login");
  // Via a resolved promise so a synchronous throw in `load` (e.g. input validation) is held too.
  const pending = Promise.resolve(id).then(load).then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );
  const user = await requireUser();
  const res = await pending;
  if (!res.ok) throw res.error;
  return [user, res.value];
}

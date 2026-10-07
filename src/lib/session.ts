import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "./supabase";

export type SessionUser = { id: string; email: string; name: string | null };

/**
 * The signed-in user, or null. Checks the database too, so a deleted account
 * loses access on its next request. Deduped per request.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const { data } = await db().from("users").select("id, email, name").eq("id", id).maybeSingle();
  return data;
});

/** Returns the signed-in user or redirects to /login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

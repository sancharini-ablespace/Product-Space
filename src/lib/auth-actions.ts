"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import {
  allowedDomain,
  findAccount,
  hashPassword,
  isAdminEmail,
  isAllowedEmail,
  meetsPasswordRules,
  normalizeEmail,
} from "./accounts";
import { db } from "./supabase";

export type FormState = { error?: string } | undefined;

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "");

/** Only same-site paths ("/x", not "//evil.com"). */
function safeRedirect(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function signInWithPassword(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").trim();
  const password = str(fd, "password");
  if (!email || !password) return { error: "Enter your email and password." };
  try {
    await signIn("credentials", { email, password, redirectTo: safeRedirect(str(fd, "callbackUrl")) });
  } catch (err) {
    if (err instanceof AuthError) return { error: "Incorrect email or password." };
    throw err; // includes the redirect on success
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

/** First-time setup for invited emails (or ADMIN_EMAILS when bootstrapping). */
export async function setUpAccount(_: FormState, fd: FormData): Promise<FormState> {
  const email = normalizeEmail(str(fd, "email"));
  const name = str(fd, "name").trim();
  const password = str(fd, "password");

  if (!email) return { error: "Enter your email." };
  if (!name) return { error: "Enter your name." };
  if (name.length > 100) return { error: "Name is too long." };
  if (!meetsPasswordRules(password)) {
    return { error: "Password must be at least 8 characters and contain a number." };
  }
  if (password !== str(fd, "confirm")) return { error: "Passwords don't match." };
  if (!isAllowedEmail(email)) return { error: `Use your @${allowedDomain} email.` };

  const account = await findAccount(email);
  if (account?.password_hash) return { error: "This account is already set up. Sign in instead." };
  if (!account && !isAdminEmail(email)) {
    return { error: "This email hasn't been invited yet. Ask a teammate to invite you." };
  }

  // A member whose password a teammate reset keeps their activation date and role title;
  // only a first-time setup copies the role picked when inviting into the role title.
  const firstSetup = !account?.activated_at;
  const fields = {
    name,
    password_hash: await hashPassword(password),
    ...(firstSetup ? { activated_at: new Date().toISOString() } : {}),
    ...(firstSetup && account?.invite_role ? { role_title: account.invite_role } : {}),
  };
  const { error } = account
    ? await db().from("users").update(fields).eq("id", account.id).is("password_hash", null)
    : await db().from("users").insert({ email, ...fields });
  if (error) return { error: "Could not set up your account. Please try again." };

  await signIn("credentials", { email, password, redirectTo: "/" });
}

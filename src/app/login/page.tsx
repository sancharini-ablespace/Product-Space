import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in · Product Hub" };

/** Reduce Auth.js's absolute callbackUrl to a same-site path (prevents open redirects). */
function safePath(value: string | string[] | undefined) {
  if (typeof value !== "string") return "/";
  try {
    const url = new URL(value, "http://local");
    return `${url.pathname}${url.search}`;
  } catch {
    return "/";
  }
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const target = safePath((await searchParams).callbackUrl);
  if (await getCurrentUser()) redirect(target);
  return <LoginForm callbackUrl={target} />;
}

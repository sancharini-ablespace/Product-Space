import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SetupForm } from "@/components/auth-forms";
import { allowedDomain } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Set up account · Product Hub" };

export default async function SetupPage() {
  if (await getCurrentUser()) redirect("/");
  return <SetupForm domain={allowedDomain} />;
}

// Profile — design/PM Dashboard v3.dc.html (isProfile): Profile, Security, Team.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileView, type ProfileTab } from "@/components/profile-view";
import { getProfile, listTeam, teamCounts } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Profile · Product Hub" };
const TABS: ProfileTab[] = ["profile", "security", "team"];

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const me = await requireUser();
  const sp = await searchParams;
  const [profile, team, counts] = await Promise.all([getProfile(me.id), listTeam(), teamCounts()]);
  if (!profile) notFound();
  const tab = TABS.includes(sp.tab as ProfileTab) ? (sp.tab as ProfileTab) : "profile";
  return <ProfileView profile={profile} team={team} counts={counts} initialTab={tab} />;
}

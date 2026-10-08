// Profile — design/PM Dashboard v3.dc.html (isProfile): Profile, Security, Team.
import type { Metadata } from 'next';
import { ProfileView, type ProfileTab } from '@/components/profile-view';
import { listTeam, teamCounts } from '@/lib/queries';
import { requireProfile, requireUserWith } from '@/lib/session';

export const metadata: Metadata = { title: 'Profile · Product Hub' };
const TABS: ProfileTab[] = ['profile', 'security', 'team'];

export default async function ProfilePage({ searchParams }: PageProps<'/profile'>) {
  const sp = await searchParams;
  const [, [team, counts]] = await requireUserWith(() => Promise.all([listTeam(), teamCounts()]));
  const profile = await requireProfile();
  const tab = TABS.includes(sp.tab as ProfileTab) ? (sp.tab as ProfileTab) : 'profile';
  return <ProfileView profile={profile} team={team} counts={counts} initialTab={tab} />;
}

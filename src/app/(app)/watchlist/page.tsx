// Watchlist — design/PM Dashboard v3.dc.html (isWatch).
import type { Metadata } from 'next';
import { WatchlistView } from '@/components/watchlist-view';
import { listFeatures } from '@/lib/queries';
import { requireUserWith } from '@/lib/session';

export const metadata: Metadata = { title: 'Watchlist · Product Hub' };

export default async function WatchlistPage() {
  const [me, features] = await requireUserWith((uid) => listFeatures({ watcherId: uid, archived: false }));
  return <WatchlistView features={features} me={{ id: me.id, name: me.name ?? me.email }} />;
}

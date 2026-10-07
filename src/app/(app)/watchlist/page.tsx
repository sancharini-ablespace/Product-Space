// Watchlist — design/PM Dashboard v3.dc.html (isWatch).
import type { Metadata } from "next";
import { WatchlistView } from "@/components/watchlist-view";
import { listFeatures } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Watchlist · Product Hub" };

export default async function WatchlistPage() {
  const me = await requireUser();
  const features = await listFeatures({ watcherId: me.id, archived: false });
  return <WatchlistView features={features} me={{ id: me.id, name: me.name ?? me.email }} />;
}

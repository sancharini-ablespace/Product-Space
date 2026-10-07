// POCs — design/PM Dashboard v3.dc.html (isPocs).
import type { Metadata } from "next";
import { PocsView } from "@/components/poc/pocs-view";
import { listPocs } from "@/lib/queries";

export const metadata: Metadata = { title: "POCs · Product Hub" };

export default async function PocsPage() {
  const pocs = await listPocs();
  // Prototype linkedN: active features with at least one POC.
  const linked = new Set(pocs.flatMap((c) => c.features.map((f) => f.id))).size;
  return <PocsView pocs={pocs} linkedFeatures={linked} />;
}

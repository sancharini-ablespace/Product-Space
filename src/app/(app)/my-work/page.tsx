// My work — design/PM Dashboard v3.dc.html (isMine). Reached from the dashboard's "My features" card.
import type { Metadata } from "next";
import { MyWorkView } from "@/components/my-work-view";
import { listFeatures } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "My work · Product Hub" };

export default async function MyWorkPage() {
  const me = await requireUser();
  const features = await listFeatures({ ownerId: me.id, archived: false });
  return <MyWorkView features={features} meName={me.name ?? me.email} />;
}

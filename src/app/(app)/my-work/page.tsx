// My work — design/PM Dashboard v3.dc.html (isMine). Reached from the dashboard's "My features" card.
import type { Metadata } from "next";
import { MyWorkView } from "@/components/my-work-view";
import { listFeatures } from "@/lib/queries";
import { requireUserWith } from "@/lib/session";

export const metadata: Metadata = { title: "My work · Product Hub" };

export default async function MyWorkPage() {
  const [me, features] = await requireUserWith((uid) => listFeatures({ ownerId: uid, archived: false }));
  return <MyWorkView features={features} meName={me.name ?? me.email} />;
}

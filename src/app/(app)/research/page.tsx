// Research — design/PM Dashboard v3.dc.html (isResearch).
import type { Metadata } from "next";
import { ResearchView } from "@/components/research/research-view";
import { listResearch } from "@/lib/queries";

export const metadata: Metadata = { title: "Research · Product Hub" };

export default async function ResearchPage() {
  return <ResearchView items={await listResearch()} />;
}

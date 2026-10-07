// Features — design/PM Dashboard v3.dc.html (isFeatures).
import type { Metadata } from "next";
import { FeaturesView } from "@/components/feature/features-view";
import { listFeatures, listMembers, listPocOptions, listProjects, listSavedFilters, listVersionOptions } from "@/lib/queries";
import { requireUserWith } from "@/lib/session";

export const metadata: Metadata = { title: "Features · Product Hub" };

export default async function FeaturesPage() {
  const [me, [features, members, pocOptions, projects, versions, savedFilters]] = await requireUserWith(() =>
    Promise.all([
      // Archived features are left out here; they're reached from a project's Features tab.
      listFeatures({ archived: false }),
      listMembers(),
      listPocOptions(),
      listProjects(),
      listVersionOptions(),
      listSavedFilters(),
    ]),
  );
  return (
    <FeaturesView
      features={features}
      members={members}
      pocOptions={pocOptions}
      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      versions={versions}
      savedFilters={savedFilters}
      meId={me.id}
    />
  );
}

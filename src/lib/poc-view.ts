import "server-only";
import { getPoc, listFeatures, listProjectOptions, type PocRow } from "./queries";

/** Everything the POC drawer shows (design/PM Dashboard v3.dc.html, isPocDrawer). */
export type PocDrawerData = {
  poc: PocRow;
  /** All projects, for "+ Link a project". */
  projects: { id: string; name: string; description: string | null }[];
  /** Active features, for "+ Link a feature". */
  features: { id: string; name: string; projectName: string }[];
};

export async function loadPocDrawer(id: string): Promise<PocDrawerData | null> {
  const [poc, projects, features] = await Promise.all([getPoc(id), listProjectOptions(), listFeatures({ archived: false })]);
  if (!poc) return null;
  return {
    poc,
    projects: projects.map((p) => ({ id: p.id, name: p.name, description: null })),
    features: features.map((f) => ({ id: f.id, name: f.name, projectName: f.version?.project.name ?? "No project" })),
  };
}

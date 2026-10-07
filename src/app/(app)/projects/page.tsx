// Projects — design/PM Dashboard v3.dc.html (isProjects); empty state from PM Dashboard v31.dc.html.
import type { Metadata } from "next";
import { EmptyState } from "@/components/hub/EmptyState";
import { NewButton } from "@/components/new-button";
import { ProjectsTable, type ProjectListRow } from "@/components/projects-table";
import { active, currentVersion, progress } from "@/lib/derive";
import { fmt } from "@/lib/hub";
import { listMembers, listProjects } from "@/lib/queries";
import { requireUserWith } from "@/lib/session";

export const metadata: Metadata = { title: "Projects · Product Hub" };

export default async function ProjectsPage() {
  const [me, [projects, members]] = await requireUserWith(() => Promise.all([listProjects(), listMembers()]));
  const activeCount = projects.filter((p) => p.status === "Active").length;

  const rows: ProjectListRow[] = projects.map((p) => {
    const cur = currentVersion(p.versions);
    return {
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      status: p.status,
      cur: cur ? { num: cur.num, name: cur.name, target: fmt(cur.target_date), confidence: cur.confidence } : null,
      prog: cur ? progress(active(cur.features)) : 0,
      owners: p.owners,
    };
  });

  return (
    <div className="flex max-w-[1320px] flex-col gap-4 px-[clamp(16px,4vw,32px)] pt-6 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 text-[20px] font-semibold tracking-[-0.015em]">Projects</h1>
          <div className="mt-1 text-[13px] text-muted">
            {projects.length} projects · {activeCount} active
          </div>
        </div>
        <NewButton label="+ New project" href="/projects?new=project" />
      </div>
      {projects.length ? (
        <ProjectsTable projects={rows} members={members} meId={me.id} />
      ) : (
        <EmptyState
          icon="folder"
          title="No projects yet"
          body="A project holds versions, each with its own target date, features and ship confidence."
          actionLabel="+ New project"
          actionHref="/projects?new=project"
          bordered
        />
      )}
    </div>
  );
}

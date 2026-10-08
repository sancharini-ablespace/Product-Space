// Project page — design/PM Dashboard v3.dc.html (isProject).
import { notFound } from 'next/navigation';
import { ProjectView } from '@/components/project/project-view';
import type { ProjectTab, ProjectViewData } from '@/components/project/types';
import { ACT_TONE, T, memberAv, memberName, rel } from '@/lib/hub';
import { threadNotes } from '@/lib/note-view';
import { getProject, listActivity, listMembers, listPocOptions } from '@/lib/queries';
import { requireUserWith } from '@/lib/session';

const TABS: ProjectTab[] = ['overview', 'versions', 'features', 'activity'];
const UUID_RE = /^[0-9a-f-]{36}$/i;

export default async function ProjectPage({ params, searchParams }: PageProps<'/projects/[id]'>) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const sp = await searchParams;
  const [me, [project, activity, members, pocOptions]] = await requireUserWith(() =>
    Promise.all([getProject(id), listActivity({ projectId: id, limit: 500 }), listMembers(), listPocOptions()]),
  );
  if (!project) notFound();

  const toNotes = await threadNotes([project.notes, ...project.versions.map((v) => v.notes)]);
  const data: ProjectViewData = {
    project: {
      id: project.id,
      name: project.name,
      description: project.description ?? '',
      status: project.status,
      owners: project.owners,
      pocs: project.pocs,
    },
    versions: project.versions.map((v) => ({
      id: v.id,
      num: v.num,
      name: v.name,
      description: v.description ?? '',
      status: v.status,
      target_date: v.target_date,
      confidence: v.confidence,
      history: v.history.map((h) => ({
        id: h.id,
        from: h.from_value,
        to: h.to_value,
        by: h.by ? memberName(h.by) : '',
        date: h.created_at,
        reason: h.reason,
      })),
      notes: toNotes(v.notes),
    })),
    features: project.features,
    archived: project.archivedFeatures,
    notes: toNotes(project.notes),
    activity: activity.map((a) => ({
      id: a.id,
      who: a.actor ? memberName(a.actor) : '',
      text: a.text,
      when: rel(a.created_at),
      dot: T[ACT_TONE[a.type] || 'gray'].dot,
      featureId: a.feature_id,
    })),
  };

  const tab = typeof sp.tab === 'string' && TABS.includes(sp.tab as ProjectTab) ? (sp.tab as ProjectTab) : 'overview';
  const version = typeof sp.version === 'string' ? sp.version : null;
  const meName = me.name ?? me.email;

  return (
    <ProjectView
      // Remount when navigation asks for a different project/tab/version (e.g. after creating a
      // version), so the requested tab and expanded version apply. Tab clicks only replace the URL.
      key={`${project.id}|${version ? 'versions' : tab}|${version ?? ''}`}
      data={data}
      members={members}
      pocOptions={pocOptions}
      me={{ id: me.id, name: meName, av: memberAv(me) }}
      initialTab={version ? 'versions' : tab}
      initialVersion={version}
    />
  );
}

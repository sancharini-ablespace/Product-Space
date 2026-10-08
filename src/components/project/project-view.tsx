'use client';

// Project page — design/PM Dashboard v3.dc.html (isProject): header, meta row,
// tabs (Overview / Versions / Features / Activity), pickers and project delete.
import { useOptimistic, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DeleteProjectsDialog } from '@/components/delete-projects-dialog';
import { DeleteFeaturesDialog } from '@/components/feature/delete-features-dialog';
import {
  FeaturePicker,
  memberItems as memberPickerItems,
  pocItems as pocPickerItems,
} from '@/components/feature/feature-picker';
import { FeatureRowMenu } from '@/components/feature/row-menu';
import { openFeature } from '@/components/feature/url';
import { AvatarStack } from '@/components/hub/AvatarStack';
import { Button } from '@/components/hub/Button';
import { EmptyState } from '@/components/hub/EmptyState';
import { StatusPill } from '@/components/hub/StatusPill';
import { StatusSelect } from '@/components/hub/StatusSelect';
import { Tabs } from '@/components/hub/Tabs';
import { LiveNoteThread } from '@/components/live-note-thread';
import { DatePicker, PeoplePicker, anchorOf, type Anchor } from '@/components/popovers';
import {
  createPoc,
  setFeatureLink,
  setFeaturesArchived,
  setProjectLink,
  updateFeature,
  updateProject,
  updateVersion,
} from '@/lib/actions';
import { currentVersion, progress } from '@/lib/derive';
import { T, confTone, fmt, memberAv, memberName, pocAv } from '@/lib/hub';
import type { FeatureRow } from '@/lib/queries';
import type { FeatureStatus, Member, Poc, Priority, VersionStatus } from '@/lib/types';
import { ProjectFeatures } from './project-features';
import { ProjectVersions, VersionDescription } from './project-versions';
import type { PickerKind, ProjectHandlers, ProjectTab, ProjectViewData, VersionView } from './types';

type TeamMember = Member & { role_title: string | null };
type PocOption = Pick<Poc, 'id' | 'name' | 'org' | 'role'>;

type Change =
  | { kind: 'project'; patch: Partial<ProjectViewData['project']> }
  | { kind: 'version'; id: string; patch: Partial<VersionView> }
  | { kind: 'feature'; id: string; patch: Partial<FeatureRow> };

function reduce(d: ProjectViewData, c: Change): ProjectViewData {
  if (c.kind === 'project') return { ...d, project: { ...d.project, ...c.patch } };
  if (c.kind === 'version')
    return { ...d, versions: d.versions.map((v) => (v.id === c.id ? { ...v, ...c.patch } : v)) };
  const upd = (fs: FeatureRow[]) => fs.map((f) => (f.id === c.id ? { ...f, ...c.patch } : f));
  return { ...d, features: upd(d.features), archived: upd(d.archived) };
}

const label11 = 'text-[11px] font-medium tracking-[0.05em] text-faint uppercase';
const metaBtn =
  'flex h-[26px] cursor-pointer items-center gap-1.5 rounded-sm border border-transparent bg-transparent text-[13px] font-medium hover:border-border-strong hover:bg-surface';

export function ProjectView({
  data: serverData,
  members,
  pocOptions,
  me,
  initialTab,
  initialVersion,
}: {
  data: ProjectViewData;
  members: TeamMember[];
  pocOptions: PocOption[];
  me: { id: string; name: string; av: ProjectHandlers['me']['av'] };
  initialTab: ProjectTab;
  initialVersion: string | null;
}) {
  const router = useRouter();
  const [data, apply] = useOptimistic(serverData, reduce);
  const [, startTransition] = useTransition();
  const { project: p, versions, features } = data;
  const allFeatures = [...features, ...data.archived];

  const cur = currentVersion(versions);
  const [tab, setTabState] = useState<ProjectTab>(initialTab);
  const [exp, setExp] = useState<Record<string, boolean>>(() => {
    const v = initialVersion ?? cur?.id;
    return v ? { [v]: true } : {};
  });
  const [picker, setPicker] = useState<{ kind: 'owners' | 'pocs'; anchor: Anchor } | null>(null);
  const [featurePicker, setFeaturePicker] = useState<{ id: string; kind: PickerKind; anchor: Anchor } | null>(null);
  const [menu, setMenu] = useState<{ id: string; anchor: Anchor } | null>(null);
  const [deletingFeatures, setDeletingFeatures] = useState<FeatureRow[] | null>(null);
  const [datePick, setDatePick] = useState<{ versionId: string; anchor: Anchor } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const mutate = (change: Change, run: () => Promise<unknown>) =>
    startTransition(async () => {
      apply(change);
      await run();
    });

  function setTab(t: ProjectTab, query = '') {
    setTabState(t);
    window.history.replaceState(null, '', `/projects/${p.id}?tab=${t}${query}`);
  }

  const featsOfV = (vid: string) => features.filter((f) => f.version_id === vid);
  const sorted = [...versions].sort((a, b) => a.num - b.num);
  const next = cur ? sorted.find((v) => v.num > cur.num && v.status !== 'Completed') : undefined;
  const openCount = features.filter((f) => f.status !== 'Completed').length;
  const cf = T[confTone(cur?.confidence ?? 0)];

  const addVersion = () => router.push(`/projects/${p.id}?tab=${tab}&new=version&parent=${p.id}`, { scroll: false });

  const handlers: ProjectHandlers = {
    me,
    openFeature,
    addFeature: (vid) => router.push(`/projects/${p.id}?tab=${tab}&new=feature&parent=${vid}`, { scroll: false }),
    addFeatureHere: () => router.push(`/projects/${p.id}?tab=${tab}&new=feature`, { scroll: false }),
    setFeature: (id, patch) =>
      mutate({ kind: 'feature', id, patch: patch as Partial<FeatureRow> }, () => updateFeature(id, patch)),
    openFeaturePicker: (id, kind, anchor) => setFeaturePicker({ id, kind, anchor }),
    openMenu: (id, anchor) => setMenu({ id, anchor }),
    menuFor: menu?.id ?? null,
    setVersion: (id, patch) =>
      mutate({ kind: 'version', id, patch: patch as Partial<VersionView> }, () => updateVersion(id, patch)),
    openTargetPicker: (id, anchor) => setDatePick({ versionId: id, anchor }),
  };

  const openVersion = (vid: string) => {
    setExp((e) => ({ ...e, [vid]: true }));
    setTab('versions', `&version=${vid}`);
  };

  // ---------------------------------------------------------------------------
  // Pickers (project owners/POCs, feature owners/watchers/POCs)
  // ---------------------------------------------------------------------------
  const memberItems = memberPickerItems(members, me.id);
  const pocItems = pocPickerItems(pocOptions);

  function pickerProps() {
    if (!picker) return null;
    const isPoc = picker.kind === 'pocs';
    return {
      title: isPoc ? 'Project POCs' : 'Project owners',
      items: isPoc ? pocItems : memberItems,
      selected: (isPoc ? p.pocs : p.owners).map((x) => x.id),
      onToggle: (id: string, on: boolean) => {
        if (isPoc) {
          const c = pocOptions.find((x) => x.id === id);
          const pocs = on ? [...p.pocs, { ...c, email: null } as Poc] : p.pocs.filter((x) => x.id !== id);
          mutate({ kind: 'project', patch: { pocs } }, () => setProjectLink(p.id, 'pocs', id, on));
        } else {
          const m = members.find((x) => x.id === id)!;
          const owners = on ? [...p.owners, m] : p.owners.filter((x) => x.id !== id);
          mutate({ kind: 'project', patch: { owners } }, () => setProjectLink(p.id, 'owners', id, on));
        }
      },
      onAddNew: isPoc
        ? (name: string) =>
            startTransition(async () => {
              const res = await createPoc({ name });
              if (res.id) await setProjectLink(p.id, 'pocs', res.id, true);
            })
        : undefined,
    };
  }
  const pk = pickerProps();

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const owners = p.owners;
  const ownersLabel = owners.length === 1 ? memberName(owners[0]!) : owners.length ? '' : 'Add owner';
  const tabs = (
    [
      ['overview', 'Overview', ''],
      ['versions', 'Versions', versions.length],
      ['features', 'Features', features.length],
      ['activity', 'Activity', ''],
    ] as const
  ).map(([id, label, count]) => ({ label, count, active: tab === id, go: () => setTab(id) }));

  return (
    <div className="max-w-[1320px] px-[clamp(16px,4vw,32px)] pt-[18px] pb-10">
      <div className="flex items-center gap-1.5 text-md text-faint">
        <button
          type="button"
          onClick={() => router.push('/projects')}
          className="-ml-1 cursor-pointer rounded-[4px] border-0 bg-transparent px-1 py-0.5 text-md text-muted hover:bg-hover hover:text-ink"
        >
          Projects
        </button>
        <span>/</span>
        <span className="text-ink">{p.name}</span>
      </div>
      <div className="mt-2.5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="m-0 text-[22px] font-semibold tracking-[-0.02em]">{p.name}</h1>
          <div className="mt-1 max-w-[640px] text-[13.5px] text-muted">{p.description}</div>
        </div>
        <div className="flex gap-2">
          <Button label="Delete project" variant="ghost" onClick={() => setDeleting(true)} />
          <Button label="+ Add version" variant="primary" onClick={addVersion} />
        </div>
      </div>

      <div className="flex flex-wrap items-stretch gap-4 pt-[18px] pb-5">
        <div className="flex min-w-0 flex-[1_1_380px] flex-wrap items-center gap-x-7 gap-y-2">
          <div className="flex items-center gap-2.5">
            <span className={label11}>Owners</span>
            <button
              type="button"
              title="Edit owners"
              onClick={(e) => setPicker({ kind: 'owners', anchor: anchorOf(e.currentTarget) })}
              className={`${metaBtn} -ml-1.5 max-w-full min-w-0 px-1.5`}
              style={{ color: owners.length ? 'var(--ink)' : 'var(--fainter)' }}
            >
              <AvatarStack people={owners.map((o) => ({ ...memberAv(o), name: memberName(o) }))} max={4} empty="" />
              <span className="truncate">{ownersLabel}</span>
            </button>
          </div>
          <div className="flex min-w-0 items-center gap-2.5">
            <span className={label11}>POCs</span>
            <button
              type="button"
              title="Edit project POCs"
              onClick={(e) => setPicker({ kind: 'pocs', anchor: anchorOf(e.currentTarget) })}
              className={`${metaBtn} max-w-[220px] px-2`}
              style={{ color: p.pocs.length ? 'var(--ink)' : 'var(--fainter)' }}
            >
              <AvatarStack people={p.pocs.map((c) => ({ ...pocAv(c), square: false }))} max={4} empty="" />
              {!p.pocs.length && <span>Add POC</span>}
            </button>
          </div>
          <div className="flex items-center gap-2.5">
            <span className={label11}>Status</span>
            <StatusSelect
              kind="project"
              value={p.status}
              onChange={(e) => {
                const status = e.target.value;
                mutate({ kind: 'project', patch: { status } }, () => updateProject(p.id, { status }));
              }}
            />
          </div>
        </div>
        <div className="grid flex-[0_1_auto] grid-cols-[minmax(150px,1.4fr)_repeat(3,auto)] overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex min-w-0 flex-col gap-1.5 px-[18px] py-3">
            <span className={label11}>Progress</span>
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold tabular-nums">{progress(features)}%</span>
              <div className="h-1 min-w-12 flex-1 overflow-hidden rounded-[2px] bg-[#ebeae6]">
                <div className="h-full bg-ink-2" style={{ width: `${progress(features)}%` }} />
              </div>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5 border-l border-border-subtle px-[18px] py-3">
            <span className={label11}>Current version</span>
            <span className="text-[13px] leading-5 font-semibold whitespace-nowrap">
              {cur ? `Version ${cur.num}` : '—'}{' '}
              <span className="font-medium text-faint">· {fmt(cur?.target_date)}</span>
            </span>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5 border-l border-border-subtle px-[18px] py-3">
            <span className={label11}>Confidence</span>
            <span
              className="inline-flex items-center gap-1.5 text-[15px] leading-5 font-semibold"
              style={{ color: cf.fg }}
            >
              <span className="size-[7px] rounded-full" style={{ background: cf.dot }} />
              {cur ? `${cur.confidence}%` : '—'}
            </span>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5 border-l border-border-subtle px-[18px] py-3">
            <span className={label11}>Open features</span>
            <span className="text-[15px] leading-5 font-semibold tabular-nums">{openCount}</span>
          </div>
        </div>
      </div>

      <div className="mb-[18px]">
        <Tabs items={tabs} />
      </div>

      {tab === 'overview' && (
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex min-w-0 flex-[2_1_520px] flex-col gap-3">
            {cur ? (
              <VersionCard
                label="Current version"
                v={cur}
                fs={featsOfV(cur.id)}
                onOpen={() => openVersion(cur.id)}
                h={handlers}
              />
            ) : (
              <EmptyState
                icon="flag"
                title="No versions yet"
                body="Break this project into versions — each gets a target date, features and a ship confidence."
                actionLabel="+ Add version"
                onAction={addVersion}
                bordered
              />
            )}
            {next && (
              <VersionCard
                label="Up next"
                v={next}
                fs={featsOfV(next.id)}
                onOpen={() => openVersion(next.id)}
                h={handlers}
              />
            )}
          </div>
          <div className="min-w-0 flex-[1_1_300px] overflow-hidden rounded-lg border border-border bg-surface">
            <div className="border-b border-border-subtle bg-surface-sunken px-4 py-2.5 text-[11px] leading-[26px] font-semibold tracking-[0.06em] text-faint uppercase">
              Important notes
            </div>
            <div className="px-4 py-3.5">
              <LiveNoteThread kind="project" id={p.id} notes={data.notes} me={me} />
            </div>
          </div>
        </div>
      )}

      {tab === 'versions' && !versions.length && (
        <EmptyState
          icon="flag"
          title="No versions yet"
          body="Add the first version to start grouping features under a target date."
          actionLabel="+ Add version"
          onAction={addVersion}
          bordered
        />
      )}
      {tab === 'versions' && !!versions.length && (
        <ProjectVersions
          versions={sorted}
          featsOfV={featsOfV}
          exp={exp}
          toggle={(vid) => setExp((e) => ({ ...e, [vid]: !e[vid] }))}
          expand={(vid) => setExp((e) => ({ ...e, [vid]: true }))}
          h={handlers}
        />
      )}

      {tab === 'features' && (
        <ProjectFeatures versions={sorted} features={features} archived={data.archived} h={handlers} />
      )}

      {tab === 'activity' && (
        <div className="max-w-[760px] rounded-lg border border-border bg-surface px-4 py-1">
          {!data.activity.length && (
            <EmptyState
              icon="pulse"
              size="sm"
              title="No activity yet"
              body="Changes to this project’s versions and features will show here."
            />
          )}
          {data.activity.map((a) => (
            <div
              key={a.id}
              onClick={() => (a.featureId ? handlers.openFeature(a.featureId) : undefined)}
              className="flex cursor-pointer gap-2.5 border-b border-border-subtle py-2.5"
            >
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full" style={{ background: a.dot }} />
              <div className="min-w-0 flex-1 text-[13px] leading-[1.45]">
                <span className="font-medium">{a.who}</span> <span className="text-ink-2">{a.text}</span>
              </div>
              <span className="text-[12px] whitespace-nowrap text-fainter">{a.when}</span>
            </div>
          ))}
        </div>
      )}

      {pk && picker && (
        <PeoplePicker
          anchor={picker.anchor}
          title={pk.title}
          placeholder={pk.items === pocItems ? 'Search or add a customer…' : 'Search team…'}
          items={pk.items}
          selected={pk.selected}
          onToggle={pk.onToggle}
          onAddNew={pk.onAddNew}
          onClose={() => setPicker(null)}
        />
      )}
      {featurePicker && allFeatures.find((f) => f.id === featurePicker.id) && (
        <FeaturePicker
          feature={allFeatures.find((f) => f.id === featurePicker.id)!}
          kind={featurePicker.kind}
          anchor={featurePicker.anchor}
          members={members}
          pocOptions={pocOptions}
          meId={me.id}
          onLocal={(patch) => apply({ kind: 'feature', id: featurePicker.id, patch })}
          onClose={() => setFeaturePicker(null)}
        />
      )}
      {menu && allFeatures.find((f) => f.id === menu.id) && (
        <FeatureRowMenu
          feature={allFeatures.find((f) => f.id === menu.id)!}
          anchor={menu.anchor}
          members={members}
          meId={me.id}
          onToggleWatcher={(userId, on) => {
            const f = allFeatures.find((x) => x.id === menu.id)!;
            const m = members.find((x) => x.id === userId)!;
            const watchers = on ? [...f.watchers, m] : f.watchers.filter((w) => w.id !== userId);
            mutate({ kind: 'feature', id: f.id, patch: { watchers } }, () =>
              setFeatureLink(f.id, 'watchers', userId, on),
            );
          }}
          onArchive={() => {
            const f = allFeatures.find((x) => x.id === menu.id)!;
            setMenu(null);
            startTransition(async () => {
              await setFeaturesArchived([f.id], !f.archived_at);
            });
          }}
          onDelete={() => {
            setDeletingFeatures([allFeatures.find((x) => x.id === menu.id)!]);
            setMenu(null);
          }}
          onClose={() => setMenu(null)}
        />
      )}
      {deletingFeatures && (
        <DeleteFeaturesDialog
          features={deletingFeatures}
          onCancel={() => setDeletingFeatures(null)}
          onDeleted={() => setDeletingFeatures(null)}
        />
      )}
      {datePick && (
        <DatePicker
          anchor={datePick.anchor}
          value={versions.find((v) => v.id === datePick.versionId)?.target_date ?? null}
          onPick={(iso) => {
            const target_date = iso || null;
            mutate({ kind: 'version', id: datePick.versionId, patch: { target_date } }, () =>
              updateVersion(datePick.versionId, { targetDate: target_date }),
            );
          }}
          onClose={() => setDatePick(null)}
        />
      )}
      {deleting && (
        <DeleteProjectsDialog
          ids={[p.id]}
          onCancel={() => setDeleting(false)}
          onDeleted={() => router.push('/projects')}
        />
      )}
    </div>
  );
}

/** Overview "Current version" / "Up next" card. */
function VersionCard({
  label,
  v,
  fs,
  onOpen,
  h,
}: {
  label: string;
  v: VersionView;
  fs: { status: FeatureStatus; priority: Priority }[];
  onOpen: () => void;
  h: ProjectHandlers;
}) {
  const prog = progress(fs);
  const cf = T[confTone(v.confidence)];
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border-subtle bg-surface-sunken px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="text-[11px] font-semibold tracking-[0.06em] text-faint uppercase">{label}</span>
          <StatusPill value={v.status as VersionStatus} />
        </div>
        <Button label="Open version →" variant="ghost" size="sm" onClick={onOpen} />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-6 p-4">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold tracking-[-0.01em]">
            Version {v.num} — {v.name}
          </div>
          <VersionDescription
            v={v}
            h={h}
            placeholder="Add a description…"
            className="mt-1 -ml-1.5 block w-full resize-none rounded-[5px] border-0 bg-transparent px-1.5 py-1 text-[13px] leading-normal text-muted outline-none hover:bg-surface-sunken focus:bg-surface-sunken focus:text-ink"
          />
        </div>
        <div className="grid grid-cols-[repeat(3,auto)] gap-x-6 gap-y-1 text-left">
          <span className="text-[11.5px] text-faint">Confidence</span>
          <span className="text-[11.5px] text-faint">Target</span>
          <span className="text-[11.5px] text-faint">Features</span>
          <span className="text-[15px] font-semibold tabular-nums" style={{ color: cf.fg }}>
            {v.confidence}%
          </span>
          <span className="text-[15px] font-semibold whitespace-nowrap">{fmt(v.target_date)}</span>
          <span className="text-[15px] font-semibold tabular-nums">{fs.length}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 px-4 pb-4">
        <div className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-[#ebeae6]">
          <div className="h-full rounded-[3px] bg-ink-2" style={{ width: `${prog}%` }} />
        </div>
        <span className="min-w-[74px] text-right text-md font-medium text-ink-2 tabular-nums">{prog}% complete</span>
      </div>
    </div>
  );
}

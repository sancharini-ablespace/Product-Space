'use client';

// Projects page table — design/PM Dashboard v3.dc.html (isProjects, tProj).
import { useEffect, useOptimistic, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DeleteProjectsDialog } from '@/components/delete-projects-dialog';
import { Confidence } from '@/components/hub/Confidence';
import { PeopleButton } from '@/components/hub/PeopleButton';
import { ProgressBar } from '@/components/hub/ProgressBar';
import { SelectionBar } from '@/components/hub/SelectionBar';
import { StatusSelect } from '@/components/hub/StatusSelect';
import { PeoplePicker, anchorOf, type Anchor } from '@/components/popovers';
import { SortHeader } from '@/components/sort-header';
import { useTable, type Column } from '@/components/use-table';
import { setProjectLink, updateProject } from '@/lib/actions';
import { memberAv, memberName } from '@/lib/hub';
import type { Member } from '@/lib/types';

export type ProjectListRow = {
  id: string;
  name: string;
  description: string;
  status: string;
  cur: { num: number; name: string; target: string; confidence: number } | null;
  prog: number;
  owners: Member[];
};

export type TeamMember = Member & { role_title: string | null };

const COLS =
  'grid-cols-[20px_minmax(240px,2fr)_minmax(160px,1.2fr)_minmax(120px,1fr)_90px_72px_minmax(120px,1fr)_96px]';
const ZZ = '￿';
const lc = (s: string) => s.toLowerCase();

type Change = { id: string; owners?: Member[]; status?: string };

export function ProjectsTable({
  projects,
  members,
  meId,
}: {
  projects: ProjectListRow[];
  members: TeamMember[];
  meId: string;
}) {
  const router = useRouter();
  const [rows, applyChange] = useOptimistic(projects, (cur: ProjectListRow[], c: Change) =>
    cur.map((p) => (p.id === c.id ? { ...p, ...c } : p)),
  );
  const [, startTransition] = useTransition();
  const [picker, setPicker] = useState<{ id: string; anchor: Anchor } | null>(null);
  const [deleting, setDeleting] = useState<string[] | null>(null);

  const columns: Column<ProjectListRow>[] = [
    { key: 'name', label: 'Project', sort: (r) => lc(r.name) },
    { key: 'version', label: 'Current version', sort: (r) => r.cur?.num ?? 0 },
    { key: 'prog', label: 'Progress', descFirst: true, sort: (r) => r.prog },
    { key: 'conf', label: 'Confidence', descFirst: true, sort: (r) => r.cur?.confidence ?? -1 },
    { key: 'target', label: 'Target', sort: (r) => r.cur?.target || '9999' },
    { key: 'owner', label: 'Owners', sort: (r) => (r.owners[0] ? lc(memberName(r.owners[0])) : ZZ) },
    { key: 'status', label: 'Status', sort: (r) => r.status },
  ];
  const t = useTable(rows, columns);

  const selAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selAllRef.current) selAllRef.current.indeterminate = t.someSelected;
  }, [t.someSelected]);

  const pickerRow = picker && rows.find((p) => p.id === picker.id);

  function toggleOwner(projectId: string, userId: string, on: boolean) {
    const p = rows.find((x) => x.id === projectId);
    const m = members.find((x) => x.id === userId);
    if (!p || !m) return;
    startTransition(async () => {
      applyChange({ id: projectId, owners: on ? [...p.owners, m] : p.owners.filter((o) => o.id !== userId) });
      await setProjectLink(projectId, 'owners', userId, on);
    });
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <div className="min-w-[1070px]">
          <div
            className={`grid ${COLS} items-center gap-3.5 border-b border-border bg-surface-sunken px-4 py-1.5 text-[12px] font-medium text-faint`}
          >
            <input
              ref={selAllRef}
              type="checkbox"
              title="Select all"
              checked={t.allSelected}
              onChange={t.toggleAll}
              className="m-0 size-[15px] cursor-pointer accent-[var(--ink)]"
            />
            {t.headers.map((h) => (
              <SortHeader
                key={h.label}
                label={h.label}
                right={h.right}
                arrow={h.arrow}
                active={h.active}
                onClick={h.onClick}
              />
            ))}
          </div>
          {t.rows.map((p) => {
            const checked = t.isSelected(p.id);
            const n = p.owners.length;
            return (
              <div
                key={p.id}
                onClick={() => router.push(`/projects/${p.id}`)}
                className={`grid ${COLS} cursor-pointer items-center gap-3.5 border-b border-border-subtle px-4 py-2.5 text-[13px] hover:bg-surface-hover!`}
                style={{ background: checked ? 'var(--selected)' : 'transparent' }}
              >
                <div onClick={(e) => e.stopPropagation()} className="flex h-full items-center">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => t.toggle(p.id)}
                    className="m-0 size-[15px] cursor-pointer accent-[var(--ink)]"
                  />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold">{p.name}</div>
                  <div className="truncate text-md text-muted">{p.description}</div>
                </div>
                <div className="min-w-0">
                  <div>{p.cur ? `Version ${p.cur.num}` : '—'}</div>
                  <div className="truncate text-md text-muted">{p.cur?.name ?? ''}</div>
                </div>
                <ProgressBar value={p.prog} maxWidth={96} />
                {p.cur ? <Confidence value={p.cur.confidence} /> : <span className="text-ink-3">—</span>}
                <span className="text-ink-3">{p.cur?.target ?? '—'}</span>
                <PeopleButton
                  people={p.owners.map((o) => ({ ...memberAv(o), name: memberName(o) }))}
                  max={3}
                  label={n === 1 ? memberName(p.owners[0]!) : n ? '' : 'Add owner'}
                  labelColor={n ? 'var(--ink)' : 'var(--fainter)'}
                  size="sm"
                  edge="start"
                  bold
                  title="Edit owners"
                  onClick={(e) => setPicker({ id: p.id, anchor: anchorOf(e.currentTarget) })}
                />
                <div onClick={(e) => e.stopPropagation()}>
                  <StatusSelect
                    kind="project"
                    value={p.status}
                    onChange={(e) => {
                      const status = e.target.value;
                      startTransition(async () => {
                        applyChange({ id: p.id, status });
                        await updateProject(p.id, { status });
                      });
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {pickerRow && picker && (
        <PeoplePicker
          anchor={picker.anchor}
          title="Project owners"
          placeholder="Search team…"
          items={members.map((m) => ({
            id: m.id,
            name: m.id === meId ? `${memberName(m)} (you)` : memberName(m),
            sub: m.role_title || 'Member',
            av: memberAv(m),
          }))}
          selected={pickerRow.owners.map((o) => o.id)}
          onToggle={(id, on) => toggleOwner(pickerRow.id, id, on)}
          onClose={() => setPicker(null)}
        />
      )}

      {t.selectedIds.length > 0 && (
        <SelectionBar
          label={`${t.selectedIds.length} selected`}
          actions={[{ label: 'Delete', onClick: () => setDeleting(t.selectedIds) }]}
          onClear={t.clear}
        />
      )}

      {deleting && (
        <DeleteProjectsDialog
          ids={deleting}
          onCancel={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            t.clear();
          }}
        />
      )}
    </>
  );
}

'use client';

// Project page "Features" tab — design/PM Dashboard v3.dc.html (tabFeatures / pjFeatures / verChips).
import { useState } from 'react';
import { EmptyState } from '@/components/hub/EmptyState';
import { MoreButton } from '@/components/hub/MoreButton';
import { PeopleButton } from '@/components/hub/PeopleButton';
import { PrioritySelect, type Priority } from '@/components/hub/PrioritySelect';
import { StatusSelect } from '@/components/hub/StatusSelect';
import { anchorOf } from '@/components/popovers';
import { memberAv, memberName, pocAv, sortFeatures } from '@/lib/hub';
import type { FeatureRow } from '@/lib/queries';
import type { ProjectHandlers, VersionView } from './types';

const COLS = 'grid-cols-[minmax(180px,2fr)_minmax(110px,1fr)_116px_76px_minmax(130px,1fr)_minmax(130px,1fr)_92px_28px]';

export function ProjectFeatures({
  versions,
  features,
  archived,
  h,
}: {
  versions: VersionView[];
  features: FeatureRow[];
  archived: FeatureRow[];
  h: ProjectHandlers;
}) {
  const [sel, setSel] = useState<string>('all');
  const pv = sel === 'archived' && !archived.length ? 'all' : sel;
  const featsOfV = (vid: string) => features.filter((f) => f.version_id === vid);

  const rows =
    pv === 'archived'
      ? sortFeatures(archived)
      : versions.filter((v) => pv === 'all' || v.id === pv).flatMap((v) => sortFeatures(featsOfV(v.id)));

  const chips = [
    { id: 'all', label: 'All', count: features.length },
    ...versions.map((v) => ({ id: v.id, label: `Version ${v.num}`, count: featsOfV(v.id).length })),
    ...(archived.length ? [{ id: 'archived', label: 'Archived', count: archived.length }] : []),
  ];

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-border bg-surface-sunken p-0.5">
          {chips.map((c) => {
            const act = pv === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSel(c.id)}
                className="flex h-[26px] cursor-pointer items-center gap-1.5 rounded-md border-0 px-2.5 text-md font-medium whitespace-nowrap hover:text-ink!"
                style={{
                  background: act ? '#fff' : 'transparent',
                  boxShadow: act ? '0 1px 2px rgba(0,0,0,0.08), 0 0 0 1px var(--border)' : 'none',
                  color: act ? 'var(--ink)' : 'var(--muted)',
                }}
              >
                {c.label}
                <span className="text-[11.5px] tabular-nums" style={{ color: act ? 'var(--faint)' : 'var(--fainter)' }}>
                  {c.count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="text-[13px] text-muted">
          {rows.length} features · {rows.filter((f) => f.status === 'Completed').length} completed
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <div className="min-w-[990px]">
          <div
            className={`grid ${COLS} gap-3 border-b border-border bg-surface-sunken px-4 py-[9px] text-[12px] font-medium text-faint`}
          >
            <span>Feature</span>
            <span>Version</span>
            <span>Status</span>
            <span>Priority</span>
            <span>Owners</span>
            <span>POCs</span>
            <span>Watchers</span>
            <span />
          </div>
          {rows.map((f) => {
            const pocs = f.pocs;
            return (
              <div
                key={f.id}
                onClick={() => h.openFeature(f.id)}
                className={`grid ${COLS} cursor-pointer items-center gap-3 border-b border-border-subtle px-4 py-2 text-[13px] hover:bg-surface-hover`}
              >
                <div className="min-w-0">
                  <div
                    className="font-semibold"
                    style={{ color: f.status === 'Completed' ? 'var(--faint)' : 'var(--ink)' }}
                  >
                    {f.name}
                  </div>
                  <div className="truncate text-md text-muted">{f.description ?? ''}</div>
                </div>
                <div className="min-w-0">
                  <div>{f.version ? `Version ${f.version.num}` : '—'}</div>
                  <div className="truncate text-[12px] text-faint">{f.version?.name ?? ''}</div>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <StatusSelect
                    kind="feature"
                    value={f.status}
                    onChange={(e) => h.setFeature(f.id, { status: e.target.value })}
                  />
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <PrioritySelect
                    value={f.priority as Priority}
                    onChange={(e) => h.setFeature(f.id, { priority: e.target.value })}
                  />
                </div>
                <PeopleButton
                  people={f.owners.map((o) => ({ ...memberAv(o), name: memberName(o) }))}
                  max={3}
                  label={f.owners.length ? '' : 'Add owner'}
                  labelColor={f.owners.length ? 'var(--ink)' : 'var(--fainter)'}
                  size="md"
                  edge="start"
                  title="Edit owners"
                  onClick={(e) => h.openFeaturePicker(f.id, 'owners', anchorOf(e.currentTarget))}
                />
                <PeopleButton
                  people={pocs.map(pocAv)}
                  max={2}
                  label={pocs.length ? pocs[0]!.name + (pocs.length > 1 ? ` +${pocs.length - 1}` : '') : 'Add POC'}
                  labelColor={pocs.length ? 'var(--ink)' : 'var(--fainter)'}
                  size="md"
                  edge="start"
                  title="Edit POCs"
                  onClick={(e) => h.openFeaturePicker(f.id, 'pocs', anchorOf(e.currentTarget))}
                />
                <PeopleButton
                  people={f.watchers.map((w) => ({ ...memberAv(w), name: memberName(w) }))}
                  max={3}
                  align="start"
                  label=""
                  size="md"
                  edge="start"
                  title="Edit watchers"
                  onClick={(e) => h.openFeaturePicker(f.id, 'watchers', anchorOf(e.currentTarget))}
                />
                <MoreButton active={h.menuFor === f.id} onClick={(e) => h.openMenu(f.id, anchorOf(e.currentTarget))} />
              </div>
            );
          })}
          {!rows.length && (
            <EmptyState
              icon="list"
              size="sm"
              title={pv === 'archived' ? 'No archived features.' : 'No features in this version yet.'}
              body=""
              actionLabel="+ Add feature"
              actionVariant="secondary"
              onAction={h.addFeatureHere}
            />
          )}
        </div>
      </div>
    </>
  );
}

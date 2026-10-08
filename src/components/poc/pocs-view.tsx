'use client';

// POCs page — design/PM Dashboard v3.dc.html (isPocs, tPoc).
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/hub/Avatar';
import { EmptyState } from '@/components/hub/EmptyState';
import { SelectionBar } from '@/components/hub/SelectionBar';
import { NewButton } from '@/components/new-button';
import { SortHeader } from '@/components/sort-header';
import { useTable, type Column } from '@/components/use-table';
import { ST_TONE, T, pocAv, sortFeatures } from '@/lib/hub';
import type { PocRow } from '@/lib/queries';
import { DeletePocsDialog } from './delete-pocs-dialog';
import { openPoc } from './url';

const COLS =
  'grid-cols-[20px_minmax(220px,1.3fr)_minmax(150px,1fr)_minmax(130px,0.8fr)_minmax(150px,1fr)_minmax(250px,1.8fr)_70px]';
const ZZ = '￿';
const lc = (s: string) => s.toLowerCase();
const projLabel = (c: PocRow) => (c.projects.length ? c.projects.map((p) => p.name).join(', ') : '—');

export function PocsView({ pocs, linkedFeatures }: { pocs: PocRow[]; linkedFeatures: number }) {
  const [deleting, setDeleting] = useState<PocRow[] | null>(null);
  // Prototype default order: most requested features first.
  const rows = [...pocs].sort((a, b) => b.features.length - a.features.length);
  const columns: Column<PocRow>[] = [
    { key: 'name', label: 'POC', sort: (r) => lc(r.name) },
    { key: 'org', label: 'Organization', sort: (r) => (r.org ? lc(r.org) : ZZ) },
    { key: 'role', label: 'Role', sort: (r) => (r.role ? lc(r.role) : ZZ) },
    { key: 'projects', label: 'Projects', sort: (r) => (r.projects.length ? lc(projLabel(r)) : ZZ) },
    { key: 'req', label: 'Requested features', descFirst: true, sort: (r) => r.features.length },
    {
      key: 'open',
      label: 'Open',
      right: true,
      descFirst: true,
      sort: (r) => r.features.filter((f) => f.status !== 'Completed').length,
    },
  ];
  const t = useTable(rows, columns);
  const selAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selAllRef.current) selAllRef.current.indeterminate = t.someSelected;
  }, [t.someSelected]);

  return (
    <div className="flex max-w-[1400px] flex-col gap-3.5 px-[clamp(16px,4vw,32px)] pt-6 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 text-[20px] font-semibold tracking-[-0.015em]">POCs</h1>
          <div className="mt-1 text-[13px] text-muted">
            Customers who requested features · {pocs.length} customers · {linkedFeatures} features requested
          </div>
        </div>
        <NewButton label="+ Add POC" href="/pocs?new=poc" />
      </div>

      {pocs.length ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <div className="min-w-[1120px]">
            <div
              className={`grid ${COLS} items-center gap-3 border-b border-border bg-surface-sunken px-4 py-1.5 text-[12px] font-medium text-faint`}
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
            {t.rows.map((c) => {
              const checked = t.isSelected(c.id);
              const fs = sortFeatures(c.features);
              return (
                <div
                  key={c.id}
                  onClick={() => openPoc(c.id)}
                  className={`grid ${COLS} cursor-pointer items-center gap-3 border-b border-border-subtle px-4 py-2 text-[13px] hover:bg-surface-hover!`}
                  style={{ background: checked ? 'var(--selected)' : 'transparent' }}
                >
                  <div onClick={(e) => e.stopPropagation()} className="flex h-full items-center">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => t.toggle(c.id)}
                      className="m-0 size-[15px] cursor-pointer accent-[var(--ink)]"
                    />
                  </div>
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Avatar av={pocAv(c)} size={28} square />
                    <span className="min-w-0">
                      <span className="block font-medium">{c.name}</span>
                      <span className="block truncate text-[12px] text-faint">{c.email || '—'}</span>
                    </span>
                  </span>
                  <span className="truncate text-ink-2">{c.org || '—'}</span>
                  <span className="truncate text-ink-3">{c.role || '—'}</span>
                  <span className="truncate" style={{ color: c.projects.length ? 'var(--ink-2)' : 'var(--fainter)' }}>
                    {projLabel(c)}
                  </span>
                  <span className="flex min-w-0 flex-nowrap items-center gap-1.5 overflow-hidden">
                    {fs.slice(0, 2).map((f) => (
                      <span
                        key={f.id}
                        className="inline-flex h-[22px] max-w-[180px] min-w-0 shrink items-center gap-1.5 rounded-xs bg-surface-muted px-2 text-[12px] text-ink-2"
                      >
                        <span
                          className="size-1.5 shrink-0 rounded-full"
                          style={{ background: T[ST_TONE[f.status]!].dot }}
                        />
                        <span className="truncate">{f.name}</span>
                      </span>
                    ))}
                    <span className="shrink-0 text-[12px] whitespace-nowrap text-faint">
                      {fs.length > 2 ? `+${fs.length - 2}` : fs.length ? '' : 'None yet'}
                    </span>
                  </span>
                  <span className="text-right text-ink-3 tabular-nums">
                    {c.features.filter((f) => f.status !== 'Completed').length}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState
          icon="users"
          title="No POCs yet"
          body="Add the customers who request features so the team knows who to follow up with."
          actionLabel="+ Add POC"
          actionHref="/pocs?new=poc"
          bordered
        />
      )}

      {t.selectedIds.length > 0 && (
        <SelectionBar
          label={`${t.selectedIds.length} selected`}
          actions={[{ label: 'Delete', onClick: () => setDeleting(pocs.filter((c) => t.selectedIds.includes(c.id))) }]}
          onClear={t.clear}
        />
      )}
      {deleting && (
        <DeletePocsDialog
          pocs={deleting}
          onCancel={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            t.clear();
          }}
        />
      )}
    </div>
  );
}

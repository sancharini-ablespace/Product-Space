'use client';

// Project page "Versions" tab — design/PM Dashboard v3.dc.html (tabVersions / pjVersions).
import { useEffect, useState, useTransition } from 'react';
import { Button } from '@/components/hub/Button';
import { Confidence } from '@/components/hub/Confidence';
import { MoreButton } from '@/components/hub/MoreButton';
import { PeopleButton } from '@/components/hub/PeopleButton';
import { PrioritySelect, type Priority } from '@/components/hub/PrioritySelect';
import { ProgressBar } from '@/components/hub/ProgressBar';
import { StatusSelect } from '@/components/hub/StatusSelect';
import { LiveNoteThread } from '@/components/live-note-thread';
import { anchorOf } from '@/components/popovers';
import { setConfidence } from '@/lib/actions';
import { progress } from '@/lib/derive';
import { ST_TONE, T, confTone, fmt, memberAv, memberName, sortFeatures } from '@/lib/hub';
import type { FeatureRow } from '@/lib/queries';
import type { ProjectHandlers, VersionView } from './types';

const ROW_COLS = 'grid-cols-[16px_minmax(240px,1fr)_124px_140px_96px_72px_64px_48px]';
const FEAT_COLS = 'grid-cols-[minmax(150px,1fr)_112px_72px_minmax(96px,140px)_auto_28px]';
const BREAKDOWN = ['Completed', 'In Progress', 'Blocked', 'Planned'] as const;

const Chevron = ({ d = 'M3.5 2 L6.5 5 L3.5 8', color = 'currentColor' }: { d?: string; color?: string }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d={d} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Inline-editable version description; saved when the field loses focus. */
export function VersionDescription({
  v,
  h,
  placeholder,
  className,
}: {
  v: VersionView;
  h: ProjectHandlers;
  placeholder: string;
  className: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <textarea
      value={draft ?? v.description}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== null && draft !== v.description) h.setVersion(v.id, { description: draft });
        setDraft(null);
      }}
      placeholder={placeholder}
      rows={2}
      className={className}
    />
  );
}

export function ProjectVersions({
  versions,
  featsOfV,
  exp,
  toggle,
  expand,
  h,
}: {
  versions: VersionView[];
  featsOfV: (vid: string) => FeatureRow[];
  exp: Record<string, boolean>;
  toggle: (vid: string) => void;
  expand: (vid: string) => void;
  h: ProjectHandlers;
}) {
  const [sideCol, setSideCol] = useState<Record<string, boolean>>({});
  const [conf, setConf] = useState<{ id: string; val: number; reason: string; err: boolean } | null>(null);
  const [, startTransition] = useTransition();
  const editingConf = !!conf;
  useEffect(() => {
    if (!editingConf) return;
    // Prototype: Esc closes the confidence editor (popovers such as the date picker close first).
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setConf(null);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [editingConf]);

  const openConf = (v: VersionView) => {
    setConf({ id: v.id, val: v.confidence, reason: '', err: false });
    expand(v.id);
    setSideCol((s) => ({ ...s, [v.id]: false }));
  };
  const saveConf = () => {
    if (!conf) return;
    if (!conf.reason.trim()) return setConf({ ...conf, err: true });
    const { id, val, reason } = conf;
    setConf(null);
    startTransition(async () => {
      await setConfidence(id, val, reason);
    });
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <div className="min-w-[930px]">
        <div
          className={`grid ${ROW_COLS} gap-3 border-b border-border bg-surface-sunken px-4 py-[9px] text-[12px] font-medium text-faint`}
        >
          <span />
          <span>Version</span>
          <span>Status</span>
          <span>Progress</span>
          <span>Confidence</span>
          <span>Target</span>
          <span>Features</span>
          <span>Open</span>
        </div>
        {versions.map((v) => {
          const fs = featsOfV(v.id);
          const done = fs.filter((f) => f.status === 'Completed').length;
          const prog = progress(fs);
          const cf = T[confTone(v.confidence)];
          const expanded = !!exp[v.id];
          const editing = conf?.id === v.id;
          const sideOpen = !sideCol[v.id];
          const counts = BREAKDOWN.map((k) => ({
            label: k,
            count: fs.filter((f) => f.status === k).length,
            dot: T[ST_TONE[k]!].dot,
          })).filter((x) => x.count);
          return (
            <div key={v.id} className="border-b border-border">
              <div
                onClick={() => toggle(v.id)}
                className={`grid ${ROW_COLS} cursor-pointer items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-surface-hover`}
              >
                <span
                  className="flex size-4 items-center justify-center text-faint transition-transform duration-[120ms]"
                  style={{ transform: expanded ? 'rotate(90deg)' : 'none' }}
                >
                  <Chevron />
                </span>
                <div className="min-w-0 text-[13.5px] font-semibold">
                  Version {v.num} — {v.name}
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <StatusSelect
                    kind="version"
                    value={v.status}
                    onChange={(e) => h.setVersion(v.id, { status: e.target.value })}
                  />
                </div>
                <ProgressBar value={prog} maxWidth={90} />
                <Confidence value={v.confidence} onClick={() => openConf(v)} />
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="relative -ml-[7px] inline-flex w-fit rounded-[5px] border border-transparent px-1.5 py-0.5 text-ink-2 hover:border-border-strong hover:bg-surface"
                >
                  {fmt(v.target_date)}
                  <span
                    onClick={(e) => h.openTargetPicker(v.id, anchorOf(e.currentTarget))}
                    className="absolute inset-0 cursor-pointer"
                  />
                </div>
                <span className="tabular-nums">{fs.length}</span>
                <span className="tabular-nums">{fs.filter((f) => f.status !== 'Completed').length}</span>
              </div>

              {expanded && (
                <div className="flex flex-wrap border-t border-hover bg-surface-sunken">
                  <div className="flex min-w-0 flex-[1_1_600px] flex-col gap-4 pt-4 pr-5 pb-5 pl-11">
                    <div>
                      <div className="mb-1 text-xs font-semibold tracking-[0.05em] text-faint uppercase">
                        About this version
                      </div>
                      <VersionDescription
                        v={v}
                        h={h}
                        placeholder="What does this version deliver, and for whom?"
                        className="-ml-1.5 block w-full max-w-[680px] resize-y rounded-sm border-0 bg-transparent px-1.5 py-1 text-base leading-normal text-ink-3 outline-none hover:bg-hover focus:bg-surface focus:text-ink"
                      />
                    </div>
                    <div className="overflow-hidden rounded-lg border border-border bg-surface">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-3.5 py-3">
                        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-2">
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-semibold">Features</span>
                            <span className="text-sm text-faint tabular-nums">
                              {fs.length ? `${done} of ${fs.length} completed` : ''}
                            </span>
                          </div>
                          {fs.length > 0 && (
                            <div className="flex max-w-[420px] flex-col gap-1.5">
                              <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-[3px] bg-hover">
                                {counts.map((bd) => (
                                  <span
                                    key={bd.label}
                                    title={`${bd.label}: ${bd.count}`}
                                    style={{ width: `${(bd.count / fs.length) * 100}%`, background: bd.dot }}
                                  />
                                ))}
                              </div>
                              <div className="flex flex-wrap gap-x-3.5 gap-y-1">
                                {counts.map((bd) => (
                                  <span key={bd.label} className="inline-flex items-center gap-1.5 text-sm text-ink-3">
                                    <span className="size-1.5 rounded-full" style={{ background: bd.dot }} />
                                    {bd.label}
                                    <span className="text-faint tabular-nums">{bd.count}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <Button
                          label="+ Add feature"
                          variant="secondary"
                          size="sm"
                          onClick={() => h.addFeature(v.id)}
                        />
                      </div>
                      {fs.length > 0 ? (
                        <div className="overflow-x-auto">
                          <div className="min-w-[620px]">
                            <div
                              className={`grid ${FEAT_COLS} gap-2.5 border-b border-border-subtle bg-surface-sunken px-3 py-[7px] text-sm font-medium text-faint`}
                            >
                              <span>Feature</span>
                              <span>Status</span>
                              <span>Priority</span>
                              <span>Owners</span>
                              <span className="text-right">Watchers</span>
                              <span />
                            </div>
                            {sortFeatures(fs).map((f) => (
                              <div
                                key={f.id}
                                onClick={() => h.openFeature(f.id)}
                                className={`grid ${FEAT_COLS} min-h-11 cursor-pointer items-center gap-2.5 border-b border-border-subtle px-3 py-1.5 text-[13px] hover:bg-surface-hover`}
                              >
                                <div className="min-w-0">
                                  <div
                                    className="truncate font-semibold"
                                    style={{ color: f.status === 'Completed' ? 'var(--faint)' : 'var(--ink)' }}
                                  >
                                    {f.name}
                                  </div>
                                  <div className="truncate text-[12px] text-faint">{f.description ?? ''}</div>
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
                                  max={4}
                                  label={f.owners.length ? '' : 'Add owner'}
                                  labelColor="var(--fainter)"
                                  size="md"
                                  edge="start"
                                  title="Edit owners"
                                  onClick={(e) => h.openFeaturePicker(f.id, 'owners', anchorOf(e.currentTarget))}
                                />
                                <PeopleButton
                                  people={f.watchers.map((w) => ({ ...memberAv(w), name: memberName(w) }))}
                                  max={3}
                                  align="end"
                                  label=""
                                  size="md"
                                  edge="end"
                                  title="Edit watchers"
                                  onClick={(e) => h.openFeaturePicker(f.id, 'watchers', anchorOf(e.currentTarget))}
                                />
                                <MoreButton
                                  active={h.menuFor === f.id}
                                  onClick={(e) => h.openMenu(f.id, anchorOf(e.currentTarget))}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-start gap-2.5 px-4 py-[22px]">
                          <div>
                            <div className="text-base font-semibold">No features yet</div>
                            <div className="mt-0.5 max-w-[420px] text-md leading-[1.45] text-faint">
                              Break this version into the things it will ship. Each feature gets a POC, status and
                              watchers.
                            </div>
                          </div>
                          <Button
                            label="+ Add first feature"
                            variant="primary"
                            size="sm"
                            onClick={() => h.addFeature(v.id)}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {sideOpen ? (
                    <div className="flex max-w-full min-w-0 flex-[1_1_280px] flex-col gap-5 border-l border-hover px-[18px] pt-3.5 pb-[18px]">
                      <div>
                        <div className="flex min-h-[26px] items-center justify-between">
                          <span className="text-[11.5px] font-semibold tracking-[0.05em] text-faint uppercase">
                            Confidence
                          </span>
                          <span className="flex items-center gap-1">
                            {!editing && (
                              <Button label="Update" variant="secondary" size="sm" onClick={() => openConf(v)} />
                            )}
                            <button
                              type="button"
                              title="Collapse panel"
                              onClick={() => setSideCol((s) => ({ ...s, [v.id]: true }))}
                              className="flex size-[26px] cursor-pointer items-center justify-center rounded-[5px] border-0 bg-transparent p-0 text-faint hover:bg-hover hover:text-ink"
                            >
                              <Chevron />
                            </button>
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-baseline gap-2">
                          <span
                            className="text-[28px] font-semibold tracking-[-0.02em] tabular-nums"
                            style={{ color: cf.fg }}
                          >
                            {v.confidence}%
                          </span>
                          <span className="text-[12px] text-faint">to ship by {fmt(v.target_date)}</span>
                        </div>
                        <div className="text-[12px] text-faint">
                          Work complete: {prog}% · {done} of {fs.length} features
                        </div>
                        {editing && conf && (
                          <div className="mt-3 flex flex-col gap-2.5 rounded-[7px] border border-[#d6d4cf] bg-surface p-3">
                            <div className="flex items-center gap-2.5">
                              <input
                                type="range"
                                min={0}
                                max={100}
                                step={5}
                                value={conf.val}
                                onChange={(e) => setConf({ ...conf, val: +e.target.value })}
                                className="flex-1 accent-[var(--ink)]"
                              />
                              <span className="min-w-10 text-right text-[14px] font-semibold tabular-nums">
                                {conf.val}%
                              </span>
                            </div>
                            <textarea
                              value={conf.reason}
                              onChange={(e) => setConf({ ...conf, reason: e.target.value, err: false })}
                              rows={2}
                              placeholder="Why is it changing? (required)"
                              className="w-full resize-y rounded-md border border-border-strong px-2.5 py-2 text-[13px] leading-[1.45] outline-none focus:border-fainter"
                            />
                            {conf.err && (
                              <div className="text-[12px] text-tone-red-fg">Add a reason so the team knows why.</div>
                            )}
                            <div className="flex justify-end gap-1.5">
                              <Button label="Cancel" variant="ghost" size="sm" onClick={() => setConf(null)} />
                              <Button label="Save" variant="primary" size="sm" onClick={saveConf} />
                            </div>
                          </div>
                        )}
                        <div className="mt-2.5">
                          {v.history.map((x) => (
                            <div key={x.id} className="border-t border-hover py-2">
                              <div className="flex justify-between gap-2">
                                <span
                                  className="text-md font-semibold tabular-nums"
                                  style={{
                                    color:
                                      x.from == null || x.to === x.from
                                        ? 'var(--ink-3)'
                                        : x.to > x.from
                                          ? T.green.fg
                                          : T.red.fg,
                                  }}
                                >
                                  {x.from == null ? `Set to ${x.to}%` : `${x.from}% → ${x.to}%`}
                                </span>
                                <span className="text-[11.5px] text-fainter">
                                  {x.by} · {fmt(x.date.slice(0, 10))}
                                </span>
                              </div>
                              <div className="mt-0.5 text-md leading-[1.4] text-ink-3">{x.reason}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="mb-2 text-[11.5px] font-semibold tracking-[0.05em] text-faint uppercase">
                          Notes
                        </div>
                        <LiveNoteThread kind="version" id={v.id} notes={v.notes} me={h.me} />
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      title="Show confidence & notes"
                      onClick={() => setSideCol((s) => ({ ...s, [v.id]: false }))}
                      className="flex flex-[0_0_52px] cursor-pointer flex-col items-center gap-2.5 border-0 border-l border-hover bg-transparent py-3.5 hover:bg-surface-muted"
                    >
                      <Chevron d="M6.5 2 L3.5 5 L6.5 8" color="#8a8882" />
                      <span className="text-[13px] font-semibold tabular-nums" style={{ color: cf.fg }}>
                        {v.confidence}%
                      </span>
                      <span className="rotate-180 text-[11px] font-semibold tracking-[0.05em] text-faint uppercase [writing-mode:vertical-rl]">
                        Confidence &amp; notes
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

'use client';

// Research drawer — design/PM Dashboard v3.dc.html (isResDrawer). Opens on any page via ?research=<id>.
import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/hub/Button';
import { Select } from '@/components/hub/Select';
import { LiveNoteThread } from '@/components/live-note-thread';
import { deleteResearch, getResearchDrawer, setResearchProject, updateResearch } from '@/lib/actions';
import { RS_TONE, type Av } from '@/lib/hub';
import type { ResearchDrawerData } from '@/lib/research-view';
import { RESEARCH_STATUSES } from '@/lib/types';
import { closeResearch } from './url';

const sectionLabel = 'text-[11.5px] font-semibold tracking-[0.05em] text-faint uppercase';
const inlineInput =
  '-ml-[7px] min-w-0 rounded-[5px] border border-transparent bg-transparent px-1.5 py-[3px] text-[13px] outline-none hover:border-border-strong focus:border-fainter focus:bg-surface';

type Field = 'name' | 'category' | 'url';

export function ResearchDrawerHost({ me }: { me: { id: string; name: string; av: Av } }) {
  const id = useSearchParams().get('research');
  const [data, setData] = useState<ResearchDrawerData | null>(null);

  const load = useCallback(async (rid: string) => {
    const d = await getResearchDrawer(rid);
    if (!d) closeResearch();
    setData(d);
  }, []);

  useEffect(() => {
    if (!id) return;
    let live = true;
    getResearchDrawer(id).then((d) => {
      if (!live) return;
      if (!d) closeResearch();
      setData(d);
    });
    return () => {
      live = false;
    };
  }, [id]);

  if (!id || !data || data.item.id !== id) return null;
  return <ResearchDrawer key={id} data={data} reload={() => load(id)} me={me} />;
}

function ResearchDrawer({
  data,
  reload,
  me,
}: {
  data: ResearchDrawerData;
  reload: () => Promise<void>;
  me: { id: string; name: string; av: Av };
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [drafts, setDrafts] = useState<Partial<Record<Field, string>>>({});
  const [askDel, setAskDel] = useState(false);
  const r = data.item;
  const tone = RS_TONE[r.status] ?? RS_TONE['To research']!;

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeResearch();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const run = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      await fn();
      await reload();
    });
  const saveField = (key: Field) => {
    const value = drafts[key];
    if (value === undefined || value === (r[key] ?? '')) return setDrafts((d) => ({ ...d, [key]: undefined }));
    run(async () => {
      // A blank name is rejected by the action; the field then shows the saved name again.
      await updateResearch(r.id, { [key]: value });
      setDrafts((d) => ({ ...d, [key]: undefined }));
    });
  };
  const field = (key: Field) => ({
    value: drafts[key] ?? r[key] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDrafts((d) => ({ ...d, [key]: e.target.value })),
    onBlur: () => saveField(key),
  });
  const url = drafts.url ?? r.url ?? '';
  const linked = new Set(r.projects.map((p) => p.id));

  return (
    <>
      <div onClick={closeResearch} className="fixed inset-0 z-40 bg-scrim" />
      <div className="fixed top-0 right-0 bottom-0 z-[41] flex w-[min(540px,100vw)] flex-col border-l border-border bg-surface shadow-[-12px_0_32px_rgba(28,27,26,0.08)]">
        <div className="flex items-center justify-between gap-3 border-b border-hover py-2.5 pr-3.5 pl-5">
          <div className="text-md font-medium text-faint">Research · Software</div>
          <button
            type="button"
            onClick={closeResearch}
            title="Close (Esc)"
            className="size-7 cursor-pointer rounded-md border-0 bg-transparent text-[18px] leading-none text-muted hover:bg-hover hover:text-ink"
          >
            ×
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-[22px] overflow-auto px-5 pt-4 pb-8">
          <input
            {...field('name')}
            placeholder="Software name"
            className="-ml-1.5 rounded-[5px] border-0 bg-transparent px-1.5 py-1 text-[19px] font-semibold tracking-[-0.015em] outline-none hover:bg-[#f6f6f3] focus:bg-[#f6f6f3]"
          />
          <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-y-2 text-[13px]">
            <span className="text-faint">Status</span>
            <span className="flex items-center gap-2">
              <span className="size-[7px] rounded-full" style={{ background: tone.dot }} />
              <Select
                value={r.status}
                options={RESEARCH_STATUSES.map((x) => ({ v: x, l: x }))}
                onChange={(e) => {
                  const status = e.target.value;
                  run(() => updateResearch(r.id, { status }));
                }}
                size="sm"
              />
            </span>
            <span className="text-faint">Category</span>
            <input {...field('category')} placeholder="e.g. AI tutor, Payments" className={inlineInput} />
            <span className="text-faint">Website</span>
            <span className="flex min-w-0 items-center gap-1.5">
              <input {...field('url')} placeholder="Add link" className={`${inlineInput} flex-1`} />
              {url && (
                <a
                  href={/^https?:/.test(url) ? url : `https://${url}`}
                  target="_blank"
                  rel="noreferrer"
                  // Browser-default underline, as in the prototype (Tailwind's preflight removes it).
                  className="text-md whitespace-nowrap text-muted underline hover:text-ink"
                >
                  Open ↗
                </a>
              )}
            </span>
          </div>

          <div>
            <div className="mb-2">
              <span className={sectionLabel}>Linked projects</span>
            </div>
            <div className="overflow-hidden rounded-lg border border-border">
              {r.projects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => router.push(`/projects/${p.id}`)}
                  className="flex cursor-pointer items-center gap-2.5 border-b border-border-subtle py-2 pr-2 pl-3 hover:bg-surface-hover"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium">{p.name}</div>
                    <div className="truncate text-[12px] text-faint">{p.description ?? ''}</div>
                  </div>
                  <button
                    type="button"
                    title="Unlink"
                    onClick={(e) => {
                      e.stopPropagation();
                      run(() => setResearchProject(r.id, p.id, false));
                    }}
                    className="size-[18px] cursor-pointer rounded-full border-0 bg-transparent p-0 text-[13px] leading-none text-fainter hover:bg-hover hover:text-ink"
                  >
                    ×
                  </button>
                </div>
              ))}
              {!r.projects.length && <div className="px-3 py-3.5 text-md text-faint">Not linked to any project.</div>}
              <div className="bg-surface-sunken px-3 py-2">
                <Select
                  value=""
                  options={[
                    { v: '', l: '+ Link a project' },
                    ...data.projects.filter((p) => !linked.has(p.id)).map((p) => ({ v: p.id, l: p.name })),
                  ]}
                  onChange={(e) => e.target.value && run(() => setResearchProject(r.id, e.target.value, true))}
                  size="sm"
                  variant="dashed"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2">
              <span className={sectionLabel}>Key functionalities</span>
            </div>
            <LiveNoteThread kind="research" id={r.id} notes={data.notes} me={me} onSaved={reload} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-hover px-5 py-3">
          {askDel ? (
            <>
              <span className="mr-auto text-md text-ink-3">Delete this software and its notes?</span>
              <Button label="Cancel" variant="secondary" size="sm" onClick={() => setAskDel(false)} />
              <Button
                label="Delete"
                variant="danger"
                size="sm"
                onClick={() =>
                  startTransition(async () => {
                    await deleteResearch([r.id]);
                    closeResearch();
                  })
                }
              />
            </>
          ) : (
            <Button label="Delete software" variant="ghost" size="sm" onClick={() => setAskDel(true)} />
          )}
        </div>
      </div>
    </>
  );
}

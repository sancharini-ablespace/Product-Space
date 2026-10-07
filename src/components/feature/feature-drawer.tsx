"use client";

// Feature drawer — design/PM Dashboard v3.dc.html (isFeatDrawer). Opens on any page
// whose URL has ?feature=<id>; closes with ×, the scrim, or Esc (after popovers).
import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AddChip } from "@/components/hub/AddChip";
import { Avatar } from "@/components/hub/Avatar";
import { Button } from "@/components/hub/Button";
import { PrioritySelect, type Priority } from "@/components/hub/PrioritySelect";
import { Select } from "@/components/hub/Select";
import { StatusSelect } from "@/components/hub/StatusSelect";
import { LiveNoteThread } from "@/components/live-note-thread";
import { anchorOf, type Anchor } from "@/components/popovers";
import { getFeatureDrawer, setFeatureLink, updateFeature } from "@/lib/actions";
import type { FeatureDrawerData } from "@/lib/feature-view";
import { fmt, memberAv, memberName, pocAv, targetColor, type Av } from "@/lib/hub";
import type { FeatureRow } from "@/lib/queries";
import { DeleteFeaturesDialog } from "./delete-features-dialog";
import { FeaturePicker, type FeatureLinkKind } from "./feature-picker";
import { openPoc } from "@/components/poc/url";
import { closeFeature } from "./url";

const sectionLabel = "text-[11.5px] font-semibold tracking-[0.05em] text-faint uppercase";
const chip = "inline-flex h-[26px] items-center gap-1.5 rounded-[13px] border border-border bg-surface px-1 text-md";
const removeBtn =
  "size-[18px] cursor-pointer rounded-full border-0 bg-transparent p-0 text-[13px] leading-none text-fainter hover:bg-hover hover:text-ink";
const inlineInput =
  "-ml-[7px] min-w-0 rounded-[5px] border border-transparent bg-transparent px-1.5 py-[3px] text-[13px] outline-none hover:border-border-strong focus:border-fainter focus:bg-surface";

export function FeatureDrawerHost({ me }: { me: { id: string; name: string; av: Av } }) {
  const id = useSearchParams().get("feature");
  const [data, setData] = useState<FeatureDrawerData | null>(null);

  const load = useCallback(async (fid: string) => {
    const d = await getFeatureDrawer(fid);
    if (!d) closeFeature();
    setData(d);
  }, []);

  useEffect(() => {
    if (!id) return;
    let live = true;
    getFeatureDrawer(id).then((d) => {
      if (!live) return;
      if (!d) closeFeature();
      setData(d);
    });
    return () => {
      live = false;
    };
  }, [id]);

  if (!id || !data || data.feature.id !== id) return null;
  return <FeatureDrawer key={id} data={data} setData={setData} reload={() => load(id)} me={me} />;
}

function FeatureDrawer({
  data,
  setData,
  reload,
  me,
}: {
  data: FeatureDrawerData;
  setData: (fn: (d: FeatureDrawerData | null) => FeatureDrawerData | null) => void;
  reload: () => Promise<void>;
  me: { id: string; name: string; av: Av };
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [picker, setPicker] = useState<{ kind: FeatureLinkKind; anchor: Anchor } | null>(null);
  const [deleting, setDeleting] = useState<FeatureRow[] | null>(null);
  const [drafts, setDrafts] = useState<{ name?: string; description?: string; stakeholders?: string }>({});
  const f = data.feature;
  const v = f.version;

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) closeFeature();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [deleting]);

  const local = (patch: Partial<FeatureRow>) => setData((d) => (d ? { ...d, feature: { ...d.feature, ...patch } } : d));
  const save = (patch: Partial<FeatureRow>, run: () => Promise<unknown>) =>
    startTransition(async () => {
      local(patch);
      await run();
      await reload();
    });
  const saveText = (key: "name" | "description" | "stakeholders") => {
    const value = drafts[key];
    if (value === undefined || value === (f[key] ?? "")) return setDrafts((d) => ({ ...d, [key]: undefined }));
    save({ [key]: value } as Partial<FeatureRow>, async () => {
      await updateFeature(f.id, { [key]: value });
      setDrafts((d) => ({ ...d, [key]: undefined }));
    });
  };
  const unlink = (kind: FeatureLinkKind, targetId: string) =>
    save({ [kind]: (f[kind] as { id: string }[]).filter((x) => x.id !== targetId) } as Partial<FeatureRow>, () =>
      setFeatureLink(f.id, kind, targetId, false),
    );
  const watching = f.watchers.some((w) => w.id === me.id);
  const you = (m: { id: string; name: string | null; email: string }) =>
    m.id === me.id ? `${memberName(m)} (you)` : memberName(m);

  return (
    <>
      <div onClick={closeFeature} className="fixed inset-0 z-40 bg-scrim" />
      <div className="fixed top-0 right-0 bottom-0 z-[41] flex w-[min(540px,100vw)] flex-col border-l border-border bg-surface shadow-[-12px_0_32px_rgba(28,27,26,0.08)]">
        <div className="flex items-center justify-between gap-3 border-b border-hover py-2.5 pr-3.5 pl-[18px]">
          <div className="flex min-w-0 flex-wrap items-center gap-1 text-md text-faint">
            {v ? (
              <>
                <button
                  type="button"
                  onClick={() => router.push(`/projects/${v.project.id}`)}
                  className="cursor-pointer rounded-[4px] border-0 bg-transparent px-[5px] py-0.5 text-md font-medium text-ink-2 hover:bg-hover"
                >
                  {v.project.name}
                </button>
                <span>→</span>
                <button
                  type="button"
                  onClick={() => router.push(`/projects/${v.project.id}?tab=versions&version=${v.id}`)}
                  className="cursor-pointer rounded-[4px] border-0 bg-transparent px-[5px] py-0.5 text-md font-medium text-ink-2 hover:bg-hover"
                >
                  Version {v.num} — {v.name}
                </button>
              </>
            ) : (
              <Select
                value=""
                options={[
                  { v: "", l: "No project" },
                  ...data.versions.map((x) => ({ v: x.id, l: `${x.project.name} → Version ${x.num} — ${x.name}` })),
                ]}
                onChange={(e) => {
                  const versionId = e.target.value || null;
                  startTransition(async () => {
                    await updateFeature(f.id, { versionId });
                    await reload();
                  });
                }}
                size="sm"
                maxWidth="280px"
              />
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button label="Delete" variant="ghost" size="sm" onClick={() => setDeleting([f])} />
            <Button
              label={watching ? "Unwatch" : "Watch"}
              variant="secondary"
              size="sm"
              onClick={() =>
                save(
                  {
                    watchers: watching
                      ? f.watchers.filter((w) => w.id !== me.id)
                      : [...f.watchers, data.members.find((m) => m.id === me.id)!].filter(Boolean),
                  },
                  () => setFeatureLink(f.id, "watchers", me.id, !watching),
                )
              }
            />
            <button
              type="button"
              onClick={closeFeature}
              title="Close (Esc)"
              className="size-7 cursor-pointer rounded-md border-0 bg-transparent text-[18px] leading-none text-muted hover:bg-hover hover:text-ink"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-[22px] overflow-auto px-5 pt-4 pb-8">
          <div>
            <input
              value={drafts.name ?? f.name}
              onChange={(e) => setDrafts((d) => ({ ...d, name: e.target.value }))}
              onBlur={() => saveText("name")}
              className="-ml-1.5 w-full rounded-[5px] border-0 bg-transparent px-1.5 py-1 text-[19px] font-semibold tracking-[-0.015em] outline-none hover:bg-[#f6f6f3] focus:bg-[#f6f6f3]"
            />
            <textarea
              value={drafts.description ?? f.description ?? ""}
              onChange={(e) => setDrafts((d) => ({ ...d, description: e.target.value }))}
              onBlur={() => saveText("description")}
              placeholder="Add a description…"
              rows={3}
              className="mt-0.5 -ml-1.5 w-full resize-y rounded-[5px] border-0 bg-transparent p-1.5 text-[13.5px] leading-[1.55] text-ink-2 outline-none hover:bg-[#f6f6f3] focus:bg-[#f6f6f3]"
            />
          </div>

          <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-y-2 text-[13px]">
            <span className="text-faint">Status</span>
            <span>
              <StatusSelect
                kind="feature"
                value={f.status}
                onChange={(e) => {
                  const status = e.target.value as FeatureRow["status"];
                  save({ status }, () => updateFeature(f.id, { status }));
                }}
              />
            </span>
            <span className="text-faint">Priority</span>
            <span>
              <PrioritySelect
                value={f.priority as Priority}
                onChange={(e) => {
                  const priority = e.target.value as FeatureRow["priority"];
                  save({ priority }, () => updateFeature(f.id, { priority }));
                }}
              />
            </span>
            <span className="self-start pt-1 text-faint">Owners</span>
            <span className="flex flex-wrap items-center gap-1.5">
              {f.owners.map((o) => (
                <span key={o.id} className={chip}>
                  <Avatar av={memberAv(o)} size={18} />
                  {you(o)}
                  <button type="button" title="Remove" onClick={() => unlink("owners", o.id)} className={removeBtn}>
                    ×
                  </button>
                </span>
              ))}
              <AddChip label="+ Add owner" onClick={(e) => setPicker({ kind: "owners", anchor: anchorOf(e.currentTarget) })} />
            </span>
            <span className="self-start pt-1 text-faint">POCs</span>
            <span className="flex flex-wrap items-center gap-1.5">
              {f.pocs.map((c) => (
                <span
                  key={c.id}
                  title="Open POC"
                  onClick={() => openPoc(c.id)}
                  className={`${chip} cursor-pointer rounded-md! hover:border-border-hover`}
                >
                  <Avatar av={pocAv(c)} size={18} square />
                  {c.name}
                  <span className="text-faint">{c.org ?? ""}</span>
                  <button
                    type="button"
                    title="Remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      unlink("pocs", c.id);
                    }}
                    className={removeBtn}
                  >
                    ×
                  </button>
                </span>
              ))}
              <AddChip label="+ Add POC" onClick={(e) => setPicker({ kind: "pocs", anchor: anchorOf(e.currentTarget) })} />
            </span>
            <span className="text-faint">Stakeholders</span>
            <input
              value={drafts.stakeholders ?? f.stakeholders ?? ""}
              onChange={(e) => setDrafts((d) => ({ ...d, stakeholders: e.target.value }))}
              onBlur={() => saveText("stakeholders")}
              placeholder="Who is this for?"
              className={inlineInput}
            />
            <span className="text-faint">Version target</span>
            <span style={{ color: targetColor(v?.target_date, f.status === "Completed") }}>{fmt(v?.target_date)}</span>
          </div>

          <div>
            <div className={`mb-2 ${sectionLabel}`}>Watchers</div>
            <div className="flex flex-wrap items-center gap-1.5">
              {f.watchers.map((w) => (
                <span key={w.id} className={`${chip} bg-transparent!`}>
                  <Avatar av={memberAv(w)} size={18} />
                  {you(w)}
                  <button type="button" title="Remove watcher" onClick={() => unlink("watchers", w.id)} className={removeBtn}>
                    ×
                  </button>
                </span>
              ))}
              <AddChip label="+ Add watcher" onClick={(e) => setPicker({ kind: "watchers", anchor: anchorOf(e.currentTarget) })} />
            </div>
          </div>

          <div>
            <div className={`mb-2 ${sectionLabel}`}>Notes</div>
            <LiveNoteThread kind="feature" id={f.id} notes={data.notes} me={me} onSaved={reload} />
          </div>

          <div>
            <div className={`mb-1 ${sectionLabel}`}>Activity</div>
            {data.activity.map((a) => (
              <div key={a.id} className="flex gap-2.5 border-b border-[#f4f3ef] py-[7px] text-md leading-[1.45]">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full" style={{ background: a.dot }} />
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{a.who}</span> <span className="text-ink-3">{a.text}</span>
                </div>
                <span className="whitespace-nowrap text-fainter">{a.when}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {picker && (
        <FeaturePicker
          feature={f}
          kind={picker.kind}
          anchor={picker.anchor}
          members={data.members}
          pocOptions={data.pocOptions}
          meId={me.id}
          onLocal={(patch) => {
            local(patch);
            void reload();
          }}
          onClose={() => setPicker(null)}
        />
      )}
      {deleting && (
        <DeleteFeaturesDialog
          features={deleting}
          onCancel={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            closeFeature();
          }}
        />
      )}
    </>
  );
}

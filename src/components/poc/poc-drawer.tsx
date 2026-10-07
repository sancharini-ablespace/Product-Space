"use client";

// POC drawer — design/PM Dashboard v3.dc.html (isPocDrawer). Opens on any page via ?poc=<id>.
import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Avatar } from "@/components/hub/Avatar";
import { Button } from "@/components/hub/Button";
import { Select } from "@/components/hub/Select";
import { StatusPill } from "@/components/hub/StatusPill";
import { getPocDrawer, setFeatureLink, setProjectLink, updatePoc } from "@/lib/actions";
import { pocAv, sortFeatures } from "@/lib/hub";
import type { PocDrawerData } from "@/lib/poc-view";
import { DeletePocsDialog } from "./delete-pocs-dialog";
import { closePoc, openFeatureFromPoc } from "./url";

const sectionLabel = "text-[11.5px] font-semibold tracking-[0.05em] text-faint uppercase";
const inlineInput =
  "-ml-[7px] min-w-0 rounded-[5px] border border-transparent bg-transparent px-1.5 py-[3px] text-[13px] outline-none hover:border-border-strong focus:border-fainter focus:bg-surface";
const listRow =
  "flex cursor-pointer items-center gap-2.5 border-b border-border-subtle py-2 pr-2 pl-3 hover:bg-surface-hover";
const removeBtn =
  "size-[18px] shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0 text-[13px] leading-none text-fainter hover:bg-hover hover:text-ink";

type Field = "name" | "org" | "role" | "email";

export function PocDrawerHost() {
  const id = useSearchParams().get("poc");
  const [data, setData] = useState<PocDrawerData | null>(null);

  const load = useCallback(async (pid: string) => {
    const d = await getPocDrawer(pid);
    if (!d) closePoc();
    setData(d);
  }, []);

  useEffect(() => {
    if (!id) return;
    let live = true;
    getPocDrawer(id).then((d) => {
      if (!live) return;
      if (!d) closePoc();
      setData(d);
    });
    return () => {
      live = false;
    };
  }, [id]);

  if (!id || !data || data.poc.id !== id) return null;
  return <PocDrawer key={id} data={data} reload={() => load(id)} />;
}

function PocDrawer({ data, reload }: { data: PocDrawerData; reload: () => Promise<void> }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [drafts, setDrafts] = useState<Partial<Record<Field, string>>>({});
  const [deleting, setDeleting] = useState(false);
  const c = data.poc;

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) closePoc();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [deleting]);

  const run = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      await fn();
      await reload();
    });
  const saveField = (key: Field) => {
    const value = drafts[key];
    if (value === undefined || value === (c[key] ?? "")) return setDrafts((d) => ({ ...d, [key]: undefined }));
    run(async () => {
      // A blank name is rejected by the action; the field then shows the saved name again.
      await updatePoc(c.id, { [key]: value });
      setDrafts((d) => ({ ...d, [key]: undefined }));
    });
  };
  const field = (key: Field) => ({
    value: drafts[key] ?? c[key] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDrafts((d) => ({ ...d, [key]: e.target.value })),
    onBlur: () => saveField(key),
  });

  const linkedProjects = new Set(c.projects.map((p) => p.id));
  const linkedFeatures = new Set(c.features.map((f) => f.id));
  const open = c.features.filter((f) => f.status !== "Completed").length;

  return (
    <>
      <div onClick={closePoc} className="fixed inset-0 z-40 bg-scrim" />
      <div className="fixed top-0 right-0 bottom-0 z-[41] flex w-[min(540px,100vw)] flex-col border-l border-border bg-surface shadow-[-12px_0_32px_rgba(28,27,26,0.08)]">
        <div className="flex items-center justify-between gap-3 border-b border-hover py-2.5 pr-3.5 pl-5">
          <div className="text-md font-medium text-faint">POC · Customer</div>
          <button
            type="button"
            onClick={closePoc}
            title="Close (Esc)"
            className="size-7 cursor-pointer rounded-md border-0 bg-transparent text-[18px] leading-none text-muted hover:bg-hover hover:text-ink"
          >
            ×
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-[22px] overflow-auto px-5 pt-4 pb-8">
          <div className="flex items-center gap-3">
            <Avatar av={pocAv(c)} size={40} square />
            <input
              {...field("name")}
              className="min-w-0 flex-1 rounded-[5px] border-0 bg-transparent px-1.5 py-1 text-[19px] font-semibold tracking-[-0.015em] outline-none hover:bg-[#f6f6f3] focus:bg-[#f6f6f3]"
            />
          </div>

          <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-y-2 text-[13px]">
            <span className="text-faint">Organization</span>
            <input {...field("org")} placeholder="Add organization" className={inlineInput} />
            <span className="text-faint">Role</span>
            <input {...field("role")} placeholder="Add role" className={inlineInput} />
            <span className="text-faint">Email</span>
            <input {...field("email")} placeholder="Add email" className={inlineInput} />
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <span className={sectionLabel}>Projects</span>
            </div>
            <div className="overflow-hidden rounded-lg border border-border">
              {c.projects.map((p) => (
                <div key={p.id} onClick={() => router.push(`/projects/${p.id}`)} className={listRow}>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium">{p.name}</div>
                    <div className="truncate text-[12px] text-faint">{p.description ?? ""}</div>
                  </div>
                  <button
                    type="button"
                    title="Remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      run(() => setProjectLink(p.id, "pocs", c.id, false));
                    }}
                    className={removeBtn}
                  >
                    ×
                  </button>
                </div>
              ))}
              {!c.projects.length && <div className="px-3 py-3.5 text-md text-faint">Not linked to any project.</div>}
              <div className="bg-surface-sunken px-3 py-2">
                <Select
                  value=""
                  options={[
                    { v: "", l: "+ Link a project" },
                    ...data.projects.filter((p) => !linkedProjects.has(p.id)).map((p) => ({ v: p.id, l: p.name })),
                  ]}
                  onChange={(e) => e.target.value && run(() => setProjectLink(e.target.value, "pocs", c.id, true))}
                  size="sm"
                  variant="dashed"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <span className={sectionLabel}>Requested features</span>
              <span className="text-[12px] text-faint">
                {c.features.length} requested · {open} open
              </span>
            </div>
            <div className="overflow-hidden rounded-lg border border-border">
              {sortFeatures(c.features).map((f) => (
                <div key={f.id} onClick={() => openFeatureFromPoc(f.id)} className={listRow}>
                  <div className="min-w-0 flex-1">
                    <div
                      className="truncate text-[13px] font-medium"
                      style={{ color: f.status === "Completed" ? "var(--faint)" : "var(--ink)" }}
                    >
                      {f.name}
                    </div>
                    <div className="truncate text-[12px] text-faint">
                      {f.version?.project.name ?? "No project"} → {f.version ? `Version ${f.version.num}` : "—"}
                    </div>
                  </div>
                  <StatusPill value={f.status} />
                  <button
                    type="button"
                    title="Remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      run(() => setFeatureLink(f.id, "pocs", c.id, false));
                    }}
                    className={removeBtn}
                  >
                    ×
                  </button>
                </div>
              ))}
              {!c.features.length && <div className="px-3 py-3.5 text-md text-faint">No features linked yet.</div>}
              <div className="bg-surface-sunken px-3 py-2">
                <Select
                  value=""
                  options={[
                    { v: "", l: "+ Link a feature" },
                    ...data.features.filter((f) => !linkedFeatures.has(f.id)).map((f) => ({ v: f.id, l: `${f.projectName} · ${f.name}` })),
                  ]}
                  onChange={(e) => e.target.value && run(() => setFeatureLink(e.target.value, "pocs", c.id, true))}
                  size="sm"
                  variant="dashed"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-hover px-5 py-3">
          <Button label="Delete POC" variant="ghost" size="sm" onClick={() => setDeleting(true)} />
        </div>
      </div>

      {deleting && (
        <DeletePocsDialog
          pocs={[c]}
          onCancel={() => setDeleting(false)}
          onDeleted={() => {
            setDeleting(false);
            closePoc();
          }}
        />
      )}
    </>
  );
}

"use client";

// Create drawer — design/PM Dashboard v3.dc.html (isCreate / openCreate / submitCreate).
// Opens on any page via ?new=project|version|feature|poc, with an optional &parent=.
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { closeDrawer } from "@/components/drawer-url";
import { Button } from "@/components/hub/Button";
import { Select } from "@/components/hub/Select";
import { DatePicker, anchorOf, type Anchor } from "@/components/popovers";
import { createFeature, createPoc, createProject, createVersion, getCreateOptions } from "@/lib/actions";
import { fmt, memberName } from "@/lib/hub";

type Kind = "project" | "version" | "feature" | "poc";
type Options = Awaited<ReturnType<typeof getCreateOptions>>;
type Form = {
  name: string;
  desc: string;
  owner: string;
  parent: string;
  target: string;
  conf: string;
  poc: string;
  priority: string;
  stake: string;
  req: string;
  org: string;
  role: string;
  email: string;
};

const KINDS: Kind[] = ["project", "version", "feature", "poc"];
const TITLE: Record<Kind, string> = { project: "New project", version: "New version", feature: "New feature", poc: "New POC" };
const NAME_PH: Record<Kind, string> = { poc: "e.g. Maria Lopez", project: "e.g. Assessments", version: "e.g. Worksheet Sharing", feature: "e.g. Bulk export" };

const label = "flex flex-col gap-1.5 text-md font-medium text-ink-3";
const input =
  "h-[34px] rounded-md border border-border-strong bg-surface px-2.5 text-[13.5px] font-normal text-ink outline-none focus:border-muted";

/** Removes ?new / ?parent from the URL without a server round trip, keeping the page underneath as it was. */
const closeCreate = () => closeDrawer("new", "parent");

export function CreateDrawerHost({ meId }: { meId: string }) {
  const params = useSearchParams();
  const kind = params.get("new") as Kind | null;
  const parent = params.get("parent");
  const [options, setOptions] = useState<Options | null>(null);

  useEffect(() => {
    if (!kind || !KINDS.includes(kind)) return;
    let live = true;
    getCreateOptions().then((o) => live && setOptions(o));
    return () => {
      live = false;
      // Reload options on every open so newly created projects/versions/POCs are listed.
      setOptions(null);
    };
  }, [kind, parent]);

  if (!kind || !KINDS.includes(kind) || !options) return null;
  return <CreateDrawer key={`${kind}:${parent ?? ""}`} kind={kind} parent={parent} options={options} meId={meId} />;
}

function CreateDrawer({ kind, parent, options, meId }: { kind: Kind; parent: string | null; options: Options; meId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState("");
  const [datePick, setDatePick] = useState<Anchor | null>(null);

  // Defaults as in the prototype's openCreate(): the current project's first open version for a
  // feature opened from a project page, the current (or first) project for a version.
  const pagePid = pathname.startsWith("/projects/") ? pathname.split("/")[2] : null;
  const defParent = (() => {
    if (kind === "version") return pagePid ?? options.projects[0]?.id ?? "";
    if (kind === "feature" && pagePid) {
      const open = options.versions.filter((v) => v.project.id === pagePid && v.status !== "Completed").sort((a, b) => a.num - b.num);
      return open[0]?.id ?? "";
    }
    return "";
  })();
  const [form, setForm] = useState<Form>({
    name: "",
    desc: "",
    owner: meId,
    parent: parent || defParent,
    target: "",
    conf: "50",
    poc: meId,
    priority: "Medium",
    stake: "",
    req: "",
    org: "",
    role: "",
    email: "",
  });
  const set = (key: keyof Form) => (e: { target: { value: string } }) => {
    const v = e.target.value;
    setForm((f) => ({ ...f, [key]: v }));
    setErr("");
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCreate();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  function submit() {
    if (pending) return;
    if (!form.name.trim()) return setErr("Name is required.");
    startTransition(async () => {
      const name = form.name.trim();
      if (kind === "project") {
        const res = await createProject({ name, description: form.desc, ownerId: form.owner || undefined });
        if (res.error) return setErr(res.error);
        router.push(`/projects/${res.id}?tab=versions`);
      } else if (kind === "version") {
        const res = await createVersion({
          projectId: form.parent,
          name,
          description: form.desc,
          targetDate: form.target,
          confidence: form.conf,
        });
        if (res.error) return setErr(res.error);
        router.push(`/projects/${form.parent}?tab=versions&version=${res.id}`);
      } else if (kind === "feature") {
        const res = await createFeature({
          versionId: form.parent || null,
          name,
          description: form.desc,
          priority: form.priority,
          ownerId: form.poc || undefined,
          pocId: form.req || undefined,
          stakeholders: form.stake,
        });
        if (res.error) return setErr(res.error);
        // The prototype stays on the page and opens the new feature's drawer.
        const u = new URL(window.location.href);
        u.searchParams.delete("new");
        u.searchParams.delete("parent");
        u.searchParams.set("feature", res.id!);
        router.replace(`${u.pathname}${u.search}`, { scroll: false });
      } else {
        const res = await createPoc({ name, org: form.org, role: form.role, email: form.email });
        if (res.error) return setErr(res.error);
        // The prototype goes to the POCs page with the new POC's drawer open (POC drawer: Stage 8).
        router.push(`/pocs?poc=${res.id}`);
      }
    });
  }

  const people = options.members.map((m) => ({ v: m.id, l: memberName(m) }));
  const parentEl =
    kind === "version"
      ? options.projects.map((p) => ({ v: p.id, l: p.name }))
      : [{ v: "", l: "No project" }, ...options.versions.map((v) => ({ v: v.id, l: `${v.project.name} → Version ${v.num} — ${v.name}` }))];

  return (
    <>
      <div onClick={closeCreate} className="fixed inset-0 z-40 bg-scrim" />
      <div className="fixed top-0 right-0 bottom-0 z-[41] flex w-[min(540px,100vw)] flex-col border-l border-border bg-surface shadow-[-12px_0_32px_rgba(28,27,26,0.08)]">
        <div className="flex items-center justify-between border-b border-hover py-3 pr-3.5 pl-5">
          <div className="text-[15px] font-semibold">{TITLE[kind]}</div>
          <button
            type="button"
            onClick={closeCreate}
            title="Close (Esc)"
            className="size-7 cursor-pointer rounded-md border-0 bg-transparent text-[18px] leading-none text-muted hover:bg-hover hover:text-ink"
          >
            ×
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3.5 overflow-auto px-5 py-[18px]">
          {(kind === "version" || kind === "feature") && (
            <label className={label}>
              {kind === "version" ? "Project" : "Project → Version (optional)"}
              <Select value={form.parent} options={parentEl} onChange={set("parent")} block />
            </label>
          )}
          <label className={label}>
            Name
            <input
              autoFocus
              value={form.name}
              onChange={set("name")}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder={NAME_PH[kind]}
              className={input}
            />
          </label>
          {err && <div className="-mt-2 text-[12px] text-tone-red-fg">{err}</div>}
          {kind !== "poc" && (
            <label className={label}>
              Description
              <textarea
                value={form.desc}
                onChange={set("desc")}
                rows={3}
                className="resize-y rounded-md border border-border-strong bg-surface px-2.5 py-2 text-[13.5px] leading-normal font-normal text-ink outline-none focus:border-muted"
              />
            </label>
          )}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
            {kind === "project" && (
              <label className={label}>
                Owner
                <Select value={form.owner} options={people} onChange={set("owner")} block />
              </label>
            )}
            {kind === "version" && (
              <>
                <label className={label}>
                  Target date
                  <span
                    className="relative flex h-[34px] cursor-pointer items-center justify-between rounded-md border border-border-strong bg-surface px-2.5 text-[13.5px] font-normal hover:border-border-hover"
                    style={{ color: form.target ? "var(--ink)" : "var(--fainter)" }}
                  >
                    <span>{form.target ? `${fmt(form.target)}, ${form.target.slice(0, 4)}` : "Pick a date"}</span>
                    <span className="text-[11px] text-fainter">▾</span>
                    <span
                      onClick={(e) => {
                        e.preventDefault();
                        setDatePick(anchorOf(e.currentTarget));
                      }}
                      className="absolute inset-0 cursor-pointer"
                    />
                  </span>
                </label>
                <label className={label}>
                  Initial confidence (%)
                  <input type="number" min={0} max={100} step={5} value={form.conf} onChange={set("conf")} className={input} />
                </label>
              </>
            )}
            {kind === "feature" && (
              <>
                <label className={label}>
                  Owner
                  <Select value={form.poc} options={people} onChange={set("poc")} block />
                </label>
                <label className={label}>
                  Priority
                  <Select value={form.priority} options={["High", "Medium", "Low"].map((x) => ({ v: x, l: x }))} onChange={set("priority")} block />
                </label>
                <label className={label}>
                  Stakeholders
                  <input value={form.stake} onChange={set("stake")} placeholder="e.g. Educators" className={input} />
                </label>
                <label className={label}>
                  Requested by (POC)
                  <Select
                    value={form.req}
                    options={[{ v: "", l: "None yet" }, ...options.pocs.map((c) => ({ v: c.id, l: c.name + (c.org ? " · " + c.org : "") }))]}
                    onChange={set("req")}
                    block
                  />
                </label>
              </>
            )}
            {kind === "poc" && (
              <>
                <label className={label}>
                  Organization
                  <input value={form.org} onChange={set("org")} placeholder="e.g. Riverside Unified SD" className={input} />
                </label>
                <label className={label}>
                  Role
                  <input value={form.role} onChange={set("role")} placeholder="e.g. Special Ed Director" className={input} />
                </label>
                <label className={label}>
                  Email
                  <input value={form.email} onChange={set("email")} placeholder="name@district.org" className={input} />
                </label>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-hover px-5 py-3">
          <Button label="Cancel" variant="secondary" onClick={closeCreate} />
          <Button label={kind === "poc" ? "Add POC" : `Create ${kind}`} variant="primary" onClick={submit} />
        </div>
      </div>

      {datePick && (
        <DatePicker
          anchor={datePick}
          value={form.target || null}
          onPick={(iso) => setForm((f) => ({ ...f, target: iso }))}
          onClose={() => setDatePick(null)}
        />
      )}
    </>
  );
}

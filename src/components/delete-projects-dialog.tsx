"use client";

// Project delete confirmation (prototype delAsk kind "project"): impact list computed
// from live data, with "Also delete its N features" (features otherwise move to "No project").
import { useEffect, useState, useTransition } from "react";
import { ConfirmDialog, type ImpactRow } from "@/components/hub/ConfirmDialog";
import { deleteProjects, getProjectDeleteImpact } from "@/lib/actions";
import type { ProjectDeleteImpact } from "@/lib/queries";

const plural = (k: string, c: number) => (c === 1 ? k : k + "s");
const few = (arr: string[]) => {
  const u = [...new Set(arr.filter(Boolean))];
  return u.length ? u.slice(0, 3).join(", ") + (u.length > 3 ? ` +${u.length - 3} more` : "") : "";
};

export function DeleteProjectsDialog({
  ids,
  onCancel,
  onDeleted,
}: {
  ids: string[];
  onCancel: () => void;
  onDeleted: () => void;
}) {
  const [impact, setImpact] = useState<ProjectDeleteImpact | null>(null);
  const [keepF, setKeepF] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let live = true;
    getProjectDeleteImpact(ids).then((r) => {
      if (!live) return;
      if ("error" in r) onCancel();
      else setImpact(r);
    });
    return () => {
      live = false;
    };
  }, [ids, onCancel]);

  if (!impact) return null;

  const n = ids.length;
  const rows: ImpactRow[] = [];
  const add = (text: string, sub = "", tone?: "red" | "amber") => rows.push({ text, sub, tone });
  const { versions: vs, features: fs } = impact;
  if (vs.length) add(`${vs.length} ${plural("version", vs.length)} deleted`, few(vs.map((v) => `V${v.num} — ${v.name}`)), "red");
  let keepLabel = "";
  if (fs.length) {
    keepLabel = `Also delete its ${fs.length} ${plural("feature", fs.length)}`;
    if (keepF) {
      add(`${fs.length} ${plural("feature", fs.length)} kept and moved to “No project”`, few(fs.map((f) => f.name)), "amber");
    } else {
      add(`${fs.length} ${plural("feature", fs.length)} deleted`, few(fs.map((f) => f.name)), "red");
      const people = fs.flatMap((f) => [...f.watchers, ...f.owners]);
      const k = new Set(people).size;
      if (people.length) {
        add(`Removed from My work and watchlists of ${k} ${plural("person", k).replace("persons", "people")}`, few(people));
      }
    }
  }
  if (impact.research.length) {
    const k = impact.research.length;
    add(`Unlinked from ${k} research ${plural("item", k)}`, few(impact.research));
  }
  if (impact.pocs.length) {
    const k = impact.pocs.length;
    add(`Unlinked from ${k} customer ${plural("POC", k)}`, few(impact.pocs) + " — the POCs themselves stay");
  }
  const nn = impact.notes + (keepF ? 0 : impact.featureNotes);
  if (nn) add(`${nn} ${plural("note", nn)} deleted`, "", "red");
  add("Project activity history is removed from the dashboard feed", "", "red");

  return (
    <ConfirmDialog
      title={n === 1 ? `Delete “${impact.projects[0]?.name ?? ""}”?` : `Delete ${n} projects?`}
      impact={rows}
      checkLabel={keepLabel}
      checked={!keepF}
      onCheck={(e) => setKeepF(!e.target.checked)}
      confirmLabel={n === 1 ? "Delete" : `Delete ${n}`}
      onCancel={onCancel}
      onConfirm={() => {
        if (pending) return;
        startTransition(async () => {
          await deleteProjects(ids, !keepF);
          onDeleted();
        });
      }}
    />
  );
}

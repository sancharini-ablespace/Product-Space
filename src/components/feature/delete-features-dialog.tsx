"use client";

// Feature delete confirmation (prototype delAsk kind "feature") with its live impact list.
import { useEffect, useState, useTransition } from "react";
import { ConfirmDialog, type ImpactRow } from "@/components/hub/ConfirmDialog";
import { deleteFeatures, getFeatureNoteCount } from "@/lib/actions";
import { memberName } from "@/lib/hub";
import type { FeatureRow } from "@/lib/queries";

const plural = (k: string, c: number) => (c === 1 ? k : k + "s");
const few = (arr: string[]) => {
  const u = [...new Set(arr.filter(Boolean))];
  return u.length ? u.slice(0, 3).join(", ") + (u.length > 3 ? ` +${u.length - 3} more` : "") : "";
};

export function DeleteFeaturesDialog({
  features: fs,
  onCancel,
  onDeleted,
}: {
  features: FeatureRow[];
  onCancel: () => void;
  onDeleted: () => void;
}) {
  const [notes, setNotes] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const ids = fs.map((f) => f.id);

  useEffect(() => {
    let live = true;
    getFeatureNoteCount(fs.map((f) => f.id)).then((n) => live && setNotes(n));
    return () => {
      live = false;
    };
  }, [fs]);

  if (notes === null) return null;

  const n = fs.length;
  const rows: ImpactRow[] = [];
  const add = (text: string, sub = "", tone?: "red") => rows.push({ text, sub, tone });
  const vs = [...new Map(fs.filter((f) => f.version).map((f) => [f.version!.id, f.version!])).values()];
  if (vs.length) {
    add(`Progress will recalculate for ${vs.length} ${plural("version", vs.length)}`, few(vs.map((v) => `${v.project.name} · V${v.num}`)));
  }
  const ow = fs.flatMap((f) => f.owners.map(memberName));
  if (ow.length) add(`Removed from My work for ${new Set(ow).size} ${plural("owner", new Set(ow).size)}`, few(ow));
  const wa = fs.flatMap((f) => f.watchers.map(memberName));
  if (wa.length) add(`Removed from ${new Set(wa).size} ${plural("watchlist", new Set(wa).size)}`, few(wa));
  const pc = fs.flatMap((f) => f.pocs.map((c) => c.name));
  if (pc.length) {
    const k = new Set(pc).size;
    add(`Unlinked from ${k} customer ${plural("POC", k)}`, few(pc) + " — the POCs themselves stay");
  }
  if (notes) add(`${notes} ${plural("note", notes)} and attachments deleted`, "", "red");
  add(
    n === 1 ? "The feature and its activity links are removed permanently" : "The features and their activity links are removed permanently",
    "",
    "red",
  );

  return (
    <ConfirmDialog
      title={n === 1 ? `Delete “${fs[0]?.name ?? ""}”?` : `Delete ${n} features?`}
      impact={rows}
      confirmLabel={n === 1 ? "Delete" : `Delete ${n}`}
      onCancel={onCancel}
      onConfirm={() => {
        if (pending) return;
        startTransition(async () => {
          await deleteFeatures(ids);
          onDeleted();
        });
      }}
    />
  );
}

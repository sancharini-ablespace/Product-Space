"use client";

// POC delete confirmation (prototype delAsk kind "poc"): the POC is unlinked everywhere;
// its features and projects stay.
import { useTransition } from "react";
import { ConfirmDialog, type ImpactRow } from "@/components/hub/ConfirmDialog";
import { deletePocs } from "@/lib/actions";
import type { PocRow } from "@/lib/queries";

const plural = (k: string, c: number) => (c === 1 ? k : k + "s");
const few = (arr: string[]) => {
  const u = [...new Set(arr.filter(Boolean))];
  return u.length ? u.slice(0, 3).join(", ") + (u.length > 3 ? ` +${u.length - 3} more` : "") : "";
};

export function DeletePocsDialog({
  pocs,
  onCancel,
  onDeleted,
}: {
  pocs: PocRow[];
  onCancel: () => void;
  onDeleted: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const n = pocs.length;
  const rows: ImpactRow[] = [];
  const fs = [...new Map(pocs.flatMap((c) => c.features).map((f) => [f.id, f])).values()];
  const ps = [...new Map(pocs.flatMap((c) => c.projects).map((p) => [p.id, p])).values()];
  if (fs.length) {
    rows.push({ text: `Removed as requester from ${fs.length} ${plural("feature", fs.length)}`, sub: few(fs.map((f) => f.name)) + " — the features stay" });
  }
  if (ps.length) rows.push({ text: `Removed as POC from ${ps.length} ${plural("project", ps.length)}`, sub: few(ps.map((p) => p.name)) });
  if (!fs.length && !ps.length) rows.push({ text: "Not linked to any feature or project — nothing else changes" });
  rows.push({ text: "Contact details are removed permanently", tone: "red" });

  return (
    <ConfirmDialog
      title={n === 1 ? `Delete “${pocs[0]?.name ?? ""}”?` : `Delete ${n} POCs?`}
      impact={rows}
      confirmLabel={n === 1 ? "Delete" : `Delete ${n}`}
      onCancel={onCancel}
      onConfirm={() => {
        if (pending) return;
        startTransition(async () => {
          await deletePocs(pocs.map((c) => c.id));
          onDeleted();
        });
      }}
    />
  );
}

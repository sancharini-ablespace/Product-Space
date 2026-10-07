"use client";

// Row ⋯ menu (prototype mnOpen): Add watcher ›, Archive / Restore from archive, Delete.
import { useEffect, useState } from "react";
import { Avatar } from "@/components/hub/Avatar";
import type { Anchor } from "@/components/popovers";
import { memberAv, memberName } from "@/lib/hub";
import type { FeatureRow } from "@/lib/queries";
import type { TeamMember } from "./feature-picker";

const item =
  "flex h-8 w-full cursor-pointer items-center gap-2 rounded-[5px] border-0 bg-transparent px-2.5 text-left text-[13px] text-ink hover:bg-surface-muted";

const Chevron = ({ d }: { d: string }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d={d} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function FeatureRowMenu({
  feature,
  anchor,
  members,
  meId,
  onToggleWatcher,
  onArchive,
  onDelete,
  onClose,
}: {
  feature: FeatureRow;
  anchor: Anchor;
  members: TeamMember[];
  meId: string;
  onToggleWatcher: (userId: string, on: boolean) => void;
  onArchive: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [view, setView] = useState<"main" | "watch">("main");
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  }, [onClose]);

  const H = view === "watch" ? 330 : 130;
  const left = Math.max(8, Math.min(anchor.right - 208, window.innerWidth - 216));
  const top = anchor.bottom + H > window.innerHeight ? Math.max(8, anchor.top - H - 4) : anchor.bottom + 4;
  const watching = new Set(feature.watchers.map((w) => w.id));

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-[70]" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="fixed z-[71] w-[208px] rounded-lg border border-border bg-surface p-1 shadow-[0_10px_28px_var(--scrim)]"
        style={{ left, top }}
      >
        {view === "main" ? (
          <>
            <button type="button" onClick={() => setView("watch")} className={`${item} justify-between`}>
              <span>Add watcher</span>
              <span className="text-[#8a8882]">
                <Chevron d="M3.5 2 L6.5 5 L3.5 8" />
              </span>
            </button>
            <button type="button" onClick={onArchive} className={item}>
              {feature.archived_at ? "Restore from archive" : "Archive"}
            </button>
            <div className="my-1 h-px bg-hover" />
            <button type="button" onClick={onDelete} className={`${item} text-tone-red-fg! hover:bg-[oklch(0.965_0.02_25)]`}>
              Delete
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setView("main")} className={`${item} text-[12px] font-medium text-muted!`}>
              <Chevron d="M6.5 2 L3.5 5 L6.5 8" />
              Watchers
            </button>
            <div className="max-h-[260px] overflow-auto">
              {members.map((m) => {
                const on = watching.has(m.id);
                return (
                  <button key={m.id} type="button" onClick={() => onToggleWatcher(m.id, !on)} className={item}>
                    <Avatar av={memberAv(m)} size={20} />
                    <span className="flex-1">{m.id === meId ? `${memberName(m)} (you)` : memberName(m)}</span>
                    <span className="text-[12px] font-semibold text-ink">{on ? "✓" : ""}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}

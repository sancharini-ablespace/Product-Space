"use client";

// design/EmptyState.dc.html — used where design/PM Dashboard v31.dc.html shows an empty state.
import { useRouter } from "next/navigation";
import { Button } from "@/components/hub/Button";

const P = {
  folder: "M2.5 5.5a1 1 0 0 1 1-1h4l1.5 1.5h7.5a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1z",
  layers: "M10 3l7 4-7 4-7-4zM3 11l7 4 7-4",
  list: "M7 5.5h9M7 10h9M7 14.5h9M3.5 5.5h.01M3.5 10h.01M3.5 14.5h.01",
  eye: "M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10zM10 12.3a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6z",
  user: "M10 10a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM3.8 16.5c.9-2.7 3.3-4.2 6.2-4.2s5.3 1.5 6.2 4.2",
  users:
    "M7.5 9.5a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6zM2.5 16c.7-2.4 2.6-3.7 5-3.7s4.3 1.3 5 3.7M13 4.2a2.6 2.6 0 0 1 0 5M14.5 12.6c1.5.5 2.5 1.6 3 3.4",
  search: "M9 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM17 17l-3.6-3.6",
  flask: "M8 2.5h4M8.5 2.5v5L4 15.5a1 1 0 0 0 .9 1.5h10.2a1 1 0 0 0 .9-1.5L11.5 7.5v-5M6 12.5h8",
  pulse: "M2.5 10h3l2-5 3.5 10 2-5h4.5",
  flag: "M4.5 17V3.5M4.5 4h9.5l-2 3.5 2 3.5H4.5",
  filter: "M3 5h14M5.5 10h9M8 15h4",
};
export type EmptyIcon = keyof typeof P | "";

export function EmptyState({
  icon = "folder",
  title = "No projects yet",
  body = "Projects group versions and features. Create one to start planning.",
  size = "md",
  bordered = false,
  actionLabel = "",
  actionVariant = "primary",
  onAction,
  actionHref,
  secondaryLabel = "",
  onSecondary,
  secondaryHref,
}: {
  icon?: EmptyIcon;
  title?: string;
  body?: string;
  size?: "md" | "sm";
  bordered?: boolean;
  actionLabel?: string;
  actionVariant?: "primary" | "secondary";
  onAction?: () => void;
  /** Navigates instead of onAction (for server-rendered pages). */
  actionHref?: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryHref?: string;
}) {
  const router = useRouter();
  const sm = size === "sm";
  const d = icon ? P[icon] : undefined;
  const px = sm ? 16 : 20;
  const go = (fn?: () => void, href?: string) => () => (href ? router.push(href) : fn?.());

  return (
    <div
      className="flex flex-col items-center gap-1.5 rounded-lg text-center font-sans"
      style={{
        padding: sm ? "24px 16px" : "56px 24px",
        background: bordered ? "var(--surface)" : "transparent",
        border: bordered ? "1px solid var(--border)" : "0",
      }}
    >
      {d && (
        <div
          className="mb-2 flex items-center justify-center rounded-[10px] border border-border bg-surface-sunken text-faint"
          style={{ width: sm ? 32 : 40, height: sm ? 32 : 40 }}
        >
          <svg width={px} height={px} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d={d} />
          </svg>
        </div>
      )}
      <div
        className="font-semibold tracking-[-0.005em] text-balance text-ink"
        style={{ fontSize: sm ? "var(--fs-base)" : "var(--fs-xl)" }}
      >
        {title}
      </div>
      {body && <div className="max-w-[380px] text-base leading-[1.5] text-pretty text-muted">{body}</div>}
      {(actionLabel || secondaryLabel) && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {secondaryLabel && <Button label={secondaryLabel} variant="secondary" onClick={go(onSecondary, secondaryHref)} />}
          {actionLabel && <Button label={actionLabel} variant={actionVariant} onClick={go(onAction, actionHref)} />}
        </div>
      )}
    </div>
  );
}

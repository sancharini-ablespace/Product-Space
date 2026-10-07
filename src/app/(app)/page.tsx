// Dashboard — design/PM Dashboard v3.dc.html (isDash); empty states from PM Dashboard v31.dc.html.
import Link from "next/link";
import { NavButton, NewButton } from "@/components/new-button";
import { Confidence } from "@/components/hub/Confidence";
import { EmptyState } from "@/components/hub/EmptyState";
import { ProgressBar } from "@/components/hub/ProgressBar";
import { active, currentVersion, progress } from "@/lib/derive";
import { ACT_TONE, T, days, fmt, rel } from "@/lib/hub";
import { listActivity, listFeatures, listProjects } from "@/lib/queries";
import { requireProfile, requireUserWith } from "@/lib/session";

const PROJECT_COLS = "grid-cols-[minmax(150px,1.5fr)_minmax(90px,0.9fr)_minmax(120px,1fr)_90px_64px_96px]";
const UPCOMING_COLS = "grid-cols-[minmax(200px,1.6fr)_72px_minmax(110px,1fr)_90px]";

const card = "overflow-hidden rounded-lg border border-border bg-surface";
const cardHead = "flex items-center justify-between border-b border-hover px-4 py-2.5";
const cardTitle = "text-[13.5px] font-semibold";

export default async function DashboardPage() {
  const [me, [projects, features, activity]] = await requireUserWith(() =>
    Promise.all([listProjects(), listFeatures({ archived: false }), listActivity({ limit: 9 })]),
  );
  const profile = await requireProfile();

  // Prototype: openF, myOpen, watching, upcoming, activeP, blockedN, dueSoon, myBlocked.
  const openF = features.filter((f) => f.status !== "Completed");
  const myOpen = openF.filter((f) => f.owners.some((o) => o.id === me.id));
  const watching = features.filter((f) => f.watchers.some((w) => w.id === me.id));
  const versions = projects.flatMap((p) => p.versions.map((v) => ({ ...v, project: p })));
  const upcoming = versions
    .filter((v) => v.status !== "Completed")
    .sort((a, b) => (a.target_date || "9999").localeCompare(b.target_date || "9999"));
  const activeP = projects.filter((p) => p.status === "Active");
  const blockedN = openF.filter((f) => f.status === "Blocked").length;
  const dueSoon = myOpen.filter((f) => f.version?.target_date && days(f.version.target_date) <= 14).length;
  const myBlocked = myOpen.filter((f) => f.status === "Blocked").length;

  const summary = [
    { label: "Active projects", value: activeP.length, sub: `${projects.length - activeP.length} planned`, red: false, href: "/projects" },
    { label: "Upcoming versions", value: upcoming.length, sub: upcoming[0] ? `Next: ${fmt(upcoming[0].target_date)}` : "", red: false, href: "/projects" },
    { label: "Open features", value: openF.length, sub: blockedN ? `${blockedN} blocked` : "None blocked", red: !!blockedN, href: "/features" },
    {
      label: "My features",
      value: myOpen.length,
      sub: myBlocked ? `${myBlocked} blocked` : `${dueSoon} shipping in 2 weeks`,
      red: !!myBlocked,
      href: "/my-work",
    },
    {
      label: "Watching",
      value: watching.length,
      sub: `${watching.filter((f) => f.status === "Blocked").length} blocked`,
      red: false,
      href: "/watchlist",
    },
  ];

  // Active projects table (prototype eP over activeP).
  const dashProjects = activeP.map((p) => {
    const cur = currentVersion(p.versions);
    const projectFeatures = active(p.versions.flatMap((v) => v.features));
    return {
      id: p.id,
      name: p.name,
      curLabel: cur ? `Version ${cur.num}` : "—",
      prog: cur ? progress(active(cur.features)) : 0,
      conf: cur?.confidence,
      target: fmt(cur?.target_date),
      open: projectFeatures.filter((f) => f.status !== "Completed").length,
    };
  });

  const tz = profile?.timezone || "Asia/Kolkata";
  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: tz });

  return (
    <div className="flex max-w-[1320px] flex-col gap-5 px-[clamp(16px,4vw,32px)] pt-6 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-md text-faint">{todayLabel}</div>
          <h1 className="mt-1 mb-0 text-[20px] font-semibold tracking-[-0.015em]">Dashboard</h1>
        </div>
        <div className="flex gap-2">
          <NewButton label="+ New feature" href="/?new=feature" variant="secondary" />
          <NewButton label="+ New project" href="/?new=project" />
        </div>
      </div>

      {/* v31 dashFresh: nothing planned yet. */}
      {!projects.length && !features.length ? (
        <EmptyState
          icon="layers"
          title="Nothing planned yet"
          body="Create a project to plan versions and features, or capture a standalone feature request now and file it under a project later."
          actionLabel="+ New project"
          actionHref="/?new=project"
          secondaryLabel="+ New feature"
          secondaryHref="/?new=feature"
          bordered
        />
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
            {summary.map((c) => (
              <Link
                key={c.label}
                href={c.href}
                className="flex cursor-pointer flex-col gap-1 rounded-lg border border-border bg-surface px-3.5 py-3 text-left text-ink no-underline hover:border-[#cfcdc8]! hover:text-ink"
              >
                <span className="text-[12px] font-medium text-muted">{c.label}</span>
                <span className="text-[24px] font-semibold tracking-[-0.02em] tabular-nums">{c.value}</span>
                <span className="min-h-4 text-[12px]" style={{ color: c.red ? T.red.fg : "var(--faint)" }}>
                  {c.sub}
                </span>
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-start gap-5">
            <div className="flex min-w-0 flex-[2_1_620px] flex-col gap-5">
              <div className={card}>
                <div className={cardHead}>
                  <div className={cardTitle}>Active projects</div>
                  <NavButton label="View all" href="/projects" variant="ghost" size="sm" />
                </div>
                <div className="overflow-x-auto">
                  <div className="min-w-[710px]">
                    <div className={`grid ${PROJECT_COLS} gap-3 border-b border-hover px-4 py-2 text-[12px] font-medium text-faint`}>
                      <span>Project</span>
                      <span>Version</span>
                      <span>Progress</span>
                      <span>Confidence</span>
                      <span>Target</span>
                      <span className="text-right">Open features</span>
                    </div>
                    {dashProjects.map((x) => (
                      <Link
                        key={x.id}
                        href={`/projects/${x.id}`}
                        className={`grid ${PROJECT_COLS} h-[42px] cursor-pointer items-center gap-3 border-b border-border-subtle px-4 text-[13px] text-ink no-underline hover:bg-surface-hover hover:text-ink`}
                      >
                        <span className="font-medium">{x.name}</span>
                        <span className="text-ink-3">{x.curLabel}</span>
                        <ProgressBar value={x.prog} maxWidth={96} />
                        {x.conf === undefined ? <span className="text-ink-3">—</span> : <Confidence value={x.conf} />}
                        <span className="text-ink-3">{x.target}</span>
                        <span className="text-right tabular-nums">{x.open}</span>
                      </Link>
                    ))}
                    {!activeP.length && (
                      <EmptyState
                        icon="folder"
                        size="sm"
                        title="No active projects"
                        body="Projects show here once they move to Active."
                        actionLabel="View projects"
                        actionVariant="secondary"
                        actionHref="/projects"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className={card}>
                <div className={`${cardHead} h-[47px]`}>
                  <div className={cardTitle}>Upcoming versions</div>
                  <span className="text-[12px] text-faint">By target date</span>
                </div>
                <div className="overflow-x-auto">
                  <div className="min-w-[560px]">
                    <div className={`grid ${UPCOMING_COLS} gap-3 border-b border-hover px-4 py-2 text-[12px] font-medium text-faint`}>
                      <span>Version</span>
                      <span>Target</span>
                      <span>Progress</span>
                      <span>Confidence</span>
                    </div>
                    {upcoming.slice(0, 6).map((v) => (
                      <Link
                        key={v.id}
                        href={`/projects/${v.project.id}?tab=versions&version=${v.id}`}
                        className={`grid ${UPCOMING_COLS} cursor-pointer items-center gap-3 border-b border-border-subtle px-4 py-[7px] text-[13px] text-ink no-underline hover:bg-surface-hover hover:text-ink`}
                      >
                        <div className="min-w-0">
                          <div className="font-medium">
                            {v.project.name} <span className="font-normal text-faint">· Version {v.num}</span>
                          </div>
                          <div className="truncate text-[12px] text-muted">{v.name}</div>
                        </div>
                        <span className="text-ink-3">{fmt(v.target_date)}</span>
                        <ProgressBar value={progress(active(v.features))} maxWidth={96} />
                        <Confidence value={v.confidence} />
                      </Link>
                    ))}
                    {!upcoming.length && (
                      <EmptyState icon="flag" size="sm" title="No upcoming versions" body="Add a version with a target date to a project to track it here." />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className={`${card} min-w-0 flex-[1_1_300px]`}>
              <div className={`${cardHead} h-[47px]`}>
                <div className={cardTitle}>Recent activity</div>
              </div>
              <div className="px-4 pt-1 pb-2">
                {!activity.length && (
                  <EmptyState
                    icon="pulse"
                    size="sm"
                    title="No activity yet"
                    body="Status changes, new features and notes from your team will appear here."
                  />
                )}
                {activity.map((a) => (
                  <Link
                    key={a.id}
                    // Prototype: open the feature drawer if the feature still exists, otherwise the project.
                    href={a.feature_id ? `/?feature=${a.feature_id}` : a.project_id ? `/projects/${a.project_id}` : "/"}
                    className="flex cursor-pointer gap-2.5 border-b border-border-subtle py-[9px] text-ink no-underline hover:text-ink"
                  >
                    <span
                      className="mt-1.5 size-1.5 shrink-0 rounded-full"
                      style={{ background: T[ACT_TONE[a.type] || "gray"].dot }}
                    />
                    <div className="min-w-0 text-[13px] leading-[1.45]">
                      <div>
                        <span className="font-medium">{a.actor ? (a.actor.name ?? a.actor.email) : ""}</span>{" "}
                        <span className="text-ink-2">{a.text}</span>
                      </div>
                      <div className="text-[12px] text-fainter">
                        {a.project?.name ?? ""} · {rel(a.created_at)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

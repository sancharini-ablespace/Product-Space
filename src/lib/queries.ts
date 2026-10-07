import "server-only";
import { db, unwrap } from "./supabase";
import type {
  Activity,
  ConfidenceChange,
  Feature,
  Member,
  Note,
  NoteAttachment,
  NoteParent,
  Poc,
  Project,
  ResearchItem,
  SavedFilter,
  User,
  Version,
} from "./types";

// ---------------------------------------------------------------------------
// Select fragments and row shapes
// ---------------------------------------------------------------------------
const MEMBER = "id, name, email";

const FEATURE = `*,
  version:versions(id, num, name, status, target_date, project_id, project:projects(id, name)),
  owners:feature_owners(created_at, user:users(${MEMBER})),
  watchers:feature_watchers(created_at, user:users(${MEMBER})),
  pocs:feature_pocs(created_at, poc:pocs(*))`;

const NOTE = `*, author:users(${MEMBER}), attachments:note_attachments(*)`;

type Linked<K extends string, T> = { created_at: string } & Record<K, T>;
const byLinkOrder = <T extends { created_at: string }>(rows: T[]) =>
  [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));

export type FeatureVersion = Pick<Version, "id" | "num" | "name" | "status" | "target_date" | "project_id"> & {
  project: Pick<Project, "id" | "name">;
};

/** A feature with everything the tables, drawer and filters show. */
export type FeatureRow = Feature & {
  version: FeatureVersion | null;
  owners: Member[];
  watchers: Member[];
  pocs: Poc[];
};

type RawFeature = Feature & {
  version: FeatureVersion | null;
  owners: Linked<"user", Member>[];
  watchers: Linked<"user", Member>[];
  pocs: Linked<"poc", Poc>[];
};

function toFeatureRow(f: RawFeature): FeatureRow {
  return {
    ...f,
    owners: byLinkOrder(f.owners).map((o) => o.user),
    watchers: byLinkOrder(f.watchers).map((w) => w.user),
    pocs: byLinkOrder(f.pocs).map((p) => p.poc),
  };
}

export type NoteRow = Note & { author: Member | null; attachments: NoteAttachment[] };

export type ActivityRow = Activity & {
  actor: Member | null;
  project: Pick<Project, "id" | "name"> | null;
};

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------
/**
 * Who counts as a team member: anyone who has set up their account. A member whose password
 * a teammate reset has no password until they set a new one, but keeps activated_at.
 */
export const IS_MEMBER = "password_hash.not.is.null,activated_at.not.is.null";

/** Active team members (pending invites excluded), for owner/watcher pickers. */
export async function listMembers(): Promise<(Member & { role_title: string | null })[]> {
  return unwrap(
    await db()
      .from("users")
      .select(`${MEMBER}, role_title`)
      .or(IS_MEMBER)
      .order("name", { nullsFirst: false }),
  );
}

export type TeamRow = Omit<User, "notify_watch" | "notify_conf" | "timezone" | "password_changed_at"> & {
  active: boolean;
  inviter: Pick<Member, "name" | "email"> | null;
};

/** Every user row: active members and pending invites (rows with no password). */
export async function listTeam(): Promise<TeamRow[]> {
  const rows = unwrap(
    await db()
      .from("users")
      .select(
        `${MEMBER}, role_title, invite_role, invited_by, activated_at, created_at, password_hash,
         inviter:users!invited_by(name, email)`,
      )
      .order("created_at"),
  ) as unknown as (TeamRow & { password_hash: string | null })[];
  // Never pass hashes on. A member has activated their account at some point (a teammate may
  // have reset their password since); a pending invite never has.
  return rows.map(({ password_hash, ...u }) => ({ ...u, active: !!password_hash || !!u.activated_at }));
}

/** Per-member counts for the Team table: projects owned, open features owned, features watched. */
export async function teamCounts(): Promise<Record<string, { owns: number; ownerOf: number; watching: number }>> {
  const [po, fo, fw] = await Promise.all([
    db().from("project_owners").select("user_id"),
    db().from("feature_owners").select("user_id, feature:features!inner(status, archived_at)").is("feature.archived_at", null),
    db().from("feature_watchers").select("user_id, feature:features!inner(archived_at)").is("feature.archived_at", null),
  ]);
  const out: Record<string, { owns: number; ownerOf: number; watching: number }> = {};
  const at = (id: string) => (out[id] ??= { owns: 0, ownerOf: 0, watching: 0 });
  for (const r of unwrap(po)) at(r.user_id).owns++;
  for (const r of unwrap(fo) as unknown as { user_id: string; feature: { status: string } }[]) {
    if (r.feature.status !== "Completed") at(r.user_id).ownerOf++;
  }
  for (const r of unwrap(fw)) at(r.user_id).watching++;
  return out;
}

export async function getProfile(userId: string): Promise<User | null> {
  return unwrap(
    await db()
      .from("users")
      .select(
        `${MEMBER}, role_title, timezone, notify_watch, notify_conf, password_changed_at,
         invite_role, invited_by, activated_at, created_at`,
      )
      .eq("id", userId)
      .maybeSingle(),
  ) as User | null;
}

// ---------------------------------------------------------------------------
// Projects and versions
// ---------------------------------------------------------------------------
export type VersionSummary = Version & {
  features: Pick<Feature, "id" | "status" | "archived_at">[];
};

export type ProjectSummary = Project & {
  owners: Member[];
  pocs: Poc[];
  versions: VersionSummary[];
};

type RawProject = Project & {
  owners: Linked<"user", Member>[];
  pocs: Linked<"poc", Poc>[];
  versions: VersionSummary[];
};

const PROJECT_LINKS = `*,
  owners:project_owners(created_at, user:users(${MEMBER})),
  pocs:project_pocs(created_at, poc:pocs(*))`;
const PROJECT = `${PROJECT_LINKS}, versions(*, features(id, status, archived_at))`;

function toProjectSummary(p: RawProject): ProjectSummary {
  return {
    ...p,
    owners: byLinkOrder(p.owners).map((o) => o.user),
    pocs: byLinkOrder(p.pocs).map((x) => x.poc),
    versions: [...p.versions].sort((a, b) => a.num - b.num),
  };
}

/** All projects with owners, POCs and versions (with feature statuses for progress). */
export async function listProjects(): Promise<ProjectSummary[]> {
  const rows = unwrap(await db().from("projects").select(PROJECT).order("created_at")) as unknown as RawProject[];
  return rows.map(toProjectSummary);
}

export type ConfidenceChangeRow = ConfidenceChange & { by: Member | null };

export type VersionDetail = VersionSummary & {
  history: ConfidenceChangeRow[];
  notes: NoteRow[];
};

export type ProjectDetail = Omit<ProjectSummary, "versions"> & {
  versions: VersionDetail[];
  notes: NoteRow[];
  features: FeatureRow[];
  archivedFeatures: FeatureRow[];
};

/** One project with versions (confidence history + notes), notes and features. */
export async function getProject(id: string): Promise<ProjectDetail | null> {
  const row = unwrap(
    await db()
      .from("projects")
      .select(
        `${PROJECT_LINKS},
         versions(*, features(id, status, archived_at),
           history:confidence_history(*, by:users(${MEMBER})),
           notes(${NOTE})),
         notes(${NOTE})`,
      )
      .eq("id", id)
      .maybeSingle(),
  ) as unknown as (RawProject & { versions: VersionDetail[]; notes: NoteRow[] }) | null;
  if (!row) return null;

  const versionIds = row.versions.map((v) => v.id);
  const [features, archivedFeatures] = await Promise.all([
    listFeatures({ versionIds, archived: false }),
    listFeatures({ versionIds, archived: true }),
  ]);
  const newestFirst = <T extends { created_at: string }>(xs: T[]) =>
    [...xs].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return {
    ...toProjectSummary(row),
    versions: [...row.versions]
      .sort((a, b) => a.num - b.num)
      .map((v) => ({ ...v, history: newestFirst(v.history), notes: newestFirst(v.notes) })),
    notes: newestFirst(row.notes),
    features,
    archivedFeatures,
  };
}

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------
export type FeatureFilter = {
  /** Only features in these versions. */
  versionIds?: string[];
  /** true = archived only, false = active only, undefined = both. */
  archived?: boolean;
  ownerId?: string;
  watcherId?: string;
};

async function featureIdsFor(table: "feature_owners" | "feature_watchers", userId: string) {
  const rows = unwrap(await db().from(table).select("feature_id").eq("user_id", userId));
  return rows.map((r) => r.feature_id as string);
}

/** Features with version/project, owners, watchers and POCs. */
export async function listFeatures(filter: FeatureFilter = {}): Promise<FeatureRow[]> {
  let ids: string[] | null = null;
  if (filter.ownerId) ids = await featureIdsFor("feature_owners", filter.ownerId);
  if (filter.watcherId) {
    const w = await featureIdsFor("feature_watchers", filter.watcherId);
    ids = ids ? ids.filter((x) => w.includes(x)) : w;
  }
  if (ids && !ids.length) return [];
  if (filter.versionIds && !filter.versionIds.length) return [];

  let q = db().from("features").select(FEATURE);
  if (ids) q = q.in("id", ids);
  if (filter.versionIds) q = q.in("version_id", filter.versionIds);
  if (filter.archived === true) q = q.not("archived_at", "is", null);
  if (filter.archived === false) q = q.is("archived_at", null);
  const rows = unwrap(await q.order("created_at")) as unknown as RawFeature[];
  return rows.map(toFeatureRow);
}

export type FeatureDetail = FeatureRow & { notes: NoteRow[]; activity: ActivityRow[] };

/** One feature with its notes and activity, for the feature drawer. */
export async function getFeature(id: string): Promise<FeatureDetail | null> {
  const row = unwrap(
    await db()
      .from("features")
      .select(`${FEATURE}, notes(${NOTE})`)
      .eq("id", id)
      .maybeSingle(),
  ) as unknown as (RawFeature & { notes: NoteRow[] }) | null;
  if (!row) return null;
  const activity = await listActivity({ featureId: id, limit: 100 });
  return {
    ...toFeatureRow(row),
    notes: [...row.notes].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    activity,
  };
}

// ---------------------------------------------------------------------------
// Customer POCs
// ---------------------------------------------------------------------------
export type PocRow = Poc & {
  projects: Pick<Project, "id" | "name" | "description">[];
  features: FeatureRow[];
};

/** POCs with linked projects and requested features. */
export async function listPocs(): Promise<PocRow[]> {
  const [pocs, features] = await Promise.all([
    unwrap(
      await db()
        .from("pocs")
        .select("*, projects:project_pocs(created_at, project:projects(id, name, description))")
        .order("created_at"),
    ) as unknown as (Poc & { projects: Linked<"project", Pick<Project, "id" | "name" | "description">>[] })[],
    listFeatures({ archived: false }),
  ]);
  return pocs.map((c) => ({
    ...c,
    projects: byLinkOrder(c.projects).map((x) => x.project),
    features: features.filter((f) => f.pocs.some((p) => p.id === c.id)),
  }));
}

export async function getPoc(id: string): Promise<PocRow | null> {
  const all = await listPocs();
  return all.find((c) => c.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// Research
// ---------------------------------------------------------------------------
export type ResearchRow = ResearchItem & {
  projects: Pick<Project, "id" | "name" | "description">[];
  notes: NoteRow[];
};

const RESEARCH = `*,
  projects:research_projects(created_at, project:projects(id, name, description)),
  notes(${NOTE})`;

type RawResearch = ResearchItem & {
  projects: Linked<"project", Pick<Project, "id" | "name" | "description">>[];
  notes: NoteRow[];
};

function toResearchRow(r: RawResearch): ResearchRow {
  return {
    ...r,
    projects: byLinkOrder(r.projects).map((x) => x.project),
    notes: [...r.notes].sort((a, b) => b.created_at.localeCompare(a.created_at)),
  };
}

/** Research items, newest first, with linked projects and notes. */
export async function listResearch(): Promise<ResearchRow[]> {
  const rows = unwrap(
    await db().from("research_items").select(RESEARCH).order("created_at", { ascending: false }),
  ) as unknown as RawResearch[];
  return rows.map(toResearchRow);
}

export async function getResearch(id: string): Promise<ResearchRow | null> {
  const row = unwrap(
    await db().from("research_items").select(RESEARCH).eq("id", id).maybeSingle(),
  ) as unknown as RawResearch | null;
  return row ? toResearchRow(row) : null;
}

// ---------------------------------------------------------------------------
// Notes and attachments
// ---------------------------------------------------------------------------
const PARENT_COLUMN = { project: "project_id", version: "version_id", feature: "feature_id", research: "research_id" } as const;

export async function listNotes(parent: NoteParent): Promise<NoteRow[]> {
  return unwrap(
    await db()
      .from("notes")
      .select(NOTE)
      .eq(PARENT_COLUMN[parent.kind], parent.id)
      .order("created_at", { ascending: false }),
  ) as unknown as NoteRow[];
}

export const ATTACHMENTS_BUCKET = "attachments";

/** Short-lived signed URLs for private attachments, keyed by storage path. */
export async function signAttachmentUrls(paths: string[], expiresIn = 3600): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data, error } = await db().storage.from(ATTACHMENTS_BUCKET).createSignedUrls(paths, expiresIn);
  if (error) throw new Error(error.message);
  const out: Record<string, string> = {};
  for (const s of data ?? []) if (s.path && s.signedUrl) out[s.path] = s.signedUrl;
  return out;
}

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------
export async function listActivity(
  opts: { projectId?: string; featureId?: string; limit?: number } = {},
): Promise<ActivityRow[]> {
  let q = db().from("activity").select(`*, actor:users(${MEMBER}), project:projects(id, name)`);
  if (opts.projectId) q = q.eq("project_id", opts.projectId);
  if (opts.featureId) q = q.eq("feature_id", opts.featureId);
  return unwrap(
    await q.order("created_at", { ascending: false }).limit(opts.limit ?? 50),
  ) as unknown as ActivityRow[];
}

// ---------------------------------------------------------------------------
// Saved filters (shared across the team)
// ---------------------------------------------------------------------------
export async function listSavedFilters(): Promise<SavedFilter[]> {
  return unwrap(await db().from("saved_filters").select("*").order("created_at")) as SavedFilter[];
}

// ---------------------------------------------------------------------------
// Sidebar counts
// ---------------------------------------------------------------------------
/** Counts shown in the sidebar: projects, open features, POCs, research, watching. */
export async function getNavCounts(userId: string) {
  const count = async (q: PromiseLike<{ count: number | null; error: { message: string } | null }>) => {
    const res = await q;
    if (res.error) throw new Error(res.error.message);
    return res.count ?? 0;
  };
  const head = { count: "exact" as const, head: true };
  const [projects, features, pocs, research, watching] = await Promise.all([
    count(db().from("projects").select("id", head)),
    count(db().from("features").select("id", head).is("archived_at", null).neq("status", "Completed")),
    count(db().from("pocs").select("id", head)),
    count(db().from("research_items").select("id", head)),
    count(
      db()
        .from("feature_watchers")
        .select("feature_id, feature:features!inner(archived_at)", head)
        .eq("user_id", userId)
        .is("feature.archived_at", null),
    ),
  ]);
  return { projects, features, pocs, research, watchlist: watching };
}

/** Lightweight POC list for pickers. */
export async function listPocOptions(): Promise<Pick<Poc, "id" | "name" | "org" | "role">[]> {
  return unwrap(await db().from("pocs").select("id, name, org, role").order("name"));
}

// ---------------------------------------------------------------------------
// Delete impact (feeds ConfirmDialog's impact list)
// ---------------------------------------------------------------------------
export type ProjectDeleteImpact = {
  projects: { id: string; name: string }[];
  versions: { num: number; name: string }[];
  features: { name: string; owners: string[]; watchers: string[] }[];
  research: string[];
  pocs: string[];
  /** Project + version notes. */
  notes: number;
  /** Notes on the projects' features (deleted only with "also delete"). */
  featureNotes: number;
};

/** What deleting these projects would touch, for the confirmation dialog. */
export async function projectDeleteImpact(projectIds: string[]): Promise<ProjectDeleteImpact> {
  const name = (u: { name: string | null; email: string }) => u.name ?? u.email;
  const projects = unwrap(
    await db()
      .from("projects")
      .select(
        `id, name,
         versions(id, num, name, features(id, name,
           owners:feature_owners(user:users(${MEMBER})),
           watchers:feature_watchers(user:users(${MEMBER})))),
         pocs:project_pocs(poc:pocs(name)),
         research:research_projects(item:research_items(name))`,
      )
      .in("id", projectIds),
  ) as unknown as {
    id: string;
    name: string;
    versions: {
      id: string;
      num: number;
      name: string;
      features: { id: string; name: string; owners: { user: Member }[]; watchers: { user: Member }[] }[];
    }[];
    pocs: { poc: { name: string } }[];
    research: { item: { name: string } }[];
  }[];

  const versions = projects.flatMap((p) => p.versions);
  const features = versions.flatMap((v) => v.features);
  const countNotes = async (column: string, ids: string[]) => {
    if (!ids.length) return 0;
    const res = await db().from("notes").select("id", { count: "exact", head: true }).in(column, ids);
    if (res.error) throw new Error(res.error.message);
    return res.count ?? 0;
  };
  const [projectNotes, versionNotes, featureNotes] = await Promise.all([
    countNotes("project_id", projectIds),
    countNotes("version_id", versions.map((v) => v.id)),
    countNotes("feature_id", features.map((f) => f.id)),
  ]);
  return {
    projects: projects.map((p) => ({ id: p.id, name: p.name })),
    versions: [...versions].sort((a, b) => a.num - b.num).map((v) => ({ num: v.num, name: v.name })),
    features: features.map((f) => ({
      name: f.name,
      owners: f.owners.map((o) => name(o.user)),
      watchers: f.watchers.map((w) => name(w.user)),
    })),
    research: [...new Set(projects.flatMap((p) => p.research.map((r) => r.item.name)))],
    pocs: [...new Set(projects.flatMap((p) => p.pocs.map((c) => c.poc.name)))],
    notes: projectNotes + versionNotes,
    featureNotes,
  };
}

/** Notes that deleting these features would remove (the rest of the impact list comes from loaded rows). */
export async function featureNoteCount(featureIds: string[]): Promise<number> {
  if (!featureIds.length) return 0;
  const res = await db().from("notes").select("id", { count: "exact", head: true }).in("feature_id", featureIds);
  if (res.error) throw new Error(res.error.message);
  return res.count ?? 0;
}

/** Every version with its project name, for "move to version" pickers and filter options. */
export async function listVersionOptions(): Promise<
  { id: string; num: number; name: string; status: Version["status"]; project: Pick<Project, "id" | "name"> }[]
> {
  const rows = unwrap(
    await db().from("versions").select("id, num, name, status, project:projects!inner(id, name, created_at)").order("num"),
  ) as unknown as {
    id: string;
    num: number;
    name: string;
    status: Version["status"];
    project: Pick<Project, "id" | "name"> & { created_at: string };
  }[];
  return rows
    .sort((a, b) => a.project.created_at.localeCompare(b.project.created_at) || a.num - b.num)
    .map((v) => ({ id: v.id, num: v.num, name: v.name, status: v.status, project: { id: v.project.id, name: v.project.name } }));
}

/** Projects in creation order, for pickers. */
export async function listProjectOptions(): Promise<Pick<Project, "id" | "name">[]> {
  return unwrap(await db().from("projects").select("id, name").order("created_at"));
}

// ---------------------------------------------------------------------------
// ⌘K search (prototype: results). Everything searchable, in the prototype's order.
// ---------------------------------------------------------------------------
export type SearchIndex = {
  projects: { id: string; name: string; description: string | null }[];
  versions: { id: string; name: string; num: number; project: { id: string; name: string } }[];
  pocs: { id: string; name: string; org: string | null }[];
  features: {
    id: string;
    name: string;
    description: string | null;
    version: { num: number; project: { name: string } } | null;
  }[];
};

export async function searchIndex(): Promise<SearchIndex> {
  const [projects, versions, pocs, features] = await Promise.all([
    db().from("projects").select("id, name, description").order("created_at"),
    listVersionOptions(),
    listPocOptions(),
    // Archived features are hidden from search, as everywhere outside the archive views.
    db()
      .from("features")
      .select("id, name, description, version:versions(num, project:projects(name))")
      .is("archived_at", null)
      .order("created_at"),
  ]);
  return {
    projects: unwrap(projects),
    versions,
    pocs,
    features: unwrap(features) as unknown as SearchIndex["features"],
  };
}

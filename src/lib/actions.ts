'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import {
  allowedDomain,
  findAccount,
  hashPassword,
  isAllowedEmail,
  isValidEmail,
  meetsPasswordRules,
  normalizeEmail,
} from './accounts';
import { fmt } from './hub';
import { loadFeatureDrawer, type FeatureDrawerData } from './feature-view';
import { loadPocDrawer, type PocDrawerData } from './poc-view';
import { loadResearchDrawer, type ResearchDrawerData } from './research-view';
import {
  ATTACHMENTS_BUCKET,
  IS_MEMBER,
  featureNoteCount,
  listMembers,
  listPocOptions,
  listProjectOptions,
  listVersionOptions,
  projectDeleteImpact,
  searchIndex,
  type ProjectDeleteImpact,
  type SearchIndex,
} from './queries';
import { requireUser, requireUserWith, type SessionUser } from './session';
import { db, unwrap } from './supabase';
import {
  FEATURE_STATUSES,
  FILTER_FIELDS,
  PRIORITIES,
  PROJECT_STATUSES,
  RESEARCH_STATUSES,
  VERSION_STATUSES,
  type ActivityType,
  type FilterRule,
} from './types';
import { ValidationError, bool, clampInt, oneOf, optDate, optText, text, uuid, uuids } from './validate';

// Every action returns { error } for bad input, otherwise {} (plus `id` for creates).
// Unexpected database failures throw.
export interface ActionResult {
  error?: string;
  id?: string;
}

async function run(fn: (me: SessionUser) => Promise<ActionResult | void>): Promise<ActionResult> {
  const me = await requireUser();
  try {
    const res = (await fn(me)) ?? {};
    revalidatePath('/', 'layout');
    return res;
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message };
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Writes one activity entry. Only called for the change types the design shows. */
async function log(
  me: SessionUser,
  type: ActivityType,
  text: string,
  refs: { projectId?: string | null; versionId?: string | null; featureId?: string | null } = {},
) {
  unwrap(
    await db()
      .from('activity')
      .insert({
        type,
        text,
        actor_id: me.id,
        project_id: refs.projectId ?? null,
        version_id: refs.versionId ?? null,
        feature_id: refs.featureId ?? null,
      }),
  );
}

const displayName = (u: { name: string | null; email: string }) => u.name ?? u.email;

/**
 * Runs independent lookups together. If any fail (including validation), rethrows the first
 * failure in list order, i.e. the same error one-by-one awaits would have raised.
 */
async function inOrder<T extends readonly (() => unknown)[]>(
  steps: T,
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  const settled = await Promise.allSettled(steps.map((step) => Promise.resolve().then(step)));
  const failed = settled.find((r) => r.status === 'rejected');
  if (failed) throw failed.reason;
  return settled.map((r) => (r as PromiseFulfilledResult<unknown>).value) as {
    [K in keyof T]: Awaited<ReturnType<T[K]>>;
  };
}

async function getMember(id: string) {
  const u = unwrap(await db().from('users').select('id, name, email').eq('id', id).or(IS_MEMBER).maybeSingle()) as {
    id: string;
    name: string | null;
    email: string;
  } | null;
  if (!u) throw new ValidationError("That person isn't on the team.");
  return u;
}

async function getFeatureCtx(id: string) {
  const f = unwrap(
    await db()
      .from('features')
      .select('id, name, status, priority, version_id, archived_at, version:versions(project_id)')
      .eq('id', id)
      .maybeSingle(),
  ) as unknown as {
    id: string;
    name: string;
    status: string;
    priority: string;
    version_id: string | null;
    archived_at: string | null;
    version: { project_id: string } | null;
  } | null;
  if (!f) throw new ValidationError('Feature not found.');
  return { ...f, projectId: f.version?.project_id ?? null };
}

async function getVersionCtx(id: string) {
  const v = unwrap(
    await db()
      .from('versions')
      .select('id, project_id, name, status, target_date, confidence')
      .eq('id', id)
      .maybeSingle(),
  ) as {
    id: string;
    project_id: string;
    name: string;
    status: string;
    target_date: string | null;
    confidence: number;
  } | null;
  if (!v) throw new ValidationError('Version not found.');
  return v;
}

async function getProjectCtx(id: string) {
  const p = unwrap(await db().from('projects').select('id, name, status').eq('id', id).maybeSingle()) as {
    id: string;
    name: string;
    status: string;
  } | null;
  if (!p) throw new ValidationError('Project not found.');
  return p;
}

async function getPocCtx(id: string) {
  const c = unwrap(await db().from('pocs').select('id, name').eq('id', id).maybeSingle()) as {
    id: string;
    name: string;
  } | null;
  if (!c) throw new ValidationError('POC not found.');
  return c;
}

/** Removes the Storage files behind the notes matching a filter (before the rows cascade away). */
async function removeNoteFiles(column: 'project_id' | 'version_id' | 'feature_id' | 'research_id', ids: string[]) {
  if (!ids.length) return;
  const notes = unwrap(await db().from('notes').select('id').in(column, ids));
  if (!notes.length) return;
  const atts = unwrap(
    await db()
      .from('note_attachments')
      .select('storage_path')
      .in(
        'note_id',
        notes.map((n) => n.id),
      ),
  );
  if (!atts.length) return;
  const { error } = await db()
    .storage.from(ATTACHMENTS_BUCKET)
    .remove(atts.map((a) => a.storage_path));
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------
/** Creates a project (status Planned) with its owner and a first version, as the prototype does. */
export async function createProject(input: { name: string; description?: string; ownerId?: string }) {
  return run(async (me) => {
    const name = text(input.name, 'Name');
    const description = optText(input.description, 'Description');
    const owner = input.ownerId ? await getMember(uuid(input.ownerId, 'owner')) : null;

    const p = unwrap(await db().from('projects').insert({ name, description }).select('id').single());
    // These only depend on the new project, not on each other, so they're written together.
    await Promise.all([
      owner ? db().from('project_owners').insert({ project_id: p.id, user_id: owner.id }).then(unwrap) : null,
      db().from('versions').insert({ project_id: p.id, num: 1, name: 'First release' }).then(unwrap),
      log(me, 'feature', `created project ${name}`, { projectId: p.id }),
    ]);
    return { id: p.id };
  });
}

export async function updateProject(id: string, patch: { name?: string; description?: string; status?: string }) {
  return run(async (me) => {
    const p = await getProjectCtx(uuid(id, 'project'));
    const fields: Record<string, unknown> = {};
    if (patch.name !== undefined) fields.name = text(patch.name, 'Name');
    if (patch.description !== undefined) fields.description = optText(patch.description, 'Description');
    if (patch.status !== undefined) fields.status = oneOf(patch.status, PROJECT_STATUSES, 'Status');
    if (!Object.keys(fields).length) return;
    unwrap(await db().from('projects').update(fields).eq('id', p.id));
    if (fields.status && fields.status !== p.status) {
      await log(me, 'status', `moved ${p.name} to ${fields.status}`, { projectId: p.id });
    }
  });
}

/** Adds or removes a project owner or POC. */
export async function setProjectLink(projectId: string, kind: 'owners' | 'pocs', targetId: string, on: boolean) {
  return run(async (me) => {
    const p = await getProjectCtx(uuid(projectId, 'project'));
    const linked = bool(on, 'State');
    if (kind === 'owners') {
      const u = await getMember(uuid(targetId, 'person'));
      if (linked) {
        const { error } = await db().from('project_owners').insert({ project_id: p.id, user_id: u.id });
        if (error?.code === '23505') return;
        if (error) throw new Error(error.message);
        await log(me, 'assigned', `added ${displayName(u)} as owner of ${p.name}`, { projectId: p.id });
      } else {
        unwrap(await db().from('project_owners').delete().match({ project_id: p.id, user_id: u.id }));
      }
    } else if (kind === 'pocs') {
      const c = await getPocCtx(uuid(targetId, 'POC'));
      if (linked) {
        const { error } = await db().from('project_pocs').insert({ project_id: p.id, poc_id: c.id });
        if (error?.code === '23505') return;
        if (error) throw new Error(error.message);
        await log(me, 'assigned', `linked ${c.name} as POC for ${p.name}`, { projectId: p.id });
      } else {
        unwrap(await db().from('project_pocs').delete().match({ project_id: p.id, poc_id: c.id }));
      }
    } else {
      throw new ValidationError('Invalid link.');
    }
  });
}

/** Read-only: what deleting these projects would touch (for the confirmation dialog). */
export async function getProjectDeleteImpact(ids: string[]): Promise<ProjectDeleteImpact | { error: string }> {
  // The account check runs alongside the read; the result is only returned once it passes.
  const [, res] = await requireUserWith(async () => {
    try {
      return await projectDeleteImpact(uuids(ids, 'project'));
    } catch (err) {
      if (err instanceof ValidationError) return { error: err.message };
      throw err;
    }
  });
  return res;
}

/**
 * Deletes projects and their versions. Their features move to "No project"
 * unless `alsoDeleteFeatures` is set. Research and POC links are removed.
 */
export async function deleteProjects(ids: string[], alsoDeleteFeatures: boolean) {
  return run(async () => {
    const projectIds = uuids(ids, 'project');
    const alsoDelete = bool(alsoDeleteFeatures, 'Option');
    const versionIds = unwrap(await db().from('versions').select('id').in('project_id', projectIds)).map(
      (v) => v.id as string,
    );
    if (alsoDelete && versionIds.length) {
      const featureIds = unwrap(await db().from('features').select('id').in('version_id', versionIds)).map(
        (f) => f.id as string,
      );
      await removeNoteFiles('feature_id', featureIds);
      if (featureIds.length) unwrap(await db().from('features').delete().in('id', featureIds));
    }
    await removeNoteFiles('version_id', versionIds);
    await removeNoteFiles('project_id', projectIds);
    // Versions cascade; remaining features get version_id = null ("No project").
    unwrap(await db().from('projects').delete().in('id', projectIds));
  });
}

// ---------------------------------------------------------------------------
// Versions
// ---------------------------------------------------------------------------
/** Adds the next-numbered version to a project, recording the initial confidence. */
export async function createVersion(input: {
  projectId: string;
  name: string;
  description?: string;
  targetDate?: string;
  confidence?: number | string;
}) {
  return run(async (me) => {
    const p = await getProjectCtx(uuid(input.projectId, 'project'));
    const name = text(input.name, 'Name');
    const description = optText(input.description, 'Description');
    const target_date = optDate(input.targetDate, 'Target date');
    const confidence = clampInt(input.confidence ?? 50, 0, 100, 'Confidence');
    const nums = unwrap(await db().from('versions').select('num').eq('project_id', p.id));
    const num = (nums.length ? Math.max(...nums.map((n) => n.num as number)) : 0) + 1;

    const v = unwrap(
      await db()
        .from('versions')
        .insert({ project_id: p.id, num, name, description, target_date, confidence })
        .select('id')
        .single(),
    );
    unwrap(
      await db().from('confidence_history').insert({
        version_id: v.id,
        from_value: null,
        to_value: confidence,
        changed_by: me.id,
        reason: 'Initial estimate.',
      }),
    );
    await log(me, 'feature', `added Version ${num} — ${name}`, { projectId: p.id, versionId: v.id });
    return { id: v.id };
  });
}

export async function updateVersion(
  id: string,
  patch: { name?: string; description?: string; status?: string; targetDate?: string | null },
) {
  return run(async (me) => {
    const v = await getVersionCtx(uuid(id, 'version'));
    const fields: Record<string, unknown> = {};
    if (patch.name !== undefined) fields.name = text(patch.name, 'Name');
    if (patch.description !== undefined) fields.description = optText(patch.description, 'Description');
    if (patch.status !== undefined) fields.status = oneOf(patch.status, VERSION_STATUSES, 'Status');
    if (patch.targetDate !== undefined) fields.target_date = optDate(patch.targetDate, 'Target date');
    if (!Object.keys(fields).length) return;
    unwrap(await db().from('versions').update(fields).eq('id', v.id));

    const refs = { projectId: v.project_id, versionId: v.id };
    if (fields.status && fields.status !== v.status) {
      await log(me, 'status', `moved ${v.name} to ${fields.status}`, refs);
    }
    if ('target_date' in fields && fields.target_date !== v.target_date) {
      await log(me, 'due', `changed ${v.name} target to ${fmt(fields.target_date as string | null)}`, refs);
    }
  });
}

/** Updates a version's confidence. A reason is required, as in the design. */
export async function setConfidence(id: string, value: number | string, reason: string) {
  return run(async (me) => {
    const v = await getVersionCtx(uuid(id, 'version'));
    const to = clampInt(value, 0, 100, 'Confidence');
    const why = typeof reason === 'string' ? reason.trim() : '';
    if (!why) throw new ValidationError('Add a reason so the team knows why.');
    unwrap(
      await db()
        .from('confidence_history')
        .insert({ version_id: v.id, from_value: v.confidence, to_value: to, changed_by: me.id, reason: why }),
    );
    unwrap(await db().from('versions').update({ confidence: to }).eq('id', v.id));
    await log(me, 'confidence', `changed ${v.name} confidence ${v.confidence}% → ${to}%`, {
      projectId: v.project_id,
      versionId: v.id,
    });
  });
}

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------
/** Creates a feature. versionId empty = "No project". */
export async function createFeature(input: {
  versionId?: string | null;
  name: string;
  description?: string;
  priority?: string;
  ownerId?: string;
  pocId?: string;
  stakeholders?: string;
}) {
  return run(async (me) => {
    const name = text(input.name, 'Name');
    const description = optText(input.description, 'Description');
    const priority = oneOf(input.priority ?? 'Medium', PRIORITIES, 'Priority');
    const stakeholders = optText(input.stakeholders, 'Stakeholders', 500);
    // The three lookups run together; on failure the first error in this order is reported, as before.
    const [version, owner, poc] = await inOrder([
      () => (input.versionId ? getVersionCtx(uuid(input.versionId, 'version')) : null),
      () => (input.ownerId ? getMember(uuid(input.ownerId, 'owner')) : null),
      () => (input.pocId ? getPocCtx(uuid(input.pocId, 'POC')) : null),
    ] as const);

    const f = unwrap(
      await db()
        .from('features')
        .insert({ version_id: version?.id ?? null, name, description, priority, stakeholders })
        .select('id')
        .single(),
    );
    // These only depend on the new feature, not on each other, so they're written together.
    await Promise.all([
      owner ? db().from('feature_owners').insert({ feature_id: f.id, user_id: owner.id }).then(unwrap) : null,
      poc ? db().from('feature_pocs').insert({ feature_id: f.id, poc_id: poc.id }).then(unwrap) : null,
      log(me, 'feature', `added feature ${name}`, {
        projectId: version?.project_id,
        versionId: version?.id,
        featureId: f.id,
      }),
    ]);
    return { id: f.id };
  });
}

export async function updateFeature(
  id: string,
  patch: {
    name?: string;
    description?: string;
    stakeholders?: string;
    status?: string;
    priority?: string;
    versionId?: string | null;
  },
) {
  return run(async (me) => {
    const f = await getFeatureCtx(uuid(id, 'feature'));
    const fields: Record<string, unknown> = {};
    if (patch.name !== undefined) fields.name = text(patch.name, 'Name');
    if (patch.description !== undefined) fields.description = optText(patch.description, 'Description');
    if (patch.stakeholders !== undefined) fields.stakeholders = optText(patch.stakeholders, 'Stakeholders', 500);
    if (patch.status !== undefined) fields.status = oneOf(patch.status, FEATURE_STATUSES, 'Status');
    if (patch.priority !== undefined) fields.priority = oneOf(patch.priority, PRIORITIES, 'Priority');
    if (patch.versionId !== undefined) {
      fields.version_id = patch.versionId ? (await getVersionCtx(uuid(patch.versionId, 'version'))).id : null;
    }
    if (!Object.keys(fields).length) return;
    unwrap(await db().from('features').update(fields).eq('id', f.id));

    const refs = { projectId: f.projectId, versionId: f.version_id, featureId: f.id };
    if (fields.status && fields.status !== f.status) {
      if (fields.status === 'Completed') await log(me, 'completed', `completed ${f.name}`, refs);
      else await log(me, 'status', `moved ${f.name} to ${fields.status}`, refs);
    }
    if (fields.priority && fields.priority !== f.priority) {
      await log(me, 'status', `set ${f.name} priority to ${fields.priority}`, refs);
    }
  });
}

/** Adds or removes a feature owner, watcher or POC. */
export async function setFeatureLink(
  featureId: string,
  kind: 'owners' | 'watchers' | 'pocs',
  targetId: string,
  on: boolean,
) {
  return run(async (me) => {
    const f = await getFeatureCtx(uuid(featureId, 'feature'));
    const linked = bool(on, 'State');
    const refs = { projectId: f.projectId, versionId: f.version_id, featureId: f.id };

    if (kind === 'owners' || kind === 'watchers') {
      const u = await getMember(uuid(targetId, 'person'));
      const table = kind === 'owners' ? 'feature_owners' : 'feature_watchers';
      if (linked) {
        const { error } = await db().from(table).insert({ feature_id: f.id, user_id: u.id });
        if (error?.code === '23505') return;
        if (error) throw new Error(error.message);
        if (kind === 'owners') await log(me, 'assigned', `added ${displayName(u)} as owner of ${f.name}`, refs);
      } else {
        unwrap(await db().from(table).delete().match({ feature_id: f.id, user_id: u.id }));
      }
    } else if (kind === 'pocs') {
      const c = await getPocCtx(uuid(targetId, 'POC'));
      if (linked) {
        const { error } = await db().from('feature_pocs').insert({ feature_id: f.id, poc_id: c.id });
        if (error?.code === '23505') return;
        if (error) throw new Error(error.message);
        await log(me, 'assigned', `linked ${c.name} as POC for ${f.name}`, refs);
      } else {
        unwrap(await db().from('feature_pocs').delete().match({ feature_id: f.id, poc_id: c.id }));
      }
    } else {
      throw new ValidationError('Invalid link.');
    }
    // The prototype bumps a feature's "Updated" time for any owner/watcher/POC change.
    unwrap(await db().from('features').update({ updated_at: new Date().toISOString() }).eq('id', f.id));
  });
}

/** Archives or restores features. */
export async function setFeaturesArchived(ids: string[], archived: boolean) {
  return run(async (me) => {
    const featureIds = uuids(ids, 'feature');
    const on = bool(archived, 'State');
    for (const id of featureIds) {
      const f = await getFeatureCtx(id);
      if (!!f.archived_at === on) continue;
      unwrap(
        await db()
          .from('features')
          .update({ archived_at: on ? new Date().toISOString() : null })
          .eq('id', id),
      );
      await log(me, 'status', `${on ? 'archived' : 'restored'} ${f.name}`, {
        projectId: f.projectId,
        versionId: f.version_id,
        featureId: f.id,
      });
    }
  });
}

/** Read-only: options the create drawer's selects need. */
export async function getCreateOptions() {
  const [, [members, projects, versions, pocs]] = await requireUserWith(() =>
    Promise.all([listMembers(), listProjectOptions(), listVersionOptions(), listPocOptions()]),
  );
  return { members, projects, versions, pocs };
}

/** Read-only: everything the ⌘K search looks through. */
export async function getSearchIndex(): Promise<SearchIndex> {
  const [, index] = await requireUserWith(() => searchIndex());
  return index;
}

/** Read-only: research drawer contents. */
export async function getResearchDrawer(id: string): Promise<ResearchDrawerData | null> {
  // The account check runs alongside the read; the result is only returned once it passes.
  const [, res] = await requireUserWith(async () => {
    try {
      return await loadResearchDrawer(uuid(id, 'research item'));
    } catch (err) {
      if (err instanceof ValidationError) return null;
      throw err;
    }
  });
  return res;
}

/** Read-only: POC drawer contents. */
export async function getPocDrawer(id: string): Promise<PocDrawerData | null> {
  // The account check runs alongside the read; the result is only returned once it passes.
  const [, res] = await requireUserWith(async () => {
    try {
      return await loadPocDrawer(uuid(id, 'POC'));
    } catch (err) {
      if (err instanceof ValidationError) return null;
      throw err;
    }
  });
  return res;
}

/** Read-only: feature drawer contents. */
export async function getFeatureDrawer(id: string): Promise<FeatureDrawerData | null> {
  // The account check runs alongside the read; the result is only returned once it passes.
  const [, res] = await requireUserWith(async () => {
    try {
      return await loadFeatureDrawer(uuid(id, 'feature'));
    } catch (err) {
      if (err instanceof ValidationError) return null;
      throw err;
    }
  });
  return res;
}

/** Read-only: notes that deleting these features would remove (for the confirmation dialog). */
export async function getFeatureNoteCount(ids: string[]): Promise<number> {
  const [, n] = await requireUserWith(async () => featureNoteCount(uuids(ids, 'feature')));
  return n;
}

/** Deletes features with their notes, attachments and links. Activity entries stay, unlinked. */
export async function deleteFeatures(ids: string[]) {
  return run(async (me) => {
    const featureIds = uuids(ids, 'feature');
    const ctx = await Promise.all(featureIds.map(getFeatureCtx));
    await removeNoteFiles('feature_id', featureIds);
    unwrap(await db().from('features').delete().in('id', featureIds));
    for (const f of ctx) {
      await log(me, 'status', `deleted feature ${f.name}`, { projectId: f.projectId, versionId: f.version_id });
    }
  });
}

// ---------------------------------------------------------------------------
// Customer POCs
// ---------------------------------------------------------------------------
function pocFields(input: { name?: string; org?: string; role?: string; email?: string }, partial: boolean) {
  const fields: Record<string, unknown> = {};
  if (!partial || input.name !== undefined) fields.name = text(input.name, 'Name');
  if (input.org !== undefined) fields.org = optText(input.org, 'Organization', 200);
  if (input.role !== undefined) fields.role = optText(input.role, 'Role', 200);
  if (input.email !== undefined) fields.email = optText(input.email, 'Email', 320);
  return fields;
}

export async function createPoc(input: { name: string; org?: string; role?: string; email?: string }) {
  return run(async () => {
    const c = unwrap(await db().from('pocs').insert(pocFields(input, false)).select('id').single());
    return { id: c.id };
  });
}

export async function updatePoc(id: string, patch: { name?: string; org?: string; role?: string; email?: string }) {
  return run(async () => {
    const c = await getPocCtx(uuid(id, 'POC'));
    const fields = pocFields(patch, true);
    if (Object.keys(fields).length) unwrap(await db().from('pocs').update(fields).eq('id', c.id));
  });
}

/** Deletes POCs. Their project and feature links are removed; the projects and features stay. */
export async function deletePocs(ids: string[]) {
  return run(async () => {
    unwrap(await db().from('pocs').delete().in('id', uuids(ids, 'POC')));
  });
}

// ---------------------------------------------------------------------------
// Research
// ---------------------------------------------------------------------------
/** Adds a research item named "New software" with status To research, as the prototype does. */
export async function createResearch() {
  return run(async () => {
    const r = unwrap(await db().from('research_items').insert({ name: 'New software' }).select('id').single());
    return { id: r.id };
  });
}

export async function updateResearch(
  id: string,
  patch: { name?: string; url?: string; category?: string; status?: string },
) {
  return run(async () => {
    const rid = uuid(id, 'research item');
    const fields: Record<string, unknown> = {};
    if (patch.name !== undefined) fields.name = text(patch.name, 'Name');
    if (patch.url !== undefined) fields.url = optText(patch.url, 'Website', 2000);
    if (patch.category !== undefined) fields.category = optText(patch.category, 'Category', 200);
    if (patch.status !== undefined) fields.status = oneOf(patch.status, RESEARCH_STATUSES, 'Status');
    if (Object.keys(fields).length) unwrap(await db().from('research_items').update(fields).eq('id', rid));
  });
}

/** Links or unlinks a research item and a project. */
export async function setResearchProject(researchId: string, projectId: string, on: boolean) {
  return run(async (me) => {
    const r = unwrap(
      await db().from('research_items').select('id, name').eq('id', uuid(researchId, 'research item')).maybeSingle(),
    ) as { id: string; name: string } | null;
    if (!r) throw new ValidationError('Research item not found.');
    const p = await getProjectCtx(uuid(projectId, 'project'));
    if (bool(on, 'State')) {
      const { error } = await db().from('research_projects').insert({ research_id: r.id, project_id: p.id });
      if (error?.code === '23505') return;
      if (error) throw new Error(error.message);
      await log(me, 'note', `linked research on ${r.name} to ${p.name}`, { projectId: p.id });
    } else {
      unwrap(await db().from('research_projects').delete().match({ research_id: r.id, project_id: p.id }));
    }
  });
}

export async function deleteResearch(ids: string[]) {
  return run(async () => {
    const researchIds = uuids(ids, 'research item');
    await removeNoteFiles('research_id', researchIds);
    unwrap(await db().from('research_items').delete().in('id', researchIds));
  });
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------
const NOTE_PARENTS = ['project', 'version', 'feature', 'research'] as const;

/** Maximum size of one note attachment. */
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

/**
 * Adds a note to a project, version, feature or research item.
 * FormData: kind, id, body, and any number of `files`. Files go to the private
 * `attachments` bucket under notes/<noteId>/.
 */
export async function addNote(fd: FormData) {
  return run(async (me) => {
    const kind = oneOf(fd.get('kind'), NOTE_PARENTS, 'Parent');
    const parentId = uuid(fd.get('id'), kind);
    const body = typeof fd.get('body') === 'string' ? (fd.get('body') as string).trim() : '';
    const files = fd.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
    if (!body && !files.length) throw new ValidationError('Write a note or attach a file.');
    const tooBig = files.find((f) => f.size > MAX_ATTACHMENT_BYTES);
    if (tooBig) throw new ValidationError(`${tooBig.name} is larger than 5 MB.`);

    // Resolve the parent's name and project for the activity entry.
    let name: string;
    const refs: { projectId?: string | null; versionId?: string | null; featureId?: string | null } = {};
    if (kind === 'project') {
      const p = await getProjectCtx(parentId);
      name = p.name;
      refs.projectId = p.id;
    } else if (kind === 'version') {
      const v = await getVersionCtx(parentId);
      name = v.name;
      refs.projectId = v.project_id;
      refs.versionId = v.id;
    } else if (kind === 'feature') {
      const f = await getFeatureCtx(parentId);
      name = f.name;
      Object.assign(refs, { projectId: f.projectId, versionId: f.version_id, featureId: f.id });
    } else {
      const r = unwrap(
        await db()
          .from('research_items')
          .select('id, name, projects:research_projects(project_id, created_at)')
          .eq('id', parentId)
          .maybeSingle(),
      ) as { id: string; name: string; projects: { project_id: string; created_at: string }[] } | null;
      if (!r) throw new ValidationError('Research item not found.');
      name = r.name;
      // The prototype files research notes under the item's first linked project.
      refs.projectId = [...r.projects].sort((a, b) => a.created_at.localeCompare(b.created_at))[0]?.project_id ?? null;
    }

    const column = { project: 'project_id', version: 'version_id', feature: 'feature_id', research: 'research_id' }[
      kind
    ];
    const note = unwrap(
      await db()
        .from('notes')
        .insert({ [column]: parentId, body, author_id: me.id })
        .select('id')
        .single(),
    );

    for (const file of files) {
      const safe = file.name.replace(/[^\w.-]+/g, '_').slice(-120) || 'file';
      const path = `notes/${note.id}/${crypto.randomUUID()}-${safe}`;
      const { error } = await db()
        .storage.from(ATTACHMENTS_BUCKET)
        .upload(path, file, { contentType: file.type || undefined });
      if (error) throw new Error(error.message);
      unwrap(
        await db()
          .from('note_attachments')
          .insert({
            note_id: note.id,
            storage_path: path,
            name: file.name,
            size: file.size,
            mime_type: file.type || null,
          }),
      );
    }

    await log(me, 'note', `added a note on ${name}`, refs);
    return { id: note.id };
  });
}

// ---------------------------------------------------------------------------
// Saved filters (shared across the team)
// ---------------------------------------------------------------------------
export async function saveFilter(name: string, rules: FilterRule[]) {
  return run(async (me) => {
    const n = text(name, 'Name', 100);
    if (!Array.isArray(rules) || !rules.length) throw new ValidationError('Add at least one filter.');
    const clean = rules.map((r) => ({
      field: oneOf(r?.field, FILTER_FIELDS, 'Filter field'),
      op: oneOf(r?.op, ['is', 'not'] as const, 'Filter operator'),
      value: text(r?.value, 'Filter value', 200),
    }));
    const row = unwrap(
      await db().from('saved_filters').insert({ name: n, rules: clean, created_by: me.id }).select('id').single(),
    );
    return { id: row.id };
  });
}

export async function deleteSavedFilter(id: string) {
  return run(async () => {
    unwrap(await db().from('saved_filters').delete().eq('id', uuid(id, 'saved filter')));
  });
}

// ---------------------------------------------------------------------------
// Profile and team
// ---------------------------------------------------------------------------
export async function updateProfile(input: {
  name: string;
  roleTitle?: string;
  timezone?: string;
  notifyWatch?: boolean;
  notifyConf?: boolean;
}) {
  return run(async (me) => {
    const name = text(input.name, 'Name', 100).replace(/\s+/g, ' ');
    const others = unwrap(await db().from('users').select('id, name').neq('id', me.id).not('name', 'is', null));
    if (others.some((u) => (u.name as string).toLowerCase() === name.toLowerCase())) {
      throw new ValidationError('Someone on the team already uses that name.');
    }
    const fields: Record<string, unknown> = { name };
    if (input.roleTitle !== undefined) fields.role_title = optText(input.roleTitle, 'Role', 100);
    if (input.timezone !== undefined) fields.timezone = text(input.timezone, 'Time zone', 64);
    if (input.notifyWatch !== undefined) fields.notify_watch = bool(input.notifyWatch, 'Notification setting');
    if (input.notifyConf !== undefined) fields.notify_conf = bool(input.notifyConf, 'Notification setting');
    unwrap(await db().from('users').update(fields).eq('id', me.id));
  });
}

/** Changes the signed-in user's password, using the rules shown on the Security tab. */
export async function changePassword(input: { current: string; next: string; confirm: string }) {
  return run(async (me) => {
    const current = typeof input.current === 'string' ? input.current : '';
    const next = typeof input.next === 'string' ? input.next : '';
    if (!current) throw new ValidationError('Enter your current password.');
    if (!meetsPasswordRules(next) || next === current) {
      throw new ValidationError("New password doesn't meet the requirements.");
    }
    if (next !== input.confirm) throw new ValidationError("Passwords don't match.");
    const account = await findAccount(me.email);
    if (!account?.password_hash || !(await bcrypt.compare(current, account.password_hash))) {
      throw new ValidationError('Current password is incorrect.');
    }
    unwrap(
      await db()
        .from('users')
        .update({ password_hash: await hashPassword(next), password_changed_at: new Date().toISOString() })
        .eq('id', me.id),
    );
  });
}

/** Records an invite (a user row with no password). No email is sent. */
export async function inviteUser(input: { email: string; role: string }) {
  return run(async (me) => {
    const email = normalizeEmail(typeof input.email === 'string' ? input.email : '');
    if (!isValidEmail(email)) throw new ValidationError('Enter a valid email address.');
    if (!isAllowedEmail(email)) throw new ValidationError(`Only @${allowedDomain} emails can be invited.`);
    if (await findAccount(email)) throw new ValidationError('That person is already on the team or invited.');
    const role = text(input.role, 'Role', 100);
    const u = unwrap(
      await db().from('users').insert({ email, invite_role: role, invited_by: me.id }).select('id').single(),
    );
    return { id: u.id };
  });
}

/** Revokes a pending invite. Anyone who has ever activated an account can't be removed this way. */
export async function revokeInvite(id: string) {
  return run(async () => {
    unwrap(
      await db().from('users').delete().eq('id', uuid(id, 'invite')).is('password_hash', null).is('activated_at', null),
    );
  });
}

/**
 * Clears a teammate's password so they can set a new one through account setup.
 * activated_at is kept, so they stay a team member (not a pending invite) meanwhile.
 */
export async function resetPassword(id: string) {
  return run(async (me) => {
    const uid = uuid(id, 'person');
    if (uid === me.id) throw new ValidationError('Change your own password on the Security tab.');
    unwrap(await db().from('users').update({ password_hash: null }).eq('id', uid).not('password_hash', 'is', null));
  });
}

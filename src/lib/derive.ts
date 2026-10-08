// Derived values ported from renderVals() in design/PM Dashboard v3.dc.html.
import type { FeatureStatus, VersionStatus } from './types';

/** Percent of features completed (prototype `prog`). */
export function progress(features: { status: FeatureStatus }[]): number {
  return features.length
    ? Math.round((features.filter((f) => f.status === 'Completed').length / features.length) * 100)
    : 0;
}

/** Current version: the first not-completed one by number, else the last (prototype `cur`). */
export function currentVersion<V extends { num: number; status: VersionStatus }>(versions: V[]): V | undefined {
  const vs = [...versions].sort((a, b) => a.num - b.num);
  return vs.find((v) => v.status !== 'Completed') ?? vs[vs.length - 1];
}

/** Features that are not archived (the prototype hides archived features everywhere but the archive view). */
export const active = <F extends { archived_at: string | null }>(fs: F[]) => fs.filter((f) => !f.archived_at);

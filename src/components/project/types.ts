import type { Note } from '@/components/hub/NoteThread';
import type { Anchor } from '@/components/popovers';
import type { Av } from '@/lib/hub';
import type { FeatureRow } from '@/lib/queries';
import type { Member, Poc, VersionStatus } from '@/lib/types';

export type ProjectTab = 'overview' | 'versions' | 'features' | 'activity';

export interface VersionView {
  id: string;
  num: number;
  name: string;
  description: string;
  status: VersionStatus;
  target_date: string | null;
  confidence: number;
  history: { id: string; from: number | null; to: number; by: string; date: string; reason: string }[];
  notes: Note[];
}

export interface ActivityView {
  id: string;
  who: string;
  text: string;
  when: string;
  dot: string;
  featureId: string | null;
}

export interface ProjectViewData {
  project: { id: string; name: string; description: string; status: string; owners: Member[]; pocs: Poc[] };
  versions: VersionView[];
  features: FeatureRow[];
  archived: FeatureRow[];
  notes: Note[];
  activity: ActivityView[];
}

export type PickerKind = 'owners' | 'watchers' | 'pocs';

/** Handlers the tabs call back into ProjectView with. */
export interface ProjectHandlers {
  me: { id: string; name: string; av: Av };
  openFeature: (id: string) => void;
  addFeature: (versionId: string) => void;
  /** Create drawer with the create form's own default version (prototype openCreate('feature')). */
  addFeatureHere: () => void;
  setFeature: (id: string, patch: { status?: string; priority?: string }) => void;
  openFeaturePicker: (id: string, kind: PickerKind, anchor: Anchor) => void;
  /** Row ⋯ menu; `menuFor` is the feature whose menu is open. */
  openMenu: (id: string, anchor: Anchor) => void;
  menuFor: string | null;
  setVersion: (id: string, patch: { status?: string; description?: string }) => void;
  openTargetPicker: (id: string, anchor: Anchor) => void;
}

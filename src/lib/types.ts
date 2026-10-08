// Row types for the Product Hub schema (supabase/migrations/20261008000000_product_hub.sql).

export const PROJECT_STATUSES = ['Planned', 'Active', 'Completed'] as const;
export const VERSION_STATUSES = ['Planned', 'In Progress', 'Completed'] as const;
export const FEATURE_STATUSES = ['Planned', 'In Progress', 'Blocked', 'Completed'] as const;
export const PRIORITIES = ['High', 'Medium', 'Low'] as const;
export const RESEARCH_STATUSES = ['To research', 'Researching', 'Reviewed'] as const;
export const ACTIVITY_TYPES = ['completed', 'status', 'assigned', 'feature', 'confidence', 'note', 'due'] as const;
export const FILTER_FIELDS = ['project', 'version', 'status', 'owner', 'poc', 'priority'] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type VersionStatus = (typeof VERSION_STATUSES)[number];
export type FeatureStatus = (typeof FEATURE_STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type ResearchStatus = (typeof RESEARCH_STATUSES)[number];
export type ActivityType = (typeof ACTIVITY_TYPES)[number];
export type FilterField = (typeof FILTER_FIELDS)[number];

/** A team member as other records reference them. */
export type Member = { id: string; name: string | null; email: string };

export type User = Member & {
  role_title: string | null;
  timezone: string;
  notify_watch: boolean;
  notify_conf: boolean;
  password_changed_at: string | null;
  invite_role: string | null;
  invited_by: string | null;
  activated_at: string | null;
  created_at: string;
};

export type Poc = {
  id: string;
  name: string;
  org: string | null;
  role: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
};

export type Version = {
  id: string;
  project_id: string;
  num: number;
  name: string;
  description: string | null;
  status: VersionStatus;
  target_date: string | null;
  confidence: number;
  created_at: string;
  updated_at: string;
};

export type ConfidenceChange = {
  id: string;
  version_id: string;
  from_value: number | null;
  to_value: number;
  changed_by: string | null;
  reason: string;
  created_at: string;
};

export type Feature = {
  id: string;
  version_id: string | null;
  name: string;
  description: string | null;
  status: FeatureStatus;
  priority: Priority;
  stakeholders: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ResearchItem = {
  id: string;
  name: string;
  url: string | null;
  category: string | null;
  status: ResearchStatus;
  created_at: string;
  updated_at: string;
};

export type NoteAttachment = {
  id: string;
  note_id: string;
  storage_path: string;
  name: string;
  size: number;
  mime_type: string | null;
  created_at: string;
};

export type Note = {
  id: string;
  project_id: string | null;
  version_id: string | null;
  feature_id: string | null;
  research_id: string | null;
  body: string;
  author_id: string | null;
  created_at: string;
  updated_at: string;
};

export type NoteParent =
  | { kind: 'project'; id: string }
  | { kind: 'version'; id: string }
  | { kind: 'feature'; id: string }
  | { kind: 'research'; id: string };

export type Activity = {
  id: string;
  type: ActivityType;
  text: string;
  actor_id: string | null;
  project_id: string | null;
  version_id: string | null;
  feature_id: string | null;
  created_at: string;
};

export type FilterRule = { field: FilterField; op: 'is' | 'not'; value: string };

export type SavedFilter = {
  id: string;
  name: string;
  rules: FilterRule[];
  created_by: string | null;
  created_at: string;
};

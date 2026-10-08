import 'server-only';
import type { Note } from '@/components/hub/NoteThread';
import { threadNotes } from './note-view';
import { getResearch, listProjectOptions, type ResearchRow } from './queries';

/** Everything the research drawer shows (design/PM Dashboard v3.dc.html, isResDrawer). */
export type ResearchDrawerData = {
  item: Omit<ResearchRow, 'notes'>;
  notes: Note[];
  /** All projects, for "+ Link a project". */
  projects: { id: string; name: string }[];
};

export async function loadResearchDrawer(id: string): Promise<ResearchDrawerData | null> {
  const [r, projects] = await Promise.all([getResearch(id), listProjectOptions()]);
  if (!r) return null;
  const toNotes = await threadNotes([r.notes]);
  const { notes, ...item } = r;
  return { item, notes: toNotes(notes), projects };
}

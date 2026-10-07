import "server-only";
import type { Note } from "@/components/hub/NoteThread";
import { ACT_TONE, T, memberName, rel } from "./hub";
import { threadNotes } from "./note-view";
import { getFeature, listMembers, listPocOptions, listVersionOptions, type FeatureRow } from "./queries";
import type { Member, Poc } from "./types";

/** Everything the feature drawer shows (design/PM Dashboard v3.dc.html, isFeatDrawer). */
export type FeatureDrawerData = {
  feature: FeatureRow;
  notes: Note[];
  activity: { id: string; who: string; text: string; when: string; dot: string }[];
  members: (Member & { role_title: string | null })[];
  pocOptions: Pick<Poc, "id" | "name" | "org" | "role">[];
  versions: { id: string; num: number; name: string; project: { id: string; name: string } }[];
};

export async function loadFeatureDrawer(id: string): Promise<FeatureDrawerData | null> {
  const [f, members, pocOptions, versions] = await Promise.all([
    getFeature(id),
    listMembers(),
    listPocOptions(),
    listVersionOptions(),
  ]);
  if (!f) return null;
  const toNotes = await threadNotes([f.notes]);
  const { notes, activity, ...feature } = f;
  return {
    feature,
    notes: toNotes(notes),
    // The prototype ends the list with a synthetic "Feature created" entry.
    activity: [
      ...activity.map((a) => ({
        id: a.id,
        who: a.actor ? memberName(a.actor) : "",
        text: a.text,
        when: rel(a.created_at),
        dot: T[ACT_TONE[a.type] || "gray"].dot,
      })),
      { id: "created", who: "", text: "Feature created", when: rel(f.created_at), dot: T.gray.dot },
    ],
    members,
    pocOptions,
    versions,
  };
}

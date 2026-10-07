"use client";

// NoteThread wired to Supabase: notes come from the server, new notes (and their
// attachments) are saved with the addNote action. The thread itself is unchanged.
import { useOptimistic, useState, useTransition } from "react";
import { NoteThread, type Attachment, type Note } from "@/components/hub/NoteThread";
import { addNote } from "@/lib/actions";
import type { Av } from "@/lib/hub";

export type NoteParentKind = "project" | "version" | "feature" | "research";

const MAX_BYTES = 5 * 1024 * 1024;
// One note's upload must fit the server's 26 MB request limit (next.config.ts), with room for the form.
const MAX_TOTAL = 25 * 1024 * 1024;

export function LiveNoteThread({
  kind,
  id,
  notes,
  me,
  onSaved,
}: {
  kind: NoteParentKind;
  id: string;
  notes: Note[];
  me: { name: string; av: Av };
  /** For callers whose notes aren't refreshed by revalidation (e.g. the feature drawer). */
  onSaved?: () => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [optimistic, addOptimistic] = useOptimistic(notes, (cur: Note[], n: Note) => [n, ...cur]);
  const [, startTransition] = useTransition();

  function save(atts: Attachment[]) {
    const body = draft.trim();
    if (!body && !atts.length) return;
    setDraft("");
    startTransition(async () => {
      // NoteThread hands back object URLs for pending files; read them back into files to upload.
      const files = await Promise.all(
        atts.map(async (a) => {
          const blob = await fetch(a.url).then((r) => r.blob());
          return new File([blob], a.name, { type: a.type || blob.type });
        }),
      );
      const tooBig = files.find((f) => f.size > MAX_BYTES);
      if (tooBig) {
        setDraft(body);
        window.alert(`${tooBig.name} is larger than 5 MB.`);
        return;
      }
      if (files.reduce((n, f) => n + f.size, 0) > MAX_TOTAL) {
        setDraft(body);
        window.alert("Attachments on one note can add up to 25 MB.");
        return;
      }
      addOptimistic({ text: body, author: me.name, when: "just now", av: me.av, atts });
      const fd = new FormData();
      fd.set("kind", kind);
      fd.set("id", id);
      fd.set("body", body);
      for (const f of files) fd.append("files", f);
      const res = await addNote(fd).catch(() => ({ error: "Couldn't save the note. Please try again." }));
      if (res.error) {
        setDraft(body);
        window.alert(res.error);
      } else if (onSaved) {
        await onSaved();
      }
    });
  }

  return <NoteThread thread={{ draft, onDraft: setDraft, addNote: save, notes: optimistic }} />;
}

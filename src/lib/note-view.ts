import 'server-only';
import type { Note } from '@/components/hub/NoteThread';
import { fileExt, fileSize, memberAv, memberName, rel } from './hub';
import { signAttachmentUrls, type NoteRow } from './queries';

/** Signs every attachment across these note lists in one call; returns a mapper to NoteThread notes. */
export async function threadNotes(lists: NoteRow[][]): Promise<(notes: NoteRow[]) => Note[]> {
  const paths = lists.flat().flatMap((n) => n.attachments.map((a) => a.storage_path));
  const urls = await signAttachmentUrls(paths);
  return (notes) =>
    notes.map((n) => ({
      text: n.body,
      author: n.author ? memberName(n.author) : '',
      when: rel(n.created_at),
      av: n.author ? memberAv(n.author) : { i: '', bg: 'var(--hover)', fg: 'var(--faint)' },
      atts: [...n.attachments]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((a) => ({
          name: a.name,
          size: fileSize(a.size),
          ext: fileExt(a.name),
          // An empty url makes NoteThread show its "no longer available" message.
          url: urls[a.storage_path] ?? '',
          type: a.mime_type ?? '',
        })),
    }));
}

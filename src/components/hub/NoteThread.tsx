'use client';

// design/NoteThread.dc.html — notes composer + list (markdown-lite, lists, attachments, previews).
import { Fragment, useEffect, useRef, useState } from 'react';
import type { Av } from '@/lib/hub';
import { Avatar } from './Avatar';
import { Button } from './Button';

export type Attachment = { name: string; size: string; ext: string; url: string; type: string };
export type Note = { text: string; author: string; when: string; av: Av; atts?: Attachment[] };

/** Controlled mode: the parent owns the draft and stores notes. Without it the thread keeps local state. */
export type Thread = {
  draft: string;
  onDraft: (value: string) => void;
  addNote: (atts: Attachment[]) => void;
  notes: Note[];
};

const fsz = (b: number) =>
  b < 1024 ? b + ' B' : b < 1048576 ? Math.round(b / 1024) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
const extOf = (n: string) => {
  const m = /\.([a-z0-9]{1,5})$/i.exec(n || '');
  return (m ? m[1]! : 'file').toUpperCase();
};

// ---------------------------------------------------------------------------
// Markdown-lite rendering: **b**, _i_, ~~s~~, `code`, [text](url), - , 1. , - [ ] / - [x]
// ---------------------------------------------------------------------------
function inline(str: string, key: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|~~([^~]+)~~|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|_([^_]+)_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(str))) {
    if (m.index > last) out.push(str.slice(last, m.index));
    const k = key + '-' + i++;
    if (m[2])
      out.push(
        <strong key={k} className="font-semibold">
          {m[2]}
        </strong>,
      );
    else if (m[3])
      out.push(
        <s key={k} className="text-muted">
          {m[3]}
        </s>,
      );
    else if (m[4])
      out.push(
        <code
          key={k}
          className="rounded-[4px] border border-border-subtle bg-surface-sunken px-1 py-px font-[ui-monospace,Menlo,monospace] text-[0.9em]"
        >
          {m[4]}
        </code>,
      );
    else if (m[5])
      out.push(
        <a key={k} href={m[6]} target="_blank" rel="noreferrer" className="text-ink underline underline-offset-2">
          {m[5]}
        </a>,
      );
    else if (m[7]) out.push(<em key={k}>{m[7]}</em>);
    last = re.lastIndex;
  }
  if (last < str.length) out.push(str.slice(last));
  return out;
}

const CK_RX = /^\s*[-*]\s+\[[ xX]\]\s+/;
const NUM_RX = /^\s*\d+[.)]\s+/;
const BUL_RX = /^\s*[-*•]\s+/;
const ANY_RX = /^\s*(?:[-*]\s+\[[ xX]\]|[-*•]|\d+[.)])\s+/;

type ListType = 'check' | 'ul' | 'ol';

function render(text: string): React.ReactNode[] {
  const lines = (text || '').split('\n');
  const blocks: { type: ListType | 'p'; key: string; items: React.ReactNode[] }[] = [];
  let list: { type: ListType | 'p'; key: string; items: React.ReactNode[] } | null = null;
  lines.forEach((ln, i) => {
    const cm = /^\s*[-*]\s+\[([ xX])\]\s+(.*)$/.exec(ln);
    const bm = !cm && /^\s*[-*•]\s+(.*)$/.exec(ln);
    const nm = /^\s*\d+[.)]\s+(.*)$/.exec(ln);
    const lm = cm || bm || nm;
    const t: ListType = cm ? 'check' : bm ? 'ul' : 'ol';
    if (lm) {
      if (!list || list.type !== t) {
        list = { type: t, key: 'u' + i, items: [] };
        blocks.push(list);
      }
      if (cm) {
        const done = cm[1] !== ' ';
        list.items.push(
          <li key={i} className="flex items-start gap-[7px]">
            <span
              className="mt-[3px] size-[13px] flex-none rounded-[3px] text-center text-[9px] leading-[10px] text-white"
              style={{
                border: '1.5px solid ' + (done ? 'var(--ink)' : 'var(--border-strong)'),
                background: done ? 'var(--ink)' : 'transparent',
              }}
            >
              {done ? '✓' : ''}
            </span>
            <span className={done ? 'text-muted line-through' : undefined}>{inline(cm[2]!, 'l' + i)}</span>
          </li>,
        );
      } else {
        list.items.push(<li key={i}>{inline(lm[1]!, 'l' + i)}</li>);
      }
    } else {
      list = null;
      blocks.push({
        type: 'p',
        key: String(i),
        items: [
          <div key={i} style={{ minHeight: ln ? undefined : '0.6em' }}>
            {inline(ln, 'p' + i)}
          </div>,
        ],
      });
    }
  });
  return blocks.map((b) => {
    if (b.type === 'p') return <Fragment key={b.key}>{b.items}</Fragment>;
    const style: React.CSSProperties = {
      margin: '2px 0',
      paddingLeft: b.type === 'check' ? 0 : b.type === 'ol' ? 20 : 18,
      listStyle: b.type === 'check' ? 'none' : b.type === 'ol' ? 'decimal' : 'disc',
    };
    return b.type === 'ol' ? (
      <ol key={b.key} style={style}>
        {b.items}
      </ol>
    ) : (
      <ul key={b.key} style={style}>
        {b.items}
      </ul>
    );
  });
}

const previewKind = (a: Attachment) => {
  if (!a.url || a.url === '#') return 'none';
  const t = a.type || '';
  const x = (a.ext || '').toLowerCase();
  if (t.startsWith('image/') || /^(png|jpe?g|gif|webp|svg|bmp|avif)$/.test(x)) return 'img';
  if (
    t === 'application/pdf' ||
    t.startsWith('text/') ||
    t.startsWith('video/') ||
    t.startsWith('audio/') ||
    /^(pdf|txt|md|csv|json|mp4|webm|mp3|wav|html?)$/.test(x)
  )
    return 'frame';
  return 'none';
};

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
const BulletsIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
  >
    <circle cx="3" cy="4" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="3" cy="8" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="3" cy="12" r="1.1" fill="currentColor" stroke="none" />
    <path d="M6.5 4h7M6.5 8h7M6.5 12h7" />
  </svg>
);
const NumberedIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
  >
    <path d="M2.2 2.8l1-.6v3.6" strokeWidth="1.2" />
    <path d="M6.5 4h7M6.5 8h7M6.5 12h7" />
  </svg>
);
const CheckIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1.8 4.2l1.3 1.3 2.3-2.6" />
    <path d="M6.5 4h7M6.5 8h7M6.5 12h7" />
  </svg>
);

const toolBtn =
  'h-[26px] w-[26px] cursor-pointer rounded-[5px] border-0 bg-transparent text-[13px] text-ink-3 hover:bg-hover hover:text-ink';
const menuItem =
  'flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-md border-0 bg-transparent px-2.5 text-left text-[13px] text-ink hover:bg-hover';
const keep = (e: React.MouseEvent) => e.preventDefault();

type Pending = Attachment & { id: string };

export function NoteThread({ thread }: { thread?: Thread }) {
  const [localDraft, setLocalDraft] = useState('');
  const [localNotes, setLocalNotes] = useState<Note[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [listOpen, setListOpen] = useState(false);
  const [pv, setPv] = useState<Attachment | null>(null);
  const ta = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPv(null);
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  const draft = thread ? thread.draft || '' : localDraft;
  const setDraft = (v: string) => (thread ? thread.onDraft(v) : setLocalDraft(v));
  const later = (fn: () => void) => setTimeout(fn, 0);

  function wrap(pre: string, post: string, ph: string) {
    const el = ta.current;
    const v = draft;
    const a = el ? el.selectionStart : v.length;
    const b = el ? el.selectionEnd : v.length;
    const sel = v.slice(a, b) || ph;
    setDraft(v.slice(0, a) + pre + sel + post + v.slice(b));
    later(() => {
      if (ta.current) {
        ta.current.focus();
        ta.current.setSelectionRange(a + pre.length, a + pre.length + sel.length);
      }
    });
  }

  function list(type: ListType) {
    const el = ta.current;
    const v = draft;
    const a = el ? el.selectionStart : v.length;
    const b = el ? el.selectionEnd : v.length;
    const s0 = v.lastIndexOf('\n', a - 1) + 1;
    let e0 = v.indexOf('\n', b);
    if (e0 < 0) e0 = v.length;
    const seg = v.slice(s0, e0).split('\n');
    const kindOf = (l: string) => (CK_RX.test(l) ? 'check' : NUM_RX.test(l) ? 'ol' : BUL_RX.test(l) ? 'ul' : null);
    const all = seg.every((l) => kindOf(l) === type);
    const ns = seg
      .map((l, i) => {
        const bare = l.replace(ANY_RX, '');
        return all ? bare : (type === 'ol' ? i + 1 + '. ' : type === 'check' ? '- [ ] ' : '- ') + bare;
      })
      .join('\n');
    setDraft(v.slice(0, s0) + ns + v.slice(e0));
    later(() => {
      if (ta.current) {
        ta.current.focus();
        ta.current.setSelectionRange(s0, s0 + ns.length);
      }
    });
  }

  function submit() {
    const atts = pending.map(({ name, size, ext, url, type }) => ({ name, size, ext, url, type }));
    if (thread) {
      if (!draft.trim() && !atts.length) return;
      thread.addNote(atts);
      setPending([]);
      return;
    }
    const x = draft.trim();
    if (!x && !atts.length) return;
    setLocalDraft('');
    setPending([]);
    setLocalNotes((ns) => [
      { text: x, atts, author: 'You', when: 'just now', av: { i: 'Y', bg: 'var(--hover)', fg: 'var(--ink-3)' } },
      ...ns,
    ]);
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const m = e.metaKey || e.ctrlKey;
    const el = ta.current;
    if (e.key === 'Enter' && !m && !e.shiftKey && el) {
      const v = draft;
      const a = el.selectionStart;
      if (a === el.selectionEnd) {
        const s0 = v.lastIndexOf('\n', a - 1) + 1;
        const line = v.slice(s0, a);
        const pm = /^(\s*)(?:([-*])\s+\[[ xX]\]|([-*•])|(\d+)[.)])\s+/.exec(line);
        if (pm) {
          e.preventDefault();
          // Enter on an empty list item exits the list.
          if (line.length === pm[0].length) {
            setDraft(v.slice(0, s0) + v.slice(a));
            later(() => ta.current?.setSelectionRange(s0, s0));
            return;
          }
          const nx = pm[1] + (pm[2] ? '- [ ] ' : pm[4] ? +pm[4] + 1 + '. ' : '- ');
          setDraft(v.slice(0, a) + '\n' + nx + v.slice(a));
          const c = a + 1 + nx.length;
          later(() => ta.current?.setSelectionRange(c, c));
          return;
        }
      }
    }
    if (!m) return;
    const k = e.key.toLowerCase();
    if (e.shiftKey && (e.code === 'Digit8' || e.code === 'Digit7' || e.code === 'Digit9')) {
      e.preventDefault();
      list(e.code === 'Digit8' ? 'ul' : e.code === 'Digit7' ? 'ol' : 'check');
      return;
    }
    if (k === 'b') {
      e.preventDefault();
      wrap('**', '**', 'bold');
    } else if (k === 'i') {
      e.preventDefault();
      wrap('_', '_', 'italic');
    } else if (k === 'enter') {
      e.preventDefault();
      submit();
    }
  }

  function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!files.length) return;
    setPending((p) => [
      ...p,
      ...files.map((f) => ({
        id: Math.random().toString(36).slice(2),
        name: f.name,
        size: fsz(f.size),
        ext: extOf(f.name),
        url: URL.createObjectURL(f),
        type: f.type || '',
      })),
    ]);
  }

  const notes = thread ? thread.notes || [] : localNotes;
  const kind = pv ? previewKind(pv) : '';

  return (
    <div className="flex flex-col gap-2">
      <div className="relative rounded-md border border-border-strong bg-surface focus-within:border-fainter">
        <textarea
          ref={ta}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          placeholder="Add a note…"
          rows={2}
          className="block w-full resize-y border-0 bg-transparent px-2.5 pt-[9px] pb-1.5 text-base leading-[1.45] text-ink outline-none"
        />
        {pending.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-2.5 pt-0.5 pb-2">
            {pending.map((pa) => (
              <span
                key={pa.id}
                className="inline-flex h-6 max-w-[220px] items-center gap-1.5 rounded-sm border border-border bg-surface-sunken pr-1 pl-2 text-[12px] text-ink-2"
              >
                <span className="text-[10px] font-semibold tracking-[0.03em] text-faint">{pa.ext}</span>
                <span className="truncate">{pa.name}</span>
                <span className="text-[11.5px] whitespace-nowrap text-fainter">{pa.size}</span>
                <button
                  type="button"
                  onClick={() => setPending((p) => p.filter((x) => x.id !== pa.id))}
                  title="Remove"
                  className="size-[18px] cursor-pointer rounded-[4px] border-0 bg-transparent p-0 text-[13px] leading-none text-faint hover:bg-hover hover:text-ink"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-0.5 border-t border-border-subtle bg-surface-sunken px-1.5 py-1">
          <button
            type="button"
            onMouseDown={keep}
            onClick={() => wrap('**', '**', 'bold')}
            title="Bold (⌘B)"
            className={`${toolBtn} font-bold`}
          >
            B
          </button>
          <button
            type="button"
            onMouseDown={keep}
            onClick={() => wrap('_', '_', 'italic')}
            title="Italic (⌘I)"
            className={`${toolBtn} font-[Georgia,serif] italic`}
          >
            I
          </button>
          <button
            type="button"
            onMouseDown={keep}
            onClick={() => wrap('~~', '~~', 'text')}
            title="Strikethrough"
            className={`${toolBtn} line-through`}
          >
            S
          </button>
          <span className="mx-1 h-3.5 w-px bg-border" />
          <span className="relative inline-flex">
            <button
              type="button"
              onMouseDown={keep}
              onClick={() => setListOpen((o) => !o)}
              title="Insert list"
              className={`inline-flex h-[26px] cursor-pointer items-center gap-[3px] rounded-[5px] border-0 pr-[5px] pl-1.5 text-ink-3 hover:bg-hover hover:text-ink ${
                listOpen ? 'bg-hover' : 'bg-transparent'
              }`}
            >
              <BulletsIcon />
              <svg
                width="9"
                height="6"
                viewBox="0 0 10 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 1l4 4 4-4" />
              </svg>
            </button>
            {listOpen && (
              <>
                <div
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setListOpen(false);
                  }}
                  className="fixed inset-0 z-40"
                />
                <div className="absolute bottom-[30px] left-0 z-[41] flex w-[228px] flex-col gap-px rounded-xl border border-border bg-surface p-[5px] shadow-[0_8px_24px_rgba(20,20,15,0.12),0_1px_3px_rgba(20,20,15,0.06)]">
                  {(
                    [
                      ['ul', 'Bulleted list', '⌘⇧8', <BulletsIcon key="i" />],
                      ['ol', 'Numbered list', '⌘⇧7', <NumberedIcon key="i" />],
                      ['check', 'Checklist', '⌘⇧9', <CheckIcon key="i" />],
                    ] as const
                  ).map(([type, label, sc, icon]) => (
                    <button
                      key={type}
                      type="button"
                      onMouseDown={keep}
                      onClick={() => {
                        setListOpen(false);
                        list(type);
                      }}
                      className={menuItem}
                    >
                      <span className="flex text-muted">{icon}</span>
                      <span className="flex-1">{label}</span>
                      <span className="text-[12px] tracking-[0.04em] text-faint">{sc}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </span>
          <span className="mx-1 h-3.5 w-px bg-border" />
          <label
            title="Add an attachment"
            className="inline-flex h-[26px] cursor-pointer items-center gap-[5px] rounded-[5px] px-2 text-[12px] text-ink-3 hover:bg-hover hover:text-ink"
          >
            <span className="text-[14px] leading-none">+</span>Attach
            <input type="file" multiple onChange={onFiles} className="hidden" />
          </label>
          <span className="flex-1" />
          <Button label="Add note" size="sm" variant="secondary" onClick={submit} />
        </div>
      </div>

      {notes.map((nt, idx) => (
        <div key={idx} className="flex gap-2.5 border-t border-border-subtle pt-2.5 pb-0.5">
          <Avatar av={nt.av} size={20} />
          <div className="min-w-0 flex-1">
            <div className="text-sm text-faint">
              <span className="font-medium text-ink">{nt.author}</span> · {nt.when}
            </div>
            <div className="mt-0.5 text-base leading-normal break-words text-ink">{render(nt.text)}</div>
            {!!nt.atts?.length && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {nt.atts.map((at, j) => (
                  <a
                    key={j}
                    href={at.url || '#'}
                    onClick={(e) => {
                      e.preventDefault();
                      setPv({ ...at, url: at.url || '#' });
                    }}
                    className="inline-flex h-[26px] max-w-[240px] cursor-pointer items-center gap-1.5 rounded-sm border border-border bg-surface px-2 text-[12px] text-ink-2 no-underline hover:border-border-strong hover:bg-surface-hover"
                  >
                    <span className="text-[10px] font-semibold tracking-[0.03em] text-faint">{at.ext}</span>
                    <span className="truncate">{at.name}</span>
                    <span className="text-[11.5px] whitespace-nowrap text-fainter">{at.size}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      {pv && (
        <div
          onClick={() => setPv(null)}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(20,20,18,0.55)] p-8"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex h-[min(86vh,100%)] w-[min(960px,100%)] flex-col overflow-hidden rounded-xl bg-surface shadow-[0_24px_64px_rgba(0,0,0,0.25)]"
          >
            <div className="flex items-center gap-2.5 border-b border-border py-2.5 pr-3 pl-4">
              <span className="rounded-[4px] border border-border px-[5px] py-0.5 text-[10px] font-semibold tracking-[0.03em] text-faint">
                {pv.ext}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{pv.name}</span>
              <span className="text-[12px] text-faint">{pv.size}</span>
              <a
                href={pv.url}
                download={pv.name}
                className="inline-flex h-7 items-center rounded-sm border border-border-strong bg-surface px-2.5 text-md font-medium text-ink no-underline hover:bg-surface-hover"
              >
                Download
              </a>
              <button
                type="button"
                onClick={() => setPv(null)}
                title="Close (Esc)"
                className="size-7 cursor-pointer rounded-sm border-0 bg-transparent text-[18px] leading-none text-muted hover:bg-hover hover:text-ink"
              >
                ×
              </button>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center bg-surface-sunken">
              {kind === 'img' && (
                // eslint-disable-next-line @next/next/no-img-element -- user attachments, any origin
                <img src={pv.url} alt={pv.name} className="block max-h-full max-w-full object-contain" />
              )}
              {kind === 'frame' && <iframe src={pv.url} title={pv.name} className="size-full border-0 bg-white" />}
              {kind === 'none' && (
                <div className="flex flex-col gap-1.5 text-center text-[13px] text-muted">
                  <span className="font-semibold text-ink">No preview available</span>
                  <span>
                    {pv.url && pv.url !== '#'
                      ? 'Download the file to open it.'
                      : 'This file is no longer available — attachments are kept only for this session.'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

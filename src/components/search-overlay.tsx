"use client";

// ⌘K search — design/PM Dashboard v3.dc.html (searchOpen, results, searchHint).
// Opens with ⌘K / Ctrl+K anywhere; Esc or a click outside closes it.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { openFeature } from "@/components/feature/url";
import { openPoc } from "@/components/poc/url";
import { getSearchIndex } from "@/lib/actions";
import type { SearchIndex } from "@/lib/queries";

type Result = { key: string; kind: string; label: string; sub: string; go: () => void };

export function SearchOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      // As in the prototype, Esc closes the search together with any open drawer.
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  // Remounts on every open, so the query starts empty and the index is loaded fresh.
  return open ? <Search close={() => setOpen(false)} /> : null;
}

function Search({ close }: { close: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [index, setIndex] = useState<SearchIndex | null>(null);

  useEffect(() => {
    let live = true;
    getSearchIndex().then((d) => live && setIndex(d));
    return () => {
      live = false;
    };
  }, []);

  const query = q.trim().toLowerCase();
  const m = (x: string | null | undefined) => !!x && x.toLowerCase().includes(query);
  const pick = (fn: () => void) => () => {
    close();
    fn();
  };
  const results: Result[] =
    !query || !index
      ? []
      : [
          ...index.projects
            .filter((p) => m(p.name) || m(p.description))
            .map((p) => ({ key: p.id, kind: "Project", label: p.name, sub: p.description ?? "", go: pick(() => router.push(`/projects/${p.id}`)) })),
          ...index.versions
            .filter((v) => m(v.name))
            .map((v) => ({
              key: v.id,
              kind: "Version",
              label: v.name,
              sub: `${v.project.name} · Version ${v.num}`,
              go: pick(() => router.push(`/projects/${v.project.id}?version=${v.id}`)),
            })),
          ...index.pocs
            .filter((c) => m(c.name) || m(c.org))
            .map((c) => ({ key: c.id, kind: "POC", label: c.name, sub: c.org ?? "", go: pick(() => openPoc(c.id)) })),
          ...index.features
            .filter((f) => m(f.name) || m(f.description))
            .map((f) => ({
              key: f.id,
              kind: "Feature",
              label: f.name,
              sub: f.version ? `${f.version.project.name} → Version ${f.version.num}` : "No project",
              go: pick(() => openFeature(f.id)),
            })),
        ].slice(0, 12);
  const hint = !query ? "Type to search across every project." : results.length ? "Enter opens the first result" : index ? "No matches." : "";

  return (
    <div onClick={close} className="fixed inset-0 z-60 flex items-start justify-center bg-[rgba(28,27,26,0.22)] pt-[12vh]">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[min(580px,92vw)] overflow-hidden rounded-[10px] border border-border bg-surface shadow-[0_20px_50px_rgba(28,27,26,0.18)]"
      >
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) results[0].go();
          }}
          placeholder="Search projects, versions, features…"
          className="h-12 w-full border-0 border-b border-hover bg-transparent px-4 text-[15px] outline-none"
        />
        <div className="max-h-[50vh] overflow-auto p-1.5">
          {results.map((r) => (
            <button
              key={`${r.kind}:${r.key}`}
              type="button"
              onClick={r.go}
              className="flex w-full cursor-pointer items-center gap-3 rounded-md border-0 bg-transparent px-2.5 py-2 text-left hover:bg-surface-muted"
            >
              <span className="w-14 shrink-0 text-[11px] font-medium tracking-[0.04em] text-faint uppercase">{r.kind}</span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-medium">{r.label}</span>
                <span className="block truncate text-[12px] text-faint">{r.sub}</span>
              </span>
            </button>
          ))}
          <div className="p-2.5 text-[12.5px] text-fainter">{hint}</div>
        </div>
      </div>
    </div>
  );
}

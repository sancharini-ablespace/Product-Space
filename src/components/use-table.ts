'use client';

// Table sorting + selection from the prototype's mkT(): click a header to cycle
// asc → desc → reset (or desc first for "descFirst" columns); checkbox selection
// with a select-all that goes indeterminate.
import { useState } from 'react';

export interface Column<R> {
  key: string | null;
  label: string;
  right?: boolean;
  descFirst?: boolean;
  sort?: (r: R) => string | number;
}

export function useTable<R extends { id: string }>(rows: R[], columns: Column<R>[]) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [sel, setSel] = useState<Record<string, boolean>>({});

  const col = sort && columns.find((c) => c.key === sort.key);
  const out =
    col?.sort && sort
      ? [...rows].sort((a, b) => {
          const x = col.sort!(a);
          const y = col.sort!(b);
          return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
        })
      : rows;

  const ids = out.filter((r) => sel[r.id]).map((r) => r.id);
  const all = out.length > 0 && ids.length === out.length;

  return {
    rows: out,
    selectedIds: ids,
    isSelected: (id: string) => !!sel[id],
    toggle: (id: string) => setSel((s) => ({ ...s, [id]: !s[id] })),
    allSelected: all,
    someSelected: ids.length > 0 && !all,
    toggleAll: () => setSel(all ? {} : Object.fromEntries(out.map((r) => [r.id, true]))),
    clear: () => setSel({}),
    headers: columns.map((c) => {
      const active = !!sort && sort.key === c.key;
      const first = c.descFirst ? -1 : 1;
      return {
        ...c,
        arrow: active ? (sort!.dir > 0 ? '↑' : '↓') : '',
        active,
        onClick: c.key
          ? () =>
              setSort((s) =>
                !s || s.key !== c.key
                  ? { key: c.key!, dir: first }
                  : s.dir === first
                    ? { key: c.key!, dir: -first as 1 | -1 }
                    : null,
              )
          : undefined,
      };
    }),
  };
}

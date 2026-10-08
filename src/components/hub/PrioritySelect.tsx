'use client';

// design/PrioritySelect.dc.html
import { useState } from 'react';
import { PRI_TONE } from '@/lib/hub';
import { SelectChevron } from './icons';

export type Priority = 'High' | 'Medium' | 'Low';

export function PrioritySelect({
  value,
  onChange,
}: {
  value?: Priority;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  const [local, setLocal] = useState<string | null>(null);
  const v = value ?? local ?? 'Medium';
  return (
    <span onClick={(e) => e.stopPropagation()} className="relative inline-flex items-center">
      <select
        value={v}
        onChange={onChange ?? ((e) => setLocal(e.target.value))}
        className="cursor-pointer appearance-none rounded-sm border border-transparent bg-transparent py-0.5 pr-5 pl-1.5 text-md font-medium outline-none hover:border-border-strong hover:bg-surface"
        style={{ color: `var(--tone-${PRI_TONE[v] || 'gray'}-fg)` }}
      >
        <option value="High">High</option>
        <option value="Medium">Medium</option>
        <option value="Low">Low</option>
      </select>
      <SelectChevron color="var(--faint)" />
    </span>
  );
}

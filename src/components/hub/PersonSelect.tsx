"use client";

// design/PersonSelect.dc.html — single person, avatar-only trigger over a hidden native select.
import { useState } from "react";
import { av } from "@/lib/hub";
import { Avatar } from "./Avatar";

export type Person = { id: string; name: string };

export function PersonSelect({
  value,
  people,
  size = 20,
  onChange,
}: {
  value?: string;
  /** Team members to choose from (the prototype hard-codes its nine names). */
  people: Person[];
  size?: number;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  const [local, setLocal] = useState<string | null>(null);
  const v = value ?? local ?? people[0]?.id ?? "";
  const name = people.find((p) => p.id === v)?.name ?? "";
  const a = av(name);
  return (
    <span
      onClick={(e) => e.stopPropagation()}
      title={name}
      className="relative inline-flex shrink-0 items-center justify-center rounded-full p-0.5 hover:bg-surface hover:shadow-[0_0_0_1px_var(--border-strong)]"
    >
      <Avatar av={{ ...a, name }} size={size} />
      <select
        value={v}
        onChange={onChange ?? ((e) => setLocal(e.target.value))}
        title={name}
        className="absolute inset-0 size-full cursor-pointer appearance-none border-0 text-base opacity-0"
      >
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </span>
  );
}

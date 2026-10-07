// design/AvatarStack.dc.html
import type { Av } from "@/lib/hub";
import { Avatar } from "./Avatar";

export function AvatarStack({
  people = [],
  max = 4,
  align = "start",
  empty,
}: {
  people?: Av[];
  max?: number;
  align?: "start" | "end";
  /** Shown when there are no people (prototype default "—"). */
  empty?: string;
}) {
  const more = people.length > max ? `+${people.length - max}` : people.length ? "" : (empty ?? "—");
  return (
    <span className="flex items-center" style={{ justifyContent: align === "end" ? "flex-end" : "flex-start" }}>
      {people.slice(0, max).map((p, i) => (
        <Avatar key={i} av={p} size={22} ring overlap={i > 0} square={!!p.square} title={p.name} />
      ))}
      <span className="ml-1 text-sm text-faint">{more}</span>
    </span>
  );
}

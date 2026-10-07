// design/Confidence.dc.html — ship confidence, toned by thresholds.
import { CONF_HIGH, CONF_LOW, confTone } from "@/lib/hub";

export function Confidence({
  value = 60,
  high = CONF_HIGH,
  low = CONF_LOW,
  onClick,
}: {
  value?: number | string;
  high?: number;
  low?: number;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const n = parseInt(String(value));
  const t = confTone(n, +high, +low);
  const fg = `var(--tone-${t}-fg)`;
  const dot = <span className="size-1.5 rounded-full" style={{ background: `var(--tone-${t}-dot)` }} />;

  if (onClick) {
    return (
      <span onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClick}
          title="Update confidence"
          className="-ml-[7px] inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-transparent bg-transparent px-1.5 py-0.5 text-md font-medium tabular-nums hover:border-border-strong hover:bg-surface"
          style={{ color: fg }}
        >
          {dot}
          {n}%
        </button>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-md font-medium tabular-nums" style={{ color: fg }}>
      {dot}
      {n}%
    </span>
  );
}

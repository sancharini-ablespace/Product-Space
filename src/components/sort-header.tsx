// Sortable column header button from the prototype's table headers (c.onClick / c.arrow).
export function SortHeader({
  label,
  right,
  arrow,
  active,
  onClick,
}: {
  label: string;
  right?: boolean;
  arrow: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={onClick ? `Sort by ${label.toLowerCase()}` : undefined}
      className={`-mx-1 flex h-6 min-w-0 items-center gap-1 rounded-[4px] border-0 bg-transparent px-1 text-left whitespace-nowrap ${
        onClick ? "cursor-pointer hover:bg-hover hover:text-ink!" : "cursor-default"
      }`}
      style={{ justifyContent: right ? "flex-end" : "flex-start", color: active ? "var(--ink)" : "var(--faint)", font: "inherit" }}
    >
      <span>{label}</span>
      <span className="w-2.5 text-[11px]">{arrow}</span>
    </button>
  );
}

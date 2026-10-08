// design/AddChip.dc.html — dashed "+ Add owner/POC/watcher" pill.
export function AddChip({
  label = '+ Add',
  title,
  onClick,
}: {
  label?: string;
  title?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title || undefined}
      className="h-[26px] cursor-pointer whitespace-nowrap rounded-[13px] border border-dashed border-border-strong bg-surface px-2.5 text-md text-muted hover:border-border-hover hover:text-ink"
    >
      {label}
    </button>
  );
}

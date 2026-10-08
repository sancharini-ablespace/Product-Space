// design/ProgressBar.dc.html — work completed (neutral).
export function ProgressBar({
  value = '50%',
  maxWidth = 96,
  hideLabel,
}: {
  value?: string | number;
  maxWidth?: number;
  hideLabel?: boolean;
}) {
  const v = typeof value === 'number' ? value + '%' : value;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="h-1 flex-1 overflow-hidden rounded-[2px] bg-[#ebeae6]" style={{ maxWidth }}>
        <div className="h-full bg-ink-2" style={{ width: v }} />
      </div>
      <span className="text-sm text-ink-3 tabular-nums">{hideLabel ? '' : v}</span>
    </div>
  );
}

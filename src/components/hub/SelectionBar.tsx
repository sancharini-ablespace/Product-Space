// design/SelectionBar.dc.html — floating bulk-action bar.
import { Button } from './Button';

export function SelectionBar({
  label = '3 selected',
  actions = [{ label: 'Archive' }, { label: 'Delete' }],
  asking,
  askMessage = '',
  onConfirm,
  onCancel,
  onClear,
}: {
  label?: string;
  actions?: { label: string; onClick?: () => void }[];
  asking?: boolean;
  askMessage?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClear?: () => void;
}) {
  return (
    <div className="fixed bottom-6 left-1/2 z-[35] flex w-max max-w-[calc(100vw-32px)] -translate-x-1/2 flex-wrap items-center gap-2 rounded-[12px] border border-border-strong bg-surface py-2 pr-2 pl-4 text-base text-ink shadow-[0_12px_32px_rgba(28,27,26,0.16),0_2px_6px_rgba(28,27,26,0.08)]">
      <span className="mr-1 font-semibold">{label}</span>
      {asking ? (
        <>
          <span className="text-ink-2">{askMessage}</span>
          <Button label="Cancel" variant="ghost" size="sm" onClick={onCancel} />
          <Button label="Delete" variant="danger" size="sm" onClick={onConfirm} />
        </>
      ) : (
        <>
          {actions.map((a) => (
            <Button key={a.label} label={a.label} variant="secondary" size="sm" onClick={a.onClick} />
          ))}
          <Button label="Clear selection" variant="ghost" size="sm" onClick={onClear} />
        </>
      )}
    </div>
  );
}

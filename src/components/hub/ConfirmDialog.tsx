'use client';

// design/ConfirmDialog.dc.html — destructive confirmation with an impact list.
import { useEffect } from 'react';
import { Button } from './Button';

export type ImpactRow = { text: string; sub?: string; tone?: 'red' | 'amber' | 'gray'; dot?: string };

const DOT = { red: 'var(--tone-red-fg)', amber: 'var(--tone-amber-fg)', gray: 'var(--faint)' };

export function ConfirmDialog({
  title,
  message = "This can't be undone. Here's everywhere it will be affected:",
  impact = [],
  checkLabel,
  checked,
  onCheck,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: {
  title: string;
  message?: string;
  impact?: ImpactRow[];
  checkLabel?: string;
  checked?: boolean;
  onCheck?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  confirmLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onCancel) onCancel();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onCancel]);

  return (
    <div>
      <div onClick={onCancel} className="fixed inset-0 z-60 bg-scrim" />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed top-1/2 left-1/2 z-[61] flex max-h-[calc(100vh-48px)] w-[min(460px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-auto rounded-[12px] border border-border bg-surface shadow-[0_20px_48px_rgba(28,27,26,0.2),0_2px_8px_rgba(28,27,26,0.08)]"
      >
        <div className="px-5 pt-[18px] pb-1.5">
          <div className="text-[16px] font-semibold tracking-[-0.01em] text-pretty text-ink">{title}</div>
          <div className="mt-1 text-base text-muted">{message}</div>
        </div>
        <div className="flex flex-col px-5 pt-1.5 pb-1">
          {impact.map((r, i) => (
            <div key={i} className="flex gap-2.5 border-b border-border-subtle py-[9px] text-base leading-[1.45]">
              <span
                className="mt-[7px] size-1.5 shrink-0 rounded-full"
                style={{ background: r.dot || DOT[r.tone ?? 'gray'] || DOT.gray }}
              />
              <div className="min-w-0">
                <div className="text-ink">{r.text}</div>
                {r.sub && <div className="mt-px text-md text-pretty text-muted">{r.sub}</div>}
              </div>
            </div>
          ))}
        </div>
        {checkLabel && (
          <label className="mx-5 mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface-sunken px-2.5 py-[9px] text-base text-ink">
            <input
              type="checkbox"
              checked={!!checked}
              onChange={onCheck}
              className="m-0 size-[15px] cursor-pointer accent-[var(--tone-red-fg)]"
            />
            <span>{checkLabel}</span>
          </label>
        )}
        <div className="flex justify-end gap-2 px-5 py-4">
          <Button label="Cancel" variant="secondary" size="sm" onClick={onCancel} />
          <Button label={confirmLabel} variant="danger" size="sm" onClick={onConfirm} />
        </div>
      </div>
    </div>
  );
}

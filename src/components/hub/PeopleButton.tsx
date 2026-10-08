// design/PeopleButton.dc.html — avatar stack that opens the people/POC picker.
import type { Av } from '@/lib/hub';
import { AvatarStack } from './AvatarStack';

export function PeopleButton({
  people = [],
  max = 3,
  label,
  labelColor,
  bold,
  size = 'md',
  align = 'start',
  edge = 'start',
  title,
  onClick,
}: {
  people?: Av[];
  max?: number;
  label?: string;
  labelColor?: string;
  bold?: boolean;
  size?: 'md' | 'sm';
  align?: 'start' | 'end';
  edge?: 'start' | 'end' | 'none';
  title?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const text = label ?? (people.length ? '' : 'Add');
  return (
    <span
      onClick={(e) => e.stopPropagation()}
      className="flex min-w-0"
      style={{ justifyContent: edge === 'end' ? 'flex-end' : 'flex-start' }}
    >
      <button
        type="button"
        onClick={onClick}
        title={title || undefined}
        className="flex max-w-full min-w-0 cursor-pointer items-center gap-1.5 rounded-sm border border-transparent bg-transparent px-1.5 text-base hover:border-border-strong hover:bg-surface"
        style={{
          height: size === 'sm' ? 26 : 28,
          margin: edge === 'end' ? '0 -6px 0 0' : edge === 'none' ? 0 : '0 0 0 -6px',
          fontWeight: bold ? 500 : 400,
          color: labelColor || (people.length ? 'var(--ink)' : 'var(--fainter)'),
        }}
      >
        <AvatarStack people={people} max={max} align={align} empty="" />
        {text && <span className="truncate">{text}</span>}
      </button>
    </span>
  );
}

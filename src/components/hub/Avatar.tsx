// design/Avatar.dc.html
import type { Av } from '@/lib/hub';

export function Avatar({
  av,
  size = 20,
  square,
  ring,
  overlap,
  title,
}: {
  av?: Av;
  size?: number;
  square?: boolean;
  ring?: boolean;
  overlap?: boolean;
  title?: string;
}) {
  const a = av ?? ({} as Partial<Av>);
  return (
    <span
      title={title || a.name || ''}
      style={{
        width: size,
        height: size,
        borderRadius: square ? 'var(--r-sm)' : '50%',
        background: a.bg || 'var(--hover)',
        color: a.fg || 'var(--faint)',
        border: ring ? '2px solid var(--surface)' : 0,
        marginLeft: overlap ? -6 : 0,
        fontSize: Math.round(size * 0.5),
      }}
      className="inline-flex shrink-0 items-center justify-center font-semibold"
    >
      {a.i || ''}
    </span>
  );
}

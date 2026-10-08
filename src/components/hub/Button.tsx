// design/Button.dc.html, over the shadcn primitive.
import { Button as UiButton } from '@/components/ui/button';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANT = { primary: 'default', secondary: 'outline', ghost: 'ghost', danger: 'destructive' } as const;

export function Button({
  label,
  variant = 'secondary',
  size = 'md',
  disabled,
  title,
  onClick,
  type = 'button',
}: {
  label: React.ReactNode;
  variant?: Variant;
  size?: 'md' | 'sm';
  disabled?: boolean;
  title?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit';
}) {
  return (
    <UiButton
      type={type}
      title={title || undefined}
      variant={VARIANT[variant]}
      size={size === 'sm' ? 'sm' : 'default'}
      // As in the prototype, only a submit button sets `disabled`; any other one just ignores clicks.
      onClick={disabled ? undefined : onClick}
      disabled={type === 'submit' ? disabled : undefined}
      className="justify-start"
      style={{ opacity: disabled ? 0.45 : 1 }}
    >
      {label}
    </UiButton>
  );
}

// design/Button.dc.html
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANT: Record<Variant, string> = {
  primary: 'border-0 bg-primary text-on-primary hover:bg-primary-hover hover:text-on-primary',
  secondary: 'border border-border-strong bg-surface text-ink hover:bg-surface-muted hover:text-ink',
  ghost: 'border-0 bg-transparent text-muted hover:bg-hover hover:text-ink',
  danger: 'border-0 bg-danger text-white hover:bg-danger-hover hover:text-white',
};

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
  const sm = size === 'sm';
  return (
    <button
      type={type}
      title={title || undefined}
      onClick={disabled ? undefined : onClick}
      disabled={type === 'submit' ? disabled : undefined}
      className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md font-medium ${VARIANT[variant]} ${
        sm ? 'h-[26px] px-2.5 text-md' : 'h-[30px] px-3 text-base'
      }`}
      style={{ opacity: disabled ? 0.45 : 1 }}
    >
      {label}
    </button>
  );
}

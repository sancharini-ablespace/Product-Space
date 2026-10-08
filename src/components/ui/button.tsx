import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Slot } from 'radix-ui';

// Restyled to design/Button.dc.html; variant names stay shadcn's so other primitives keep working.
const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'border-0 bg-primary text-primary-foreground hover:bg-primary-hover hover:text-primary-foreground',
        destructive: 'border-0 bg-destructive text-white hover:bg-danger-hover hover:text-white',
        outline: 'border border-border-strong bg-surface text-ink hover:bg-surface-muted hover:text-ink',
        secondary: 'border-0 bg-secondary text-secondary-foreground hover:bg-hover',
        ghost: 'border-0 bg-transparent text-muted hover:bg-hover hover:text-ink',
        link: 'text-ink underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-[30px] px-3 text-base',
        xs: 'h-[22px] px-2 text-sm',
        sm: 'h-[26px] px-2.5 text-md',
        lg: 'h-[34px] px-4 text-lg',
        icon: 'size-[30px]',
        'icon-xs': 'size-[22px]',
        'icon-sm': 'size-[26px]',
        'icon-lg': 'size-[34px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };

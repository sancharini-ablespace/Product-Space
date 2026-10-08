'use client';

// The Stage 2 Button, navigating on click (prototype buttons that call go()/openCreate()).
import { useRouter } from 'next/navigation';
import { Button } from '@/components/hub/Button';

export function NavButton({
  label,
  href,
  variant = 'primary',
  size = 'md',
}: {
  label: string;
  href: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
}) {
  const router = useRouter();
  return <Button label={label} variant={variant} size={size} onClick={() => router.push(href)} />;
}

/** "+ New …" buttons open the create drawer (Stage 7) through `?new=`. */
export const NewButton = (p: { label: string; href: string; variant?: 'primary' | 'secondary' }) => (
  <NavButton {...p} />
);

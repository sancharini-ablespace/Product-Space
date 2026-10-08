import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// globals.css replaces Tailwind's text and radius scales with the design tokens. Without this,
// tailwind-merge reads `text-md` as a colour and drops a `text-ink` beside it.
const twMerge = extendTailwindMerge({
  override: {
    theme: {
      text: ['xs', 'sm', 'md', 'base', 'lg', 'xl', 'h2', 'h1', 'display'],
      radius: ['xs', 'sm', 'md', 'lg', 'xl', 'pill'],
    },
  },
  extend: { theme: { shadow: ['pop', 'drawer'] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

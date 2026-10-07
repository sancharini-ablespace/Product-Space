// Inline stroke glyphs used across the design components (currentColor, 1.4–1.6px stroke).

/** Small chevron used by StatusSelect / PrioritySelect (8×5). */
export function ChevronSm({ className }: { className?: string }) {
  return (
    <svg width="8" height="5" viewBox="0 0 10 6" className={className}>
      <path
        d="M1 1l4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Wrapper that positions ChevronSm at the right edge of an inline select. */
export function SelectChevron({ color }: { color: string }) {
  return (
    <span className="pointer-events-none absolute top-0 right-0 bottom-0 w-5" style={{ color }}>
      <ChevronSm className="pointer-events-none absolute top-1/2 right-[7px] -mt-[2.5px]" />
    </span>
  );
}

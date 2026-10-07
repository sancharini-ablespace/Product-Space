// design/MoreButton.dc.html — row ⋯ menu trigger.
export function MoreButton({
  active,
  onClick,
}: {
  active?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <span onClick={(e) => e.stopPropagation()} className="flex justify-end">
      <button
        type="button"
        onClick={onClick}
        title="More actions"
        className={`flex size-[26px] cursor-pointer items-center justify-center rounded-sm border-0 p-0 text-muted hover:bg-hover! hover:text-ink ${
          active ? "bg-hover" : "bg-transparent"
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 14 14">
          <circle cx="3" cy="7" r="1.3" fill="currentColor" />
          <circle cx="7" cy="7" r="1.3" fill="currentColor" />
          <circle cx="11" cy="7" r="1.3" fill="currentColor" />
        </svg>
      </button>
    </span>
  );
}

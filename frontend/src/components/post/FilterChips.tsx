interface Props {
  mine: boolean;
  lent: boolean;
  onToggleMine: () => void;
  onToggleLent: () => void;
}

/**
 * "내 글 보기" / "내가 빌려준 글" 두 개의 토글 칩.
 */
export function FilterChips({ mine, lent, onToggleMine, onToggleLent }: Props) {
  return (
    <div className="flex gap-2">
      <Chip checked={mine} label="내 글 보기" onClick={onToggleMine} />
      <Chip checked={lent} label="내가 빌려준 글" onClick={onToggleLent} />
    </div>
  );
}

function Chip({
  checked,
  label,
  onClick,
}: {
  checked: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
      className={
        'rounded-lnb-sm border px-3 py-1.5 text-xs font-bold transition-colors ' +
        (checked
          ? 'border-primary bg-primary-light text-primary'
          : 'border-border bg-card text-sub')
      }
    >
      {label}
    </button>
  );
}

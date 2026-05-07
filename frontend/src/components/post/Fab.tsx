interface Props {
  onClick: () => void;
  ariaLabel?: string;
}

/**
 * 우하단 FAB. 56px 원형, primary 컬러.
 * MobileShell 내부에서 absolute 포지셔닝.
 */
export function Fab({ onClick, ariaLabel = '새 글 작성' }: Props) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="fixed bottom-6 right-[calc(50%-240px+24px)] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl font-black text-white shadow-lnb hover:bg-primary-dark max-[480px]:right-6"
    >
      +
    </button>
  );
}

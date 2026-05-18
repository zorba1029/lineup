interface Props {
  onClick: () => void;
  ariaLabel?: string;
}

/**
 * 우하단 FAB. 56px 원형. Wanted DS lu-fab 톤(흑색 배경 + 흰 + 라인).
 * MobileShell 우하단에 fixed 포지셔닝. 480px 폭 이상이면 모바일 컨테이너 우측 안쪽으로.
 */
export function Fab({ onClick, ariaLabel = '새 글 작성' }: Props) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="fixed bottom-6 right-[calc(50%-240px+18px)] flex h-14 w-14 items-center justify-center rounded-full bg-wd-fg-primary text-white shadow-[0_8px_16px_rgba(23,23,23,0.18)] transition-transform active:scale-95 max-[480px]:right-[18px]"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-[22px] w-[22px]">
        <path
          d="M12 5v14M5 12h14"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

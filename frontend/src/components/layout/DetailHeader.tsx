import type { ReactNode } from 'react';

interface Props {
  title: string;
  onBack: () => void;
  right?: ReactNode;
}

/**
 * 디테일 화면용 sticky 헤더. Wanted DS lu-detail-header 톤.
 *  좌측: 뒤로 가기 (40×40 둥근 버튼) / 가운데: 17px 타이틀 / 우측: 옵션
 *  56px 높이, sticky top-0, bg-wd-bg-primary, 하단 1px border.
 */
export function DetailHeader({ title, onBack, right }: Props) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-wd-border-default bg-wd-bg-primary pl-1 pr-2">
      <button
        type="button"
        onClick={onBack}
        aria-label="뒤로"
        className="flex h-10 w-10 items-center justify-center rounded-full text-wd-fg-primary transition-colors hover:bg-wd-bg-tertiary active:bg-wd-bg-quaternary"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-[22px] w-[22px]">
          <path
            d="M15 6l-6 6 6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <h1 className="flex-1 text-[17px] font-bold tracking-tight text-wd-fg-primary">
        {title}
      </h1>
      {right}
    </header>
  );
}

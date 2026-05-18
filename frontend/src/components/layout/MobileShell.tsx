import type { ReactNode } from 'react';

/**
 * 모든 라우트를 감싸는 모바일 shell.
 * 480px 폭으로 중앙 정렬. 데스크톱 브라우저에서 모바일 폼팩터 시뮬레이션.
 * 배경은 wd-bg-secondary — 안쪽 흰 카드(wd-bg-primary)가 자연스럽게 떠 보이도록.
 */
export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh justify-center bg-wd-bg-secondary">
      <div className="relative flex min-h-dvh w-full max-w-mobile flex-col overflow-x-hidden bg-wd-bg-secondary">
        {children}
      </div>
    </div>
  );
}

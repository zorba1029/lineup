import type { ReactNode } from 'react';

/**
 * 모든 라우트를 감싸는 모바일 shell.
 * 480px 폭으로 중앙 정렬. 페이지 배경은 `bg-bg`(연한 회색-파랑) — 카드와 헤더의
 * `bg-card`(흰색)가 자연스럽게 떠보이도록.
 * 데스크톱 브라우저에서 모바일 폼팩터 시뮬레이션.
 */
export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex justify-center bg-bg">
      <div className="w-full max-w-mobile min-h-dvh bg-bg relative overflow-x-hidden flex flex-col">
        {children}
      </div>
    </div>
  );
}

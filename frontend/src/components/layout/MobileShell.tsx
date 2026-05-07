import type { ReactNode } from 'react';

/**
 * 모든 라우트를 감싸는 모바일 shell.
 * 480px 폭으로 중앙 정렬, 카드 모양 흰 배경.
 * 데스크톱 브라우저에서 모바일 폼팩터 시뮬레이션.
 */
export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex justify-center">
      <div className="w-full max-w-mobile min-h-dvh bg-card relative overflow-x-hidden flex flex-col">
        {children}
      </div>
    </div>
  );
}

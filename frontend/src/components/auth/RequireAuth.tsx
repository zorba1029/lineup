import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/lib/auth';
import { useMe } from '@/features/auth/useMe';

/**
 * 보호된 라우트 가드.
 * accessToken이 없으면 /login으로 리다이렉트한다.
 * 토큰이 있으면 children 렌더 + 백그라운드로 useMe()가 토큰 유효성 검증을 한다.
 * (만료라면 useMe 내부에서 store가 비워지고 다음 렌더에서 여기로 다시 와서 redirect.)
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const location = useLocation();
  // 사이드 이펙트 (백그라운드 검증)만 필요. 에러 처리는 useMe 안에서 처리.
  useMe();

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

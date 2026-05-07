import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { queryKeys } from '@/lib/queryKeys';
import type { MeResponse } from '@/lib/types';

/**
 * 현재 access token으로 자기 정보를 가져온다.
 * 401 → store clear + /login 리다이렉트.
 * accessToken이 없으면 비활성.
 */
export function useMe() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const setSession = useAuthStore((s) => s.setSession);
  const clear = useAuthStore((s) => s.clear);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: async () => apiFetch<MeResponse>('/auth/me'),
    enabled: !!accessToken,
    retry: false,
  });

  // 서버에서 받은 user를 store와 동기화 (예: 다른 기기에서 프로필 수정 시).
  useEffect(() => {
    if (query.data?.user && accessToken && refreshToken) {
      setSession({
        user: query.data.user,
        accessToken,
        refreshToken,
      });
    }
  }, [query.data, accessToken, refreshToken, setSession]);

  // 401 등 인증 실패 시 토큰 비우고 로그인으로.
  useEffect(() => {
    if (query.error instanceof ApiError && query.error.status === 401) {
      clear();
      navigate('/login', { replace: true });
    }
  }, [query.error, clear, navigate]);

  return query;
}

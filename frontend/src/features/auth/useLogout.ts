import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';

/**
 * 로그아웃: 백엔드에 알리되, 실패하더라도 로컬 토큰은 항상 비운다.
 */
export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        await apiFetch<void>('/auth/logout', { method: 'POST' });
      } catch {
        /* 백엔드 실패는 무시 — 로컬 정리는 그대로 진행 */
      }
    },
    onSettled: () => {
      clear();
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });
}

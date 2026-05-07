import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { queryKeys } from '@/lib/queryKeys';
import type { AuthSession } from '@/lib/types';

export interface LoginInput {
  username: string;
  password: string;
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      return apiFetch<AuthSession>('/auth/login', {
        method: 'POST',
        body: input,
        skipAuth: true,
      });
    },
    onSuccess: (data) => {
      setSession(data);
      queryClient.setQueryData(queryKeys.auth.me(), { user: data.user });
      navigate('/', { replace: true });
    },
  });
}

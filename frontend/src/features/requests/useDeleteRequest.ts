import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

/**
 * DELETE /api/v1/requests/:id (soft delete)
 * 성공 시 메인으로 navigate + 캐시 invalidate.
 */
export function useDeleteRequest(id: number) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      await apiFetch<void>(`/requests/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.requests.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
      navigate('/', { replace: true });
    },
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

/**
 * DELETE /api/v1/offers/:id (cancel — soft cancel)
 * 본인 + pending만. 멱등.
 */
export function useDeleteOffer(offerId: number, requestId: number) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      await apiFetch<void>(`/offers/${offerId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.requests.detail(requestId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
    },
  });
}

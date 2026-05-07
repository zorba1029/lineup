import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import type { OfferPublic } from '@/lib/types';

/**
 * POST /api/v1/offers/:id/reject
 * request 작성자만. status='pending'만 가능.
 */
export function useRejectOffer(offerId: number, requestId: number) {
  const queryClient = useQueryClient();

  return useMutation<OfferPublic, Error, void>({
    mutationFn: async () =>
      apiFetch<OfferPublic>(`/offers/${offerId}/reject`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.requests.detail(requestId),
      });
    },
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import type { OfferPublic } from '@/lib/types';

export interface CreateOfferInput {
  rental_time: string;
  return_time: string;
  rental_place: string;
  return_place: string;
}

/**
 * POST /api/v1/requests/:id/offers
 * 본인 글이거나 이미 active offer가 있으면 BE가 409.
 * 성공 시 detail 캐시 invalidate (offers 리스트 갱신용).
 */
export function useCreateOffer(requestId: number) {
  const queryClient = useQueryClient();

  return useMutation<OfferPublic, Error, CreateOfferInput>({
    mutationFn: async (input) =>
      apiFetch<OfferPublic>(`/requests/${requestId}/offers`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.requests.detail(requestId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
    },
  });
}

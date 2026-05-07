import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import type { OfferPublic } from '@/lib/types';

export interface UpdateOfferInput {
  rental_time?: string;
  return_time?: string;
  rental_place?: string;
  return_place?: string;
}

/**
 * PATCH /api/v1/offers/:id
 * 본인 + status='pending'만. 그 외 BE가 403/409.
 */
export function useUpdateOffer(offerId: number, requestId: number) {
  const queryClient = useQueryClient();

  return useMutation<OfferPublic, Error, UpdateOfferInput>({
    mutationFn: async (input) =>
      apiFetch<OfferPublic>(`/offers/${offerId}`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.requests.detail(requestId),
      });
    },
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import type { MatchedResponse } from '@/lib/types';

/**
 * POST /api/v1/offers/:id/accept
 * request 작성자만. 트랜잭션으로 다른 pending → rejected, request → matched.
 * 응답에 양 당사자 phone이 채워져 옴.
 */
export function useAcceptOffer(offerId: number, requestId: number) {
  const queryClient = useQueryClient();

  return useMutation<MatchedResponse, Error, void>({
    mutationFn: async () =>
      apiFetch<MatchedResponse>(`/offers/${offerId}/accept`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.requests.detail(requestId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
    },
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import type { RequestPublic } from '@/lib/types';
import type { Category } from '@/lib/categories';

export interface CreateRequestInput {
  name: string;
  category: Category;
  description: string;
  urgent: boolean;
}

/**
 * POST /api/v1/requests
 * 성공 시 list 캐시 invalidate + detail 캐시 prime.
 */
export function useCreateRequest() {
  const queryClient = useQueryClient();

  return useMutation<RequestPublic, Error, CreateRequestInput>({
    mutationFn: async (input) =>
      apiFetch<RequestPublic>('/requests', {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => {
      // detail 응답 shape(wrapper)와 POST 응답 shape(RequestPublic)가 달라
      // setQueryData prime은 안 함. 첫 진입 시 GET /requests/:id 호출.
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
    },
  });
}

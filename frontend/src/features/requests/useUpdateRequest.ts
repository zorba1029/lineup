import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import type { RequestPublic } from '@/lib/types';

export interface UpdateRequestInput {
  description?: string;
  urgent?: boolean;
}

/**
 * PATCH /api/v1/requests/:id
 * 작성자만. 상태가 'open'이 아니면 BE가 409.
 */
export function useUpdateRequest(id: number) {
  const queryClient = useQueryClient();

  return useMutation<RequestPublic, Error, UpdateRequestInput>({
    mutationFn: async (input) =>
      apiFetch<RequestPublic>(`/requests/${id}`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: () => {
      // detail 응답 shape이 wrapper로 바뀌어 setQueryData 직접 입력은 위험.
      // invalidate로 단순화.
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
    },
  });
}

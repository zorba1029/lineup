import { useQuery } from '@tanstack/react-query';
import { apiFetch, ApiError } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import type { RequestDetailResponse } from '@/lib/types';

/**
 * GET /api/v1/requests/:id
 * M4부터 응답이 wrapper 형태:
 *   { request, offers, pending_offer_count }
 * 404/403은 ApiError로 throw — 컴포넌트가 query.error를 보고 처리.
 */
export function useRequest(id: number | null) {
  return useQuery<RequestDetailResponse, ApiError>({
    queryKey: queryKeys.requests.detail(id ?? -1),
    queryFn: async () => apiFetch<RequestDetailResponse>(`/requests/${id}`),
    enabled: typeof id === 'number' && id > 0,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

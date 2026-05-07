import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { queryKeys, type RequestListFilters } from '@/lib/queryKeys';
import type { RequestListResponse } from '@/lib/types';

/**
 * GET /api/v1/requests
 * 같은 (dong, line_no) 글만 반환.
 * `lent=true`는 M3에서 BE가 항상 빈 리스트를 돌려주지만 UI는 동일하게 동작.
 *
 * 5초 polling으로 다른 이웃의 새 글을 자동 표시.
 */
const MAIN_POLL_MS = 5_000;

export function useRequests(filters: RequestListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.requests.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.mine) params.set('mine', 'true');
      if (filters.lent) params.set('lent', 'true');
      const qs = params.toString();
      return apiFetch<RequestListResponse>(`/requests${qs ? `?${qs}` : ''}`);
    },
    staleTime: MAIN_POLL_MS / 2,
    refetchInterval: MAIN_POLL_MS,
    refetchIntervalInBackground: false,
  });
}

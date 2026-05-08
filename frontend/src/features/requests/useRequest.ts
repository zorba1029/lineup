import { useQuery } from '@tanstack/react-query';
import { apiFetch, ApiError } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import type { RequestDetailResponse } from '@/lib/types';

/**
 * GET /api/v1/requests/:id
 * 응답 wrapper 형태:
 *   { request, offers }
 * pending_offer_count는 `request` 내부로 이동 (list/detail 공통 필드).
 * 404/403은 ApiError로 throw — 컴포넌트가 query.error를 보고 처리.
 *
 * 1초 polling — 작성자/이웃 모두 새 offer 등록·수락·거절을 빠르게 감지.
 * 만료(matched/expired/cancelled)된 글은 polling 중단.
 */
const DETAIL_POLL_MS = 1_000;

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
    refetchInterval: (query) => {
      const status = query.state.data?.request.status;
      if (status && status !== 'open') return false;
      return DETAIL_POLL_MS;
    },
    refetchIntervalInBackground: false,
  });
}

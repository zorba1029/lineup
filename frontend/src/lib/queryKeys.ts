/**
 * TanStack Query key factory.
 * 모든 queryKey는 여기서 만들어 컴포넌트 간 일관성 유지.
 */
export interface RequestListFilters {
  mine?: boolean;
  lent?: boolean;
}

export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },
  requests: {
    all: ['requests'] as const,
    list: (f: RequestListFilters) => ['requests', 'list', f] as const,
    detail: (id: number) => ['requests', 'detail', id] as const,
  },
  offers: {
    all: ['offers'] as const,
  },
} as const;

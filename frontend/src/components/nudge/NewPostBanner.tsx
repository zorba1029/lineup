import { useMemo } from 'react';
import { useLastSeen } from '@/lib/lastSeen';
import type { RequestPublic } from '@/lib/types';

/**
 * 미열람 N건 안내 배너. PLAN.md §1.B.
 *
 * 메인 페이지의 useRequests 결과를 그대로 받아서 derived 계산:
 *   created_at > lastSeenAt && author.id !== currentUserId
 *
 * 별도 fetch 없이 polling 결과와 자동 동기화. 닫기 → lastSeenAt = now.
 * 카운트 0이면 자기 자신을 렌더하지 않음 (null 반환).
 */
export interface NewPostBannerProps {
  items: RequestPublic[];
  currentUserId: number;
}

export function NewPostBanner({ items, currentUserId }: NewPostBannerProps) {
  const [lastSeen, markSeen] = useLastSeen();

  const count = useMemo(() => {
    return items.filter((it) => {
      if (it.author.id === currentUserId) return false;
      const created = new Date(it.created_at).getTime();
      return Number.isFinite(created) && created > lastSeen;
    }).length;
  }, [items, currentUserId, lastSeen]);

  if (count === 0) return null;

  return (
    <div className="mx-4 mt-3 flex items-center justify-between rounded-lnb bg-primary-light px-4 py-3 shadow-lnb-sm">
      <span className="text-sm font-bold text-primary-dark">
        새 글 {count}건이 올라왔어요 🆕
      </span>
      <button
        type="button"
        aria-label="배너 닫기"
        className="text-sub hover:text-text"
        onClick={markSeen}
      >
        ✕
      </button>
    </div>
  );
}

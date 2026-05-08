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
 *
 * 디자인은 NudgeBanner와 같은 톤 (primary 그라데이션 + 라벨 + 큰 흰 글씨 +
 * 노란 카운트 강조). 우측은 흰 칩 대신 작은 닫기(✕) 버튼.
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
    <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-lnb bg-gradient-to-br from-primary to-[#7C8BFF] px-4 py-4 shadow-lnb">
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">
          새 소식
        </span>
        <span className="text-lg font-extrabold leading-snug text-white">
          <span className="text-yellow">{count}건</span>의 새 글이 올라왔어요
        </span>
      </span>
      <button
        type="button"
        aria-label="배너 닫기"
        onClick={markSeen}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-base text-white transition-colors hover:bg-white/30"
      >
        ✕
      </button>
    </div>
  );
}

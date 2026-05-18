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
 * 디자인은 Wanted DS lu-newpost: rounded-full pill, wd-primary 배경,
 * 좌측 흰 dot이 ring expand pulse, 우측 "새로고침" hint, 클릭으로 닫음.
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
    <button
      type="button"
      onClick={markSeen}
      aria-label="새 글 보기"
      className="mx-4 mt-3 flex w-[calc(100%-2rem)] items-center gap-2.5 rounded-full bg-wd-primary py-2.5 pl-3.5 pr-4 text-[13px] font-bold text-white shadow-[0_4px_14px_rgba(0,102,255,0.25)] transition-transform active:scale-[0.99]"
    >
      <span
        aria-hidden
        className="h-[7px] w-[7px] flex-shrink-0 rounded-full bg-white animate-wd-newpost-pulse"
      />
      <span>새 요청 {count}건이 올라왔어요</span>
      <span className="ml-auto text-[11px] font-semibold opacity-85">새로고침</span>
    </button>
  );
}

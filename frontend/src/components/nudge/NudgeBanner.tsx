import { useMemo } from 'react';
import { pickRandomNudge, type NudgeItem } from '@/lib/nudgePool';

/**
 * 정적 추천 풀에서 랜덤 1건을 보여주는 nudge 배너.
 * 클릭 시 부모(MainPage)가 RequestModal을 프리필 값으로 연다.
 *
 * 페이지 mount마다 다른 추천 — useMemo([])로 lock.
 */
export interface NudgeBannerProps {
  onPick: (item: NudgeItem) => void;
}

export function NudgeBanner({ onPick }: NudgeBannerProps) {
  const item = useMemo(() => pickRandomNudge(), []);

  return (
    <button
      type="button"
      onClick={() => onPick(item)}
      className="mx-4 mt-3 flex w-[calc(100%-2rem)] items-center justify-between rounded-lnb bg-green-light px-4 py-3 text-left shadow-lnb-sm transition-colors hover:bg-green/10 active:bg-green/20"
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-bold text-text">
          혹시 <span className="text-green">{item.name}</span> 필요하지 않으세요?
        </span>
        <span className="text-xs text-sub">눌러서 같은 라인 이웃에게 부탁해보기</span>
      </span>
      <span className="text-2xl text-green">→</span>
    </button>
  );
}

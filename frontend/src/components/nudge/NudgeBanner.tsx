import { useMemo } from 'react';
import { pickRandomNudge, type NudgeItem } from '@/lib/nudgePool';

/**
 * 정적 추천 풀에서 랜덤 1건을 보여주는 nudge 배너.
 * 클릭 시 부모(MainPage)가 RequestModal을 프리필 값으로 연다.
 *
 * 디자인은 프로토타입 `.nudge-banner` 톤 — primary 그라데이션 배경 + 큰 흰 글씨 +
 * 우측 흰 "빌리기" 칩. mount마다 랜덤 1건 (useMemo([])로 lock).
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
      className="mx-4 mt-3 flex w-[calc(100%-2rem)] items-center justify-between gap-3 rounded-lnb bg-gradient-to-br from-primary to-[#7C8BFF] px-4 py-4 text-left shadow-lnb transition-transform active:scale-[0.99]"
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">
          이웃이 빌려드려요
        </span>
        <span className="text-lg font-extrabold leading-snug text-white">
          지금 <span className="text-yellow">{item.name}</span> 빌려볼까요?
        </span>
      </span>
      <span className="flex-shrink-0 rounded-lnb-sm bg-white px-3 py-2 text-sm font-extrabold text-text shadow-lnb-sm">
        빌리기
      </span>
    </button>
  );
}

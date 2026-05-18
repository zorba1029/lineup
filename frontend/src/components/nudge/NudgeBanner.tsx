import { useMemo } from 'react';
import { pickRandomNudge, type NudgeItem } from '@/lib/nudgePool';

/**
 * 정적 추천 풀에서 랜덤 1건을 보여주는 nudge 배너. Wanted DS lu-nudge 톤.
 *  - 좌측: 라벨(흰 78% uppercase) + 큰 흰 글씨 (item 이름은 살구 #FFD49C 강조)
 *  - 우측: 흰 둥근 CTA pill ("빌리기" + 화살표)
 *  - 그라데이션: wd-primary → #4F95FF
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
      className="mx-4 mt-3 flex w-[calc(100%-2rem)] items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-wd-primary to-[#4F95FF] py-3.5 pl-4 pr-3.5 text-left shadow-[0_4px_14px_rgba(0,102,255,0.20)] transition-transform active:scale-[0.99]"
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-white/[0.78]">
          이웃이 빌려드려요
        </span>
        <span className="text-base font-extrabold leading-snug tracking-tight text-white">
          지금 <span className="text-[#FFD49C]">{item.name}</span> 빌려볼까요?
        </span>
      </span>
      <span className="inline-flex h-9 flex-shrink-0 items-center gap-1 rounded-full bg-white px-3.5 text-[13px] font-extrabold text-wd-primary">
        빌리기
        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
          <path
            d="M9 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}

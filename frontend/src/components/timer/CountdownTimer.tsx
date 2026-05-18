import { useEffect, useState } from 'react';
import { formatRemaining } from '@/lib/time';

/**
 * 만료까지 남은 시간을 1초 간격으로 갱신.
 * 1시간 미만 남으면 `text-accent` + 굵은 글씨로 강조 (PLAN.md §1).
 * 만료 시점이 지나면 interval 자동 정리.
 */
export interface CountdownTimerProps {
  expiresAt: string;
  className?: string;
}

const ONE_HOUR_MS = 60 * 60 * 1000;

export function CountdownTimer({ expiresAt, className }: CountdownTimerProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const expires = new Date(expiresAt).getTime();
    if (Number.isNaN(expires)) return;

    const id = window.setInterval(() => {
      const t = new Date();
      setNow(t);
      if (t.getTime() >= expires) {
        window.clearInterval(id);
      }
    }, 1000);

    return () => window.clearInterval(id);
  }, [expiresAt]);

  const remainingMs = new Date(expiresAt).getTime() - now.getTime();
  const isUrgent = remainingMs > 0 && remainingMs < ONE_HOUR_MS;
  const text = formatRemaining(expiresAt, now);

  // 1시간 미만 = cautionary(주황) 강조. wd 디자인 토큰.
  const cls = [className, isUrgent ? 'text-wd-cautionary font-bold' : '']
    .filter(Boolean)
    .join(' ');

  return <span className={cls}>{text}</span>;
}

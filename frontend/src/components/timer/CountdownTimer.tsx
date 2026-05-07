import { formatRemaining } from '@/lib/time';

/**
 * 만료까지 남은 시간을 표시.
 * M3 — 정적 계산.
 * M5에서 1초 setInterval로 갱신하는 버전으로 교체될 예정 (props 시그니처는 유지).
 */
export interface CountdownTimerProps {
  expiresAt: string;
  className?: string;
}

export function CountdownTimer({ expiresAt, className }: CountdownTimerProps) {
  const text = formatRemaining(expiresAt);
  return <span className={className}>{text}</span>;
}

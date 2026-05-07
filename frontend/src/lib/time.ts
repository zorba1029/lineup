/**
 * 상대 시간 포맷터. 외부 lib 없이 직접 작성.
 *
 * - 0~59초: "방금 전"
 * - 1~59분: "N분 전"
 * - 1~23시간: "N시간 전"
 * - 1~6일: "N일 전"
 * - 그 이상: "MM/DD"
 *
 * iso는 ISO 8601 UTC 문자열 (e.g. "2026-05-06T08:34:21Z").
 */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  if (Number.isNaN(diffMs)) return '';

  // 미래 시각이라면(서버 시간 차이 등) 그냥 "방금 전"으로 처리
  if (diffMs < 0) return '방금 전';

  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return '방금 전';

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;

  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;

  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}일 전`;

  const mm = String(then.getMonth() + 1).padStart(2, '0');
  const dd = String(then.getDate()).padStart(2, '0');
  return `${mm}/${dd}`;
}

/**
 * 만료까지 남은 시간을 사람이 읽을 수 있는 짧은 형태로.
 * M3에선 정적, M5에서 1초 갱신 컴포넌트로 교체된다.
 */
export function formatRemaining(expiresIso: string, now: Date = new Date()): string {
  const expires = new Date(expiresIso).getTime();
  if (Number.isNaN(expires)) return '';
  const diff = expires - now.getTime();
  if (diff <= 0) return '곧 만료';

  const totalMin = Math.floor(diff / 60_000);
  const hours = Math.floor(totalMin / 60);
  if (hours <= 0) {
    return `${totalMin}분 남음`;
  }
  return `${hours}시간 남음`;
}

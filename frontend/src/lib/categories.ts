/**
 * 게시글 카테고리 — BE `util/category` 와 동일한 enum.
 *
 * 카테고리별 색 분기는 시각적 노이즈만 늘려 사용자 인지를 방해하므로 단일 톤.
 * Wanted DS 마이그레이션 이후 카테고리 chip 스타일은 PostCard / RequestModal 등
 * 사용처에 인라인으로 처리 (`bg-wd-primary-soft text-wd-primary`).
 */
export const CATEGORIES = ['공구', '주방', '오락', '전자기기', '가전', '기타'] as const;
export type Category = (typeof CATEGORIES)[number];

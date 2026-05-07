/**
 * 게시글 카테고리 — BE `util/category` 와 동일한 enum.
 */
export const CATEGORIES = ['공구', '주방', '오락', '전자기기', '가전', '기타'] as const;
export type Category = (typeof CATEGORIES)[number];

/**
 * 카테고리 칩 색상 매핑.
 * Tailwind 토큰만 사용 (tailwind.config.ts 참고).
 */
export const CATEGORY_CHIP_CLASS: Record<Category, string> = {
  공구: 'bg-primary-light text-primary-dark',
  주방: 'bg-green-light text-green',
  오락: 'bg-accent/10 text-accent',
  전자기기: 'bg-primary-light text-primary',
  가전: 'bg-yellow/15 text-yellow',
  기타: 'bg-bg text-sub',
};

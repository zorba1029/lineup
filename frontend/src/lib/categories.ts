/**
 * 게시글 카테고리 — BE `util/category` 와 동일한 enum.
 */
export const CATEGORIES = ['공구', '주방', '오락', '전자기기', '가전', '기타'] as const;
export type Category = (typeof CATEGORIES)[number];

/**
 * 카테고리 칩 클래스 — 모든 카테고리는 동일하게 primary 톤 (프로토타입 chip-primary).
 * 카테고리별 색 분기는 시각적 노이즈만 늘려 사용자 인지를 방해하므로 단일 색상 유지.
 */
const CHIP_CLASS = 'bg-primary-light text-primary';

export const CATEGORY_CHIP_CLASS: Record<Category, string> = {
  공구: CHIP_CLASS,
  주방: CHIP_CLASS,
  오락: CHIP_CLASS,
  전자기기: CHIP_CLASS,
  가전: CHIP_CLASS,
  기타: CHIP_CLASS,
};

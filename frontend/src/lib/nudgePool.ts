import type { Category } from './categories';

/**
 * Nudge 추천 풀. PLAN.md §3.
 * "이런 거 빌릴 수 있을까요?" 정적 풀에서 랜덤 1건을 추천하고,
 * 클릭하면 RequestModal이 프리필된 채 열린다 — 즉시 POST 대신 사용자 확인 단계 보존.
 */
export interface NudgeItem {
  name: string;
  category: Category;
  description: string;
}

export const NUDGE_POOL: NudgeItem[] = [
  { name: '전동 드릴', category: '공구', description: '벽에 선반 달려고 30분만 빌리고 싶어요' },
  { name: '사다리', category: '공구', description: '천장 등 갈려고 10분 정도 필요해요' },
  { name: '망치', category: '공구', description: '못 박으려고 10분이면 충분해요' },
  { name: '드라이버 세트', category: '공구', description: '의자 조립하려고 잠깐 빌리고 싶어요' },
  { name: '케이크 틀', category: '주방', description: '아이 생일 케이크 만들려고 빌리고 싶어요' },
  { name: '핸드믹서', category: '주방', description: '쿠키 반죽용으로 한 시간만 빌리고 싶어요' },
  { name: '보드게임', category: '오락', description: '주말에 가족이랑 같이 놀려고요' },
  { name: '캠핑 의자', category: '오락', description: '동네 공원에 잠깐 가져가고 싶어요' },
  { name: '삼각대', category: '전자기기', description: '아이 생일 영상 찍는 데 필요해요' },
  { name: '보조배터리', category: '전자기기', description: '오늘 외출에 필요한데 깜빡했어요' },
  { name: '청소 스팀기', category: '가전', description: '주말 대청소에 한 시간만 빌리고 싶어요' },
  { name: '카트', category: '기타', description: '대형마트 다녀오려고 잠깐 필요해요' },
];

export function pickRandomNudge(): NudgeItem {
  return NUDGE_POOL[Math.floor(Math.random() * NUDGE_POOL.length)];
}

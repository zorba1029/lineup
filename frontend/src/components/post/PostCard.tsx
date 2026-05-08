import { useNavigate } from 'react-router-dom';
import type { RequestPublic, RequestStatus } from '@/lib/types';
import { CATEGORY_CHIP_CLASS, type Category } from '@/lib/categories';
import { formatRelative } from '@/lib/time';

interface Props {
  post: RequestPublic;
  isMine: boolean;
}

/** 좌측 세로 bar 색 — 카드 상태를 멀리서도 한눈에. */
function statusBarColor(status: RequestStatus): string {
  switch (status) {
    case 'matched':
      return 'bg-green';
    case 'expired':
    case 'cancelled':
      return 'bg-sub';
    case 'open':
    default:
      return 'bg-primary';
  }
}

/** 카드 첫 줄 라벨 — 상태에 따라 즉각 인지 가능한 텍스트·색으로 분기.
 *  종료 상태(matched/expired/cancelled)는 진한 배경 pill로 강조해서 멀리서도 보임. */
function topLabel(status: RequestStatus): { text: string; cls: string } {
  switch (status) {
    case 'matched':
      return {
        text: '거래 완료',
        cls: 'rounded-lnb-sm bg-green px-2 py-0.5 text-white shadow-lnb-sm',
      };
    case 'expired':
      return {
        text: '거래 종료',
        cls: 'rounded-lnb-sm bg-sub px-2 py-0.5 text-white',
      };
    case 'cancelled':
      return {
        text: '취소됨',
        cls: 'rounded-lnb-sm bg-sub px-2 py-0.5 text-white',
      };
    case 'open':
    default:
      return { text: '이웃이 찾고 있어요', cls: 'text-primary' };
  }
}

/**
 * 메인 리스트의 게시글 카드. 클릭 시 /requests/:id로 이동.
 * 상단 라벨은 status에 따라 교체 — open이면 모집 중 안내, matched/expired/cancelled는
 * 종료 상태를 첫 줄에서 즉시 노출 (하단 작은 배지보다 인지 빠름).
 */
export function PostCard({ post, isMine }: Props) {
  const navigate = useNavigate();
  const categoryClass =
    CATEGORY_CHIP_CLASS[post.category as Category] ?? 'bg-bg text-sub';
  const label = topLabel(post.status);

  return (
    <button
      type="button"
      onClick={() => navigate(`/requests/${post.id}`)}
      className="relative flex flex-col rounded-lnb bg-card p-3.5 pl-4 text-left shadow-lnb-sm transition-transform active:scale-[0.99]"
    >
      {/* 좌측 세로 status bar */}
      <span
        aria-hidden
        className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-lnb ${statusBarColor(post.status)}`}
      />

      {/* 줄 간격은 프로토타입과 동일하게 mb-1(4px) / mb-1(3-4px) / mb-2(7-8px) */}
      <div className="mb-1 flex items-center gap-1.5">
        <span className={`text-sm font-bold ${label.cls}`}>{label.text}</span>
        {post.status === 'open' && post.pending_offer_count > 0 ? (
          <span className="rounded-lnb-sm bg-primary px-2 py-0.5 text-sm font-bold text-white shadow-lnb-sm">
            {post.pending_offer_count}명 응답
          </span>
        ) : null}
      </div>

      <div className="mb-1 flex items-center gap-2">
        <span className="truncate text-lg font-bold text-text">{post.name}</span>
        {isMine ? (
          <span className="rounded-lnb-sm bg-primary-light px-2 py-0.5 text-xs font-bold text-primary">
            내 글
          </span>
        ) : null}
      </div>

      {post.description ? (
        <p className="mb-2 line-clamp-2 text-sm text-sub">{post.description}</p>
      ) : null}

      {/* 메타: 카테고리 / 급해요(blinking dot) / 시간 / 작성자 위치 — 프로토타입과 동일 순서 */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded-lnb-sm px-2 py-0.5 text-sm font-bold ${categoryClass}`}
        >
          {post.category}
        </span>
        {post.urgent ? (
          <span className="inline-flex items-center gap-1.5 rounded-lnb-sm bg-accent/10 px-2 py-0.5 text-sm font-bold text-accent">
            <span className="h-2 w-2 rounded-full bg-accent animate-blink-soft" />
            급해요
          </span>
        ) : null}
        <span className="rounded-lnb-sm bg-bg px-2 py-0.5 text-sm text-sub">
          {formatRelative(post.created_at)}
        </span>
        <span className="rounded-lnb-sm bg-bg px-2 py-0.5 text-sm text-sub">
          {post.author.dong} {post.author.unit}
        </span>
      </div>
    </button>
  );
}

import { useNavigate } from 'react-router-dom';
import type { RequestPublic, RequestStatus } from '@/lib/types';
import { CATEGORY_CHIP_CLASS, type Category } from '@/lib/categories';
import { formatRelative } from '@/lib/time';

interface Props {
  post: RequestPublic;
  isMine: boolean;
}

/** 카드 첫 줄 라벨 — 상태에 따라 즉각 인지 가능한 텍스트·색으로 분기. */
function topLabel(status: RequestStatus): { text: string; cls: string } {
  switch (status) {
    case 'matched':
      return { text: '🟢 거래 완료', cls: 'text-green' };
    case 'expired':
      return { text: '거래 종료', cls: 'text-sub' };
    case 'cancelled':
      return { text: '취소됨', cls: 'text-sub' };
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
      className="flex flex-col gap-2 rounded-lnb bg-card p-4 text-left shadow-lnb-sm transition-transform active:scale-[0.99]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-bold ${label.cls}`}>{label.text}</span>
        <span className="text-xs text-sub">{formatRelative(post.created_at)}</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="truncate text-lg font-bold text-text">{post.name}</span>
        {isMine ? (
          <span className="rounded-lnb-sm bg-primary-light px-2 py-0.5 text-[11px] font-bold text-primary">
            내 글
          </span>
        ) : null}
      </div>

      {post.description ? (
        <p className="line-clamp-2 text-sm text-sub">{post.description}</p>
      ) : null}

      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded-lnb-sm px-2 py-1 text-[11px] font-bold ${categoryClass}`}
        >
          {post.category}
        </span>
        {post.urgent ? (
          <span className="inline-flex items-center gap-1 rounded-lnb-sm bg-accent/10 px-2 py-1 text-[11px] font-bold text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> 급해요
          </span>
        ) : null}
        <span className="rounded-lnb-sm bg-bg px-2 py-1 text-[11px] text-sub">
          {post.author.dong} {post.author.unit}
        </span>
      </div>
    </button>
  );
}

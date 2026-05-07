import { useNavigate } from 'react-router-dom';
import type { RequestPublic } from '@/lib/types';
import { CATEGORY_CHIP_CLASS, type Category } from '@/lib/categories';
import { formatRelative } from '@/lib/time';

interface Props {
  post: RequestPublic;
  isMine: boolean;
}

/**
 * 메인 리스트의 게시글 카드. 클릭 시 /requests/:id로 이동.
 */
export function PostCard({ post, isMine }: Props) {
  const navigate = useNavigate();
  const categoryClass =
    CATEGORY_CHIP_CLASS[post.category as Category] ?? 'bg-bg text-sub';

  return (
    <button
      type="button"
      onClick={() => navigate(`/requests/${post.id}`)}
      className="flex flex-col gap-2 rounded-lnb bg-card p-4 text-left shadow-lnb-sm transition-transform active:scale-[0.99]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-primary">이웃이 찾고 있어요</span>
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
        {post.status === 'matched' ? (
          <span className="rounded-lnb-sm bg-green-light px-2 py-1 text-[11px] font-bold text-green">
            거래 완료
          </span>
        ) : null}
        {post.status === 'expired' ? (
          <span className="rounded-lnb-sm bg-bg px-2 py-1 text-[11px] font-bold text-sub">
            거래 종료
          </span>
        ) : null}
      </div>
    </button>
  );
}

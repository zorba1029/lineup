import { useNavigate } from 'react-router-dom';
import type { RequestPublic, RequestStatus } from '@/lib/types';
import { formatRelative } from '@/lib/time';
import { CountdownTimer } from '../timer/CountdownTimer';

interface Props {
  post: RequestPublic;
  isMine: boolean;
}

/** 좌측 4px status bar 색. */
const STATUS_BAR: Record<RequestStatus, string> = {
  open: 'bg-wd-primary',
  matched: 'bg-wd-positive',
  expired: 'bg-wd-fg-quaternary',
  cancelled: 'bg-wd-fg-quaternary',
};

/** top row의 status-line: 점(pulse|dot) + 라벨 텍스트 색. */
const STATUS_LINE: Record<RequestStatus, { text: string; cls: string }> = {
  open: { text: '이웃이 찾고 있어요', cls: 'text-wd-primary' },
  matched: { text: '거래 완료', cls: 'text-wd-positive' },
  expired: { text: '거래 종료', cls: 'text-wd-fg-tertiary' },
  cancelled: { text: '취소됨', cls: 'text-wd-fg-tertiary' },
};

/** 메타 chip 공통 — 22px height, 8px padding, 11px semibold. */
const CHIP =
  'inline-flex items-center gap-1 h-[22px] px-2 rounded-lg text-[11px] font-semibold tracking-wide';

/**
 * 메인 리스트 카드. Wanted DS lu-card 기반.
 *  - 좌측 4px status bar (open: blue / matched: green / expired·cancelled: gray)
 *  - top row: status-line + (open & pending offer count > 0 시) 응답 pill
 *  - title (17px bold) + 내 글 작은 pill
 *  - description (13px tertiary, 2줄 clamp)
 *  - meta chip row: 카테고리 / 급해요(blink) / 시간 / 남은 시간(open만) / 작성자 위치
 */
export function PostCard({ post, isMine }: Props) {
  const navigate = useNavigate();
  const isDim = post.status === 'expired' || post.status === 'cancelled';
  const status = STATUS_LINE[post.status];

  return (
    <button
      type="button"
      onClick={() => navigate(`/requests/${post.id}`)}
      className={
        'relative flex w-full flex-col rounded-2xl border border-wd-border-default bg-wd-bg-primary py-3.5 pl-[18px] pr-3.5 text-left transition-transform active:scale-[0.99]' +
        (isDim ? ' opacity-[0.68]' : '')
      }
    >
      {/* 좌측 4px status bar */}
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-1 rounded-l-2xl ${STATUS_BAR[post.status]}`}
      />

      {/* top row: status-line + 응답 pill */}
      <div className="mb-1.5 flex min-h-[22px] items-center gap-1.5">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-bold tracking-wide ${status.cls}`}
        >
          {post.status === 'open' ? (
            <span className="h-1.5 w-1.5 rounded-full bg-wd-primary animate-wd-pulse" />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
          )}
          <span>{status.text}</span>
        </span>
        {post.status === 'open' && post.pending_offer_count > 0 ? (
          <span className="inline-flex h-[22px] items-center gap-1 rounded-lg bg-wd-primary px-2 text-[11px] font-bold tracking-wide text-white">
            <span className="font-extrabold">{post.pending_offer_count}</span>
            <span>명 응답</span>
          </span>
        ) : null}
      </div>

      {/* title */}
      <h3 className="mb-1 flex items-center gap-1.5">
        <span className="flex-1 truncate text-[17px] font-bold tracking-tight text-wd-fg-primary">
          {post.name}
        </span>
        {isMine ? (
          <span className="inline-flex h-[18px] items-center rounded bg-wd-primary-soft px-1.5 text-[10px] font-bold text-wd-primary">
            내 글
          </span>
        ) : null}
      </h3>

      {/* description */}
      {post.description ? (
        <p className="mb-2.5 line-clamp-2 text-[13px] leading-relaxed text-wd-fg-tertiary">
          {post.description}
        </p>
      ) : null}

      {/* meta chip row */}
      <div className="flex flex-wrap items-center gap-1">
        <span className={`${CHIP} bg-wd-primary-soft text-wd-primary`}>
          {post.category}
        </span>
        {post.urgent ? (
          <span className={`${CHIP} bg-wd-accent-soft text-wd-accent`}>
            <span
              className={
                post.status === 'open'
                  ? 'h-1.5 w-1.5 rounded-full bg-wd-accent animate-wd-blink'
                  : 'h-1.5 w-1.5 rounded-full bg-wd-accent'
              }
            />
            급해요
          </span>
        ) : null}
        <span className={`${CHIP} bg-wd-bg-tertiary text-wd-fg-tertiary`}>
          {formatRelative(post.created_at)}
        </span>
        {post.status === 'open' ? (
          <span className={`${CHIP} bg-wd-bg-tertiary text-wd-fg-tertiary`}>
            <CountdownTimer expiresAt={post.expires_at} />
          </span>
        ) : null}
        <span className={`${CHIP} bg-wd-bg-tertiary text-wd-fg-tertiary`}>
          {post.author.dong} {post.author.unit}
        </span>
      </div>
    </button>
  );
}

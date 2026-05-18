import type { RequestPublic } from '@/lib/types';
import { PostCard } from './PostCard';

interface Props {
  posts: RequestPublic[];
  currentUserId: number;
  emptyText?: string;
}

/**
 * 게시글 카드 목록. 빈 상태 placeholder 포함. Wanted DS 톤.
 */
export function PostList({ posts, currentUserId, emptyText }: Props) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-wd-border-default bg-wd-bg-primary py-12 text-center">
        <p className="text-[13px] text-wd-fg-tertiary">
          {emptyText ?? '아직 게시글이 없어요'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} isMine={p.author.id === currentUserId} />
      ))}
    </div>
  );
}

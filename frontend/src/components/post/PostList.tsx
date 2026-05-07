import type { RequestPublic } from '@/lib/types';
import { PostCard } from './PostCard';

interface Props {
  posts: RequestPublic[];
  currentUserId: number;
  emptyText?: string;
}

/**
 * 게시글 카드 목록. 빈 상태 placeholder 포함.
 */
export function PostList({ posts, currentUserId, emptyText }: Props) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lnb bg-card py-12 text-center shadow-lnb-sm">
        <p className="text-sm text-sub">{emptyText ?? '아직 게시글이 없어요'}</p>
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

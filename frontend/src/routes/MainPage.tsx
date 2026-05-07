import { useState } from 'react';
import { useAuthStore } from '@/lib/auth';
import { useRequests } from '@/features/requests/useRequests';
import { Header } from '@/components/layout/Header';
import { FilterChips } from '@/components/post/FilterChips';
import { PostList } from '@/components/post/PostList';
import { Fab } from '@/components/post/Fab';
import { RequestModal } from '@/components/modals/RequestModal';
import { ApiError } from '@/lib/api';

/**
 * 화면 03 (메인). PLAN.md §1.B.
 * 헤더 / 필터 / 게시글 리스트 / FAB.
 * NewPostBanner와 NudgeBanner는 M5에서 활성화 (현재는 자리만 비워둠).
 */
export function MainPage() {
  const user = useAuthStore((s) => s.user);
  const [filterMine, setFilterMine] = useState(false);
  const [filterLent, setFilterLent] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const requestsQuery = useRequests({
    mine: filterMine || undefined,
    lent: filterLent || undefined,
  });

  if (!user) {
    // RequireAuth 가드를 통과했지만 store가 아직 로드 안 된 케이스 보호
    return null;
  }

  const items = requestsQuery.data?.items ?? [];
  const listTitle = filterMine
    ? '내 게시글'
    : filterLent
      ? '내가 빌려준 글'
      : '전체 게시글';
  const emptyText = filterMine
    ? '아직 작성한 글이 없어요'
    : filterLent
      ? '빌려준 글이 없어요'
      : '아직 게시글이 없어요';

  return (
    <div className="flex flex-1 flex-col">
      <Header user={user} />

      {/* M5: <NewPostBanner /> 자리 */}
      {/* M5: <NudgeBanner /> 자리 */}

      <div className="flex flex-1 flex-col gap-4 px-4 pb-28 pt-4">
        <FilterChips
          mine={filterMine}
          lent={filterLent}
          onToggleMine={() => setFilterMine((v) => !v)}
          onToggleLent={() => setFilterLent((v) => !v)}
        />

        <div className="flex items-baseline justify-between">
          <span className="text-sm font-bold text-text">{listTitle}</span>
          <span className="text-xs text-sub">{items.length}건</span>
        </div>

        {requestsQuery.isLoading ? (
          <div className="rounded-lnb bg-card py-12 text-center text-sm text-sub shadow-lnb-sm">
            불러오는 중…
          </div>
        ) : requestsQuery.error instanceof ApiError ? (
          <div className="rounded-lnb-sm border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
            게시글을 불러오지 못했어요. 잠시 후 다시 시도해주세요.
          </div>
        ) : (
          <PostList
            posts={items}
            currentUserId={user.id}
            emptyText={emptyText}
          />
        )}
      </div>

      <Fab onClick={() => setShowModal(true)} />
      <RequestModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}

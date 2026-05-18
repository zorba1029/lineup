import { useState } from 'react';
import { useAuthStore } from '@/lib/auth';
import { useRequests } from '@/features/requests/useRequests';
import { Header } from '@/components/layout/Header';
import { FilterTabs, type FilterMode } from '@/components/post/FilterTabs';
import { PostList } from '@/components/post/PostList';
import { Fab } from '@/components/post/Fab';
import { RequestModal, type RequestPrefill } from '@/components/modals/RequestModal';
import { NewPostBanner } from '@/components/nudge/NewPostBanner';
import { NudgeBanner } from '@/components/nudge/NudgeBanner';
import { ApiError } from '@/lib/api';

/**
 * 화면 03 (메인). PLAN.md §1.B.
 * 헤더 / 필터 / 게시글 리스트 / FAB.
 * 필터는 3-tab segmented control (전체 / 내 글 보기 / 내가 빌려준 글).
 */
export function MainPage() {
  const user = useAuthStore((s) => s.user);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [showModal, setShowModal] = useState(false);
  const [modalPrefill, setModalPrefill] = useState<RequestPrefill | null>(null);

  const openBlankModal = () => {
    setModalPrefill(null);
    setShowModal(true);
  };
  const openPrefilledModal = (item: RequestPrefill) => {
    setModalPrefill(item);
    setShowModal(true);
  };
  const closeModal = () => {
    setShowModal(false);
    setModalPrefill(null);
  };

  const requestsQuery = useRequests({
    mine: filter === 'mine' ? true : undefined,
    lent: filter === 'lent' ? true : undefined,
  });

  if (!user) {
    // RequireAuth 가드를 통과했지만 store가 아직 로드 안 된 케이스 보호
    return null;
  }

  const items = requestsQuery.data?.items ?? [];
  const emptyText =
    filter === 'mine'
      ? '아직 요청한 글이 없어요'
      : filter === 'lent'
        ? '아직 수락한 요청이 없어요'
        : '아직 게시글이 없어요';

  return (
    <div className="flex flex-1 flex-col">
      <Header user={user} />

      <NewPostBanner items={items} currentUserId={user.id} />
      <NudgeBanner onPick={openPrefilledModal} />

      <div className="flex flex-1 flex-col gap-3 px-4 pb-28 pt-4">
        <FilterTabs mode={filter} onChange={setFilter} count={items.length} />

        {requestsQuery.isLoading ? (
          <div className="rounded-2xl border border-wd-border-default bg-wd-bg-primary py-12 text-center text-[13px] text-wd-fg-tertiary">
            불러오는 중…
          </div>
        ) : requestsQuery.error instanceof ApiError ? (
          <div className="rounded-lg border border-wd-negative/30 bg-wd-negative-soft px-3 py-2 text-[13px] text-wd-negative">
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

      <Fab onClick={openBlankModal} />
      <RequestModal open={showModal} onClose={closeModal} prefill={modalPrefill} />
    </div>
  );
}

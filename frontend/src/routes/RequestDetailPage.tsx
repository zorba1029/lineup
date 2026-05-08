import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { useRequest } from '@/features/requests/useRequest';
import { useUpdateRequest } from '@/features/requests/useUpdateRequest';
import { useDeleteRequest } from '@/features/requests/useDeleteRequest';
import { useDeleteOffer } from '@/features/offers/useDeleteOffer';
import { useAcceptOffer } from '@/features/offers/useAcceptOffer';
import { useRejectOffer } from '@/features/offers/useRejectOffer';
import { useConfirm } from '@/lib/confirm';
import { CountdownTimer } from '@/components/timer/CountdownTimer';
import { StatusBadge } from '@/components/post/StatusBadge';
import { OfferBottomSheet } from '@/components/sheets/OfferBottomSheet';
import { MyOfferModal } from '@/components/modals/MyOfferModal';
import { CATEGORY_CHIP_CLASS, type Category } from '@/lib/categories';
import { formatRelative } from '@/lib/time';
import type { OfferPublic, RequestPublic } from '@/lib/types';

/**
 * 화면 05·06 (게시글 상세). PLAN.md §1.C·D.
 * - 작성자 vs 이웃 뷰 분기.
 * - M4부터 offer 리스트 + accept/reject (작성자) / 빌려주기 액션 (이웃) 활성화.
 */
export function RequestDetailPage() {
  const { id: idParam } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  const id = idParam ? Number(idParam) : null;
  const isValidId = typeof id === 'number' && Number.isFinite(id) && id > 0;
  const requestQuery = useRequest(isValidId ? id : null);

  if (!isValidId) {
    return <NotFoundView />;
  }

  if (requestQuery.isLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <DetailHeader title="게시글 상세" onBack={() => navigate(-1)} />
        <div className="flex flex-1 items-center justify-center text-sm text-sub">
          불러오는 중…
        </div>
      </div>
    );
  }

  if (requestQuery.error instanceof ApiError) {
    if (requestQuery.error.status === 404 || requestQuery.error.status === 403) {
      return <NotFoundView />;
    }
    return (
      <div className="flex flex-1 flex-col">
        <DetailHeader title="게시글 상세" onBack={() => navigate(-1)} />
        <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-accent">
          게시글을 불러오지 못했어요. 잠시 후 다시 시도해주세요.
        </div>
      </div>
    );
  }

  const data = requestQuery.data;
  if (!data || !currentUser) return null;

  const isOwner = data.request.author.id === currentUser.id;
  return isOwner ? (
    <OwnerView request={data.request} offers={data.offers} />
  ) : (
    <NeighborView request={data.request} offers={data.offers} />
  );
}

/* ------------------------- 공통 헤더 ------------------------- */

function DetailHeader({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  return (
    <header className="flex h-14 items-center gap-2 border-b border-border bg-card px-2">
      <button
        type="button"
        aria-label="뒤로"
        onClick={onBack}
        className="flex h-10 w-10 items-center justify-center text-2xl text-text"
      >
        ‹
      </button>
      <h1 className="text-base font-bold text-text">{title}</h1>
    </header>
  );
}

function NotFoundView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-base font-bold text-text">게시글을 찾을 수 없어요</p>
      <p className="text-sm text-sub">
        삭제되었거나 같은 라인 이웃의 글이 아닐 수 있어요.
      </p>
      <Link
        to="/"
        className="mt-2 rounded-lnb-sm bg-primary px-4 py-2 text-sm font-bold text-white shadow-lnb-sm"
      >
        메인으로
      </Link>
    </div>
  );
}

/* ------------------------- 작성자 뷰 ------------------------- */

function OwnerView({
  request,
  offers,
}: {
  request: RequestPublic;
  offers: OfferPublic[];
}) {
  const navigate = useNavigate();
  const update = useUpdateRequest(request.id);
  const remove = useDeleteRequest(request.id);
  const confirm = useConfirm();

  const isLocked = request.status !== 'open';

  const [description, setDescription] = useState(request.description);
  const [savingError, setSavingError] = useState<string | null>(null);

  // 서버 데이터 변동 시 로컬 상태 sync
  useEffect(() => {
    setDescription(request.description);
  }, [request.description]);

  const descChanged = description.trim() !== request.description;
  const canSave = descChanged && description.trim().length > 0 && !isLocked;

  const handleSave = async () => {
    setSavingError(null);
    try {
      await update.mutateAsync({ description: description.trim() });
    } catch (err) {
      if (err instanceof ApiError) {
        setSavingError(err.message || '저장에 실패했습니다.');
      } else {
        setSavingError('네트워크 오류가 발생했습니다.');
      }
    }
  };

  const handleToggleUrgent = async (next: boolean) => {
    setSavingError(null);
    try {
      await update.mutateAsync({ urgent: next });
    } catch (err) {
      if (err instanceof ApiError) {
        setSavingError(err.message || '저장에 실패했습니다.');
      } else {
        setSavingError('네트워크 오류가 발생했습니다.');
      }
    }
  };

  const handleDelete = () => {
    confirm(
      `"${request.name}" 게시글을 삭제할까요?`,
      () => remove.mutate(),
      { confirmLabel: '삭제', cancelLabel: '취소' },
    );
  };

  const categoryClass =
    CATEGORY_CHIP_CLASS[request.category as Category] ?? 'bg-bg text-sub';

  // matched 상태에서는 accepted offer만 강조 표시
  const visibleOffers = offers.filter((o) => o.status !== 'cancelled');

  return (
    <div className="flex flex-1 flex-col">
      <DetailHeader title="게시글 상세" onBack={() => navigate(-1)} />

      <div className="flex flex-1 flex-col gap-4 px-4 pb-28 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusBadge status={request.status} />
            {request.status === 'open' ? (
              <CountdownTimer
                expiresAt={request.expires_at}
                className="text-xs font-bold text-sub"
              />
            ) : null}
          </div>
          <span className="text-xs text-sub">
            {formatRelative(request.created_at)}
          </span>
        </div>

        <Section title="게시글 설정">
          <Row label="아이템">
            <span className="text-sm font-bold text-text">{request.name}</span>
          </Row>
          <Row label="카테고리">
            <span
              className={`rounded-lnb-sm px-2 py-1 text-[11px] font-bold ${categoryClass}`}
            >
              {request.category}
            </span>
          </Row>

          <div className="flex flex-col gap-2 py-2">
            <span className="text-sm text-sub">설명</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              disabled={isLocked}
              rows={3}
              className="rounded-lnb-sm border border-border bg-card px-3 py-2 text-text outline-none focus:border-primary disabled:opacity-60"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-sub">{description.length}/200</span>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave || update.isPending}
                className="rounded-lnb-sm bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-lnb-sm hover:bg-primary-dark disabled:opacity-50"
              >
                {update.isPending ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>

          <Row label="긴급 요청">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={request.urgent}
                disabled={isLocked || update.isPending}
                onChange={(e) => handleToggleUrgent(e.target.checked)}
                className="h-5 w-5 accent-primary"
              />
              <span className="text-xs text-sub">
                {request.urgent ? '급해요' : '일반'}
              </span>
            </label>
          </Row>

          {savingError ? (
            <div className="rounded-lnb-sm border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent">
              {savingError}
            </div>
          ) : null}
        </Section>

        <Section title="요청 현황">
          <div className="flex flex-col gap-2 py-2">
            {/* 빌리기 요청인 — 작성자 (본인) */}
            <ParticipantBadge
              role="빌리기 요청인"
              dong={request.author.dong}
              unit={request.author.unit}
              name={request.author.name}
              isMe
              tone="primary"
            />

            {/* 빌려주기 응답 — offer 리스트 */}
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sub">
                빌려주기 응답
              </span>
              <span className="text-xs text-sub">{visibleOffers.length}건</span>
            </div>
            {visibleOffers.length === 0 ? (
              <p className="py-2 text-sm text-sub">
                아직 빌려주겠다는 이웃이 없어요
              </p>
            ) : (
              visibleOffers.map((offer) => (
                <OwnerOfferCard
                  key={offer.id}
                  offer={offer}
                  requestId={request.id}
                  requestStatus={request.status}
                />
              ))
            )}
          </div>
        </Section>

        {!isLocked ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={remove.isPending}
            className="mt-2 h-12 rounded-lnb border border-accent/40 bg-card font-bold text-accent transition-colors hover:bg-accent/10 disabled:opacity-50"
          >
            {remove.isPending ? '삭제 중…' : '게시글 삭제'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------- 작성자: offer 카드 ------------------------- */

function OwnerOfferCard({
  offer,
  requestId,
  requestStatus,
}: {
  offer: OfferPublic;
  requestId: number;
  requestStatus: RequestPublic['status'];
}) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const accept = useAcceptOffer(offer.id, requestId);
  const reject = useRejectOffer(offer.id, requestId);
  const [actionError, setActionError] = useState<string | null>(null);

  const canAct =
    requestStatus === 'open' && offer.status === 'pending';

  const handleAccept = () => {
    confirm(
      `${offer.offerer.name} 이웃의 빌려주기를\n수락할까요?`,
      async () => {
        setActionError(null);
        try {
          const matched = await accept.mutateAsync();
          navigate('/matched', {
            state: { matched },
            replace: true,
          });
        } catch (err) {
          if (err instanceof ApiError) {
            setActionError(err.message || '수락에 실패했습니다.');
          } else {
            setActionError('네트워크 오류가 발생했습니다.');
          }
        }
      },
      { confirmLabel: '수락', cancelLabel: '취소' },
    );
  };

  const handleReject = () => {
    confirm(
      `${offer.offerer.name} 이웃의 빌려주기를\n거절할까요?`,
      async () => {
        setActionError(null);
        try {
          await reject.mutateAsync();
        } catch (err) {
          if (err instanceof ApiError) {
            setActionError(err.message || '거절에 실패했습니다.');
          } else {
            setActionError('네트워크 오류가 발생했습니다.');
          }
        }
      },
      { confirmLabel: '거절', cancelLabel: '취소' },
    );
  };

  const isAccepted = offer.status === 'accepted';
  const cardCls =
    'flex flex-col gap-2 rounded-lnb-sm border px-3 py-3 ' +
    (isAccepted
      ? 'border-green/40 bg-green-light'
      : offer.status === 'rejected'
        ? 'border-border bg-bg opacity-70'
        : 'border-border bg-card');

  const isPending = accept.isPending || reject.isPending;

  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-text">
          {offer.offerer.dong} {offer.offerer.unit} · {offer.offerer.name}
        </span>
        <OfferStatusPill status={offer.status} />
      </div>
      <div className="grid grid-cols-2 gap-1.5 text-xs">
        <div className="flex flex-col gap-0.5 rounded-lnb-sm bg-card px-2 py-1.5">
          <span className="text-[10px] text-sub">대여 시간</span>
          <span className="font-bold text-text">{offer.rental_time}</span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-lnb-sm bg-card px-2 py-1.5">
          <span className="text-[10px] text-sub">반납 시간</span>
          <span className="font-bold text-text">{offer.return_time}</span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-lnb-sm bg-card px-2 py-1.5">
          <span className="text-[10px] text-sub">대여 장소</span>
          <span className="font-bold text-text">{offer.rental_place}</span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-lnb-sm bg-card px-2 py-1.5">
          <span className="text-[10px] text-sub">반납 장소</span>
          <span className="font-bold text-text">{offer.return_place}</span>
        </div>
      </div>

      {isAccepted && offer.offerer.phone ? (
        <div className="rounded-lnb-sm bg-card px-2 py-1.5 text-xs">
          <span className="text-sub">연락처 </span>
          <a
            href={`tel:${offer.offerer.phone}`}
            className="font-bold text-primary"
          >
            {offer.offerer.phone}
          </a>
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-lnb-sm border border-accent/30 bg-accent/10 px-2 py-1.5 text-xs text-accent">
          {actionError}
        </div>
      ) : null}

      {canAct ? (
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={handleReject}
            disabled={isPending}
            className="h-9 flex-1 rounded-lnb-sm border border-border bg-card text-xs font-bold text-sub disabled:opacity-50"
          >
            {reject.isPending ? '거절 중…' : '거절'}
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={isPending}
            className="h-9 flex-1 rounded-lnb-sm bg-primary text-xs font-bold text-white shadow-lnb-sm hover:bg-primary-dark disabled:opacity-50"
          >
            {accept.isPending ? '수락 중…' : '수락'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** 거래 참여자 정보 카드 — 역할 라벨 + 동·호수·이름. */
function ParticipantBadge({
  role,
  dong,
  unit,
  name,
  isMe,
  tone,
}: {
  role: string;
  dong: string;
  unit: string;
  name: string;
  isMe?: boolean;
  tone: 'primary' | 'green';
}) {
  const cls =
    tone === 'green'
      ? 'border-green/40 bg-green-light/60'
      : 'border-primary/30 bg-primary-light/40';
  const labelCls = tone === 'green' ? 'text-green' : 'text-primary';
  return (
    <div className={`flex flex-col gap-0.5 rounded-lnb-sm border px-3 py-2 ${cls}`}>
      <span className={`text-[11px] font-bold uppercase tracking-wider ${labelCls}`}>
        {role}
      </span>
      <span className="text-sm font-bold text-text">
        {dong} {unit} · {name}
        {isMe ? <span className="ml-1.5 text-xs font-bold text-primary">(본인)</span> : null}
      </span>
    </div>
  );
}

function OfferStatusPill({ status }: { status: OfferPublic['status'] }) {
  switch (status) {
    case 'pending':
      return (
        <span className="rounded-lnb-sm bg-primary-light px-2 py-0.5 text-[10px] font-bold text-primary">
          대기 중
        </span>
      );
    case 'accepted':
      return (
        <span className="rounded-lnb-sm bg-green-light px-2 py-0.5 text-[10px] font-bold text-green">
          수락됨
        </span>
      );
    case 'rejected':
      return (
        <span className="rounded-lnb-sm bg-bg px-2 py-0.5 text-[10px] font-bold text-sub">
          거절됨
        </span>
      );
    case 'cancelled':
      return (
        <span className="rounded-lnb-sm bg-bg px-2 py-0.5 text-[10px] font-bold text-sub">
          취소됨
        </span>
      );
    default:
      return null;
  }
}

/* ------------------------- 이웃 뷰 ------------------------- */

function NeighborView({
  request,
  offers,
}: {
  request: RequestPublic;
  offers: OfferPublic[];
}) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const categoryClass =
    CATEGORY_CHIP_CLASS[request.category as Category] ?? 'bg-bg text-sub';

  // BE는 이웃 뷰에 자기 offer만 내려옴 → offers[0] 또는 active 한 건.
  // 안전하게 active(pending/accepted) 우선 선택.
  const myActiveOffer = offers.find(
    (o) => o.status === 'pending' || o.status === 'accepted',
  );

  const [showSheet, setShowSheet] = useState(false);
  const [showMyModal, setShowMyModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<OfferPublic | undefined>(
    undefined,
  );

  const cancel = useDeleteOffer(myActiveOffer?.id ?? 0, request.id);
  const [actionError, setActionError] = useState<string | null>(null);

  const isOpen = request.status === 'open';
  const isMatched = request.status === 'matched';

  const handleOpenLend = () => {
    setEditingOffer(undefined);
    setShowSheet(true);
  };

  const handleOpenMyOffer = () => {
    setShowMyModal(true);
  };

  const handleEditFromMyModal = () => {
    if (!myActiveOffer) return;
    setEditingOffer(myActiveOffer);
    setShowMyModal(false);
    setShowSheet(true);
  };

  const handleCancelFromMyModal = () => {
    if (!myActiveOffer) return;
    setShowMyModal(false);
    confirm(
      '빌려주기 요청을 취소할까요?',
      async () => {
        setActionError(null);
        try {
          await cancel.mutateAsync();
        } catch (err) {
          if (err instanceof ApiError) {
            setActionError(err.message || '취소에 실패했습니다.');
          } else {
            setActionError('네트워크 오류가 발생했습니다.');
          }
        }
      },
      { confirmLabel: '취소하기', cancelLabel: '닫기' },
    );
  };

  const handleSeeMatched = () => {
    if (!myActiveOffer) return;
    // accepted offer는 phone 정보가 있으므로 그대로 navigate state로 전달.
    navigate('/matched', {
      state: { matched: { request, offer: myActiveOffer } },
    });
  };

  return (
    <div className="flex flex-1 flex-col">
      <DetailHeader title="게시글 상세" onBack={() => navigate(-1)} />

      <div className="flex flex-1 flex-col gap-4 px-4 pb-28 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusBadge status={request.status} />
            {request.status === 'open' ? (
              <CountdownTimer
                expiresAt={request.expires_at}
                className="text-xs font-bold text-sub"
              />
            ) : null}
          </div>
          <span className="text-xs text-sub">
            {formatRelative(request.created_at)}
          </span>
        </div>

        <Section title="게시글 정보">
          <Row label="아이템">
            <span className="text-sm font-bold text-text">{request.name}</span>
          </Row>
          <div className="flex flex-col gap-2 py-2">
            <span className="text-sm text-sub">설명</span>
            <p className="rounded-lnb-sm border border-border bg-bg px-3 py-2 text-sm text-text">
              {request.description}
            </p>
          </div>
        </Section>

        <Section title="상세 정보">
          <Row label="카테고리">
            <span
              className={`rounded-lnb-sm px-2 py-1 text-[11px] font-bold ${categoryClass}`}
            >
              {request.category}
            </span>
          </Row>
          <Row label="긴급 여부">
            {request.urgent ? (
              <span className="rounded-lnb-sm bg-accent/10 px-2 py-1 text-[11px] font-bold text-accent">
                급해요
              </span>
            ) : (
              <span className="text-sm text-sub">일반</span>
            )}
          </Row>
          <Row label="요청 시각">
            <span className="text-sm text-text">
              {formatRelative(request.created_at)}
            </span>
          </Row>
        </Section>

        <Section title="요청자">
          <Row label="동·호수">
            <span className="text-sm font-bold text-text">
              {request.author.dong} {request.author.unit}
            </span>
          </Row>
          <Row label="이름">
            <span className="text-sm text-text">{request.author.name}</span>
          </Row>
          {request.author.phone ? (
            <Row label="연락처">
              <a
                href={`tel:${request.author.phone}`}
                className="text-sm font-bold text-primary"
              >
                {request.author.phone}
              </a>
            </Row>
          ) : null}
        </Section>

        {actionError ? (
          <div className="rounded-lnb-sm border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
            {actionError}
          </div>
        ) : null}

        {/* 액션 영역 */}
        {isOpen && !myActiveOffer ? (
          <button
            type="button"
            onClick={handleOpenLend}
            className="mt-2 h-12 rounded-lnb bg-primary font-bold text-white shadow-lnb-sm transition-colors hover:bg-primary-dark"
          >
            빌려주기
          </button>
        ) : null}

        {isOpen && myActiveOffer && myActiveOffer.status === 'pending' ? (
          <button
            type="button"
            onClick={handleOpenMyOffer}
            className="mt-2 h-12 rounded-lnb border border-primary bg-card font-bold text-primary transition-colors hover:bg-primary-light"
          >
            내 빌려주기 정보 보기
          </button>
        ) : null}

        {isMatched && myActiveOffer && myActiveOffer.status === 'accepted' ? (
          <button
            type="button"
            onClick={handleSeeMatched}
            className="mt-2 h-12 rounded-lnb bg-green font-bold text-white shadow-lnb-sm"
          >
            거래 성사 정보 보기
          </button>
        ) : null}

        {!isOpen && !isMatched ? (
          <p className="mt-2 rounded-lnb-sm border border-border bg-bg px-3 py-2 text-center text-xs text-sub">
            {request.status === 'expired'
              ? '거래 기간이 종료된 게시글이에요.'
              : '취소된 게시글이에요.'}
          </p>
        ) : null}
      </div>

      <OfferBottomSheet
        open={showSheet}
        onClose={() => setShowSheet(false)}
        requestId={request.id}
        requestName={request.name}
        editingOffer={editingOffer}
      />

      {myActiveOffer ? (
        <MyOfferModal
          open={showMyModal}
          onClose={() => setShowMyModal(false)}
          offer={myActiveOffer}
          onEdit={handleEditFromMyModal}
          onCancel={handleCancelFromMyModal}
        />
      ) : null}
    </div>
  );
}

/* ------------------------- 공통 작은 조각 ------------------------- */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1 rounded-lnb bg-card p-4 shadow-lnb-sm">
      <h2 className="text-sm font-bold text-text">{title}</h2>
      <div className="flex flex-col divide-y divide-border">{children}</div>
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-sub">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}

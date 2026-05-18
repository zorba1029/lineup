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
import { DetailHeader } from '@/components/layout/DetailHeader';
import { formatRelative } from '@/lib/time';
import type { OfferPublic, RequestPublic } from '@/lib/types';

/** chip 공통 — Wanted DS lu-chip. */
const CHIP =
  'inline-flex items-center gap-1 h-[22px] px-2 rounded-lg text-[11px] font-semibold tracking-wide';

/* ============================================================
   Entry — 라우터 + 권한 분기
   ============================================================ */
export function RequestDetailPage() {
  const { id: idParam } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  const id = idParam ? Number(idParam) : null;
  const isValidId = typeof id === 'number' && Number.isFinite(id) && id > 0;
  const requestQuery = useRequest(isValidId ? id : null);

  if (!isValidId) return <NotFoundView />;

  if (requestQuery.isLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <DetailHeader title="게시글 상세" onBack={() => navigate(-1)} />
        <div className="flex flex-1 items-center justify-center text-[13px] text-wd-fg-tertiary">
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
        <div className="flex flex-1 items-center justify-center px-4 text-center text-[13px] text-wd-negative">
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

function NotFoundView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-[16px] font-bold text-wd-fg-primary">게시글을 찾을 수 없어요</p>
      <p className="text-[13px] text-wd-fg-tertiary">
        삭제되었거나 같은 라인 이웃의 글이 아닐 수 있어요.
      </p>
      <Link
        to="/"
        className="mt-2 inline-flex h-11 items-center rounded-xl bg-wd-primary px-5 text-[14px] font-bold text-white"
      >
        메인으로
      </Link>
    </div>
  );
}

/* ============================================================
   HeroBlock — 상세 페이지 최상단 (Owner/Neighbor 공통)
   ============================================================ */
function HeroBlock({ request }: { request: RequestPublic }) {
  const isLocked = request.status !== 'open';
  return (
    <div className="flex flex-col gap-2.5 border-b border-wd-border-subtle bg-wd-bg-primary px-4 py-3.5">
      <div className="flex items-center justify-between">
        <StatusBadge status={request.status} />
        <span className="text-[11px] text-wd-fg-tertiary">
          {formatRelative(request.created_at)} 작성
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-wd-fg-tertiary">
          이웃이 찾고 있어요
        </span>
        <h2 className="font-display text-[22px] font-extrabold leading-tight tracking-tight text-wd-fg-primary">
          {request.name}
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`${CHIP} bg-wd-primary-soft text-wd-primary`}>
          {request.category}
        </span>
        {request.urgent ? (
          <span className={`${CHIP} bg-wd-accent-soft text-wd-accent`}>
            <span
              className={
                request.status === 'open'
                  ? 'h-1.5 w-1.5 rounded-full bg-wd-accent animate-wd-blink'
                  : 'h-1.5 w-1.5 rounded-full bg-wd-accent'
              }
            />
            급해요
          </span>
        ) : null}
        {!isLocked ? (
          <span className={`${CHIP} bg-wd-cautionary-soft text-wd-cautionary`}>
            <ClockIcon className="h-3 w-3" />
            <CountdownTimer expiresAt={request.expires_at} />
          </span>
        ) : null}
        <span className={`${CHIP} bg-wd-bg-tertiary text-wd-fg-tertiary`}>
          {request.author.dong} {request.author.unit}
        </span>
      </div>
    </div>
  );
}

/* ============================================================
   OwnerView — 작성자 시점
   ============================================================ */
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
      setSavingError(
        err instanceof ApiError
          ? err.message || '저장에 실패했습니다.'
          : '네트워크 오류가 발생했습니다.',
      );
    }
  };

  const handleToggleUrgent = async (next: boolean) => {
    setSavingError(null);
    try {
      await update.mutateAsync({ urgent: next });
    } catch (err) {
      setSavingError(
        err instanceof ApiError
          ? err.message || '저장에 실패했습니다.'
          : '네트워크 오류가 발생했습니다.',
      );
    }
  };

  const handleDelete = () => {
    confirm(
      `"${request.name}" 게시글을 삭제할까요?`,
      () => remove.mutate(),
      { confirmLabel: '삭제', cancelLabel: '취소' },
    );
  };

  const visibleOffers = offers.filter((o) => o.status !== 'cancelled');

  return (
    <div className="flex flex-1 flex-col">
      <DetailHeader title="게시글 상세" onBack={() => navigate(-1)} />
      <HeroBlock request={request} />

      <div className="flex flex-1 flex-col gap-3 px-4 pb-28 pt-4">
        <Section title="요청 설명">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
            disabled={isLocked}
            rows={3}
            className="w-full resize-none rounded-[10px] border border-wd-border-default bg-wd-bg-primary px-3.5 py-2.5 text-[14px] leading-relaxed text-wd-fg-primary outline-none transition-colors focus:border-wd-primary disabled:opacity-60"
          />
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[11px] text-wd-fg-tertiary">
              {description.length}/200
            </span>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave || update.isPending}
              className="inline-flex h-8 items-center rounded-lg bg-wd-primary px-3 text-[12px] font-bold text-white transition-colors hover:bg-wd-primary-hover disabled:opacity-50"
            >
              {update.isPending ? '저장 중…' : '저장'}
            </button>
          </div>
          {savingError ? (
            <div className="mt-2 rounded-lg border border-wd-negative/30 bg-wd-negative-soft px-3 py-2 text-[12px] text-wd-negative">
              {savingError}
            </div>
          ) : null}
        </Section>

        <Section title="긴급 요청">
          <label className="flex items-center justify-between py-1">
            <span className="text-[13px] text-wd-fg-secondary">
              {request.urgent ? '급해요' : '일반'}
            </span>
            <input
              type="checkbox"
              checked={request.urgent}
              disabled={isLocked || update.isPending}
              onChange={(e) => handleToggleUrgent(e.target.checked)}
              className="h-5 w-5"
              style={{ accentColor: 'var(--wd-color-accent)' }}
            />
          </label>
        </Section>

        <Section title={`빌려주기 응답 · ${visibleOffers.length}건`}>
          <div className="flex flex-col gap-2.5 pt-1">
            <ParticipantBadge
              role="빌리기 요청인"
              dong={request.author.dong}
              unit={request.author.unit}
              name={request.author.name}
              tone="me"
              isMe
            />
            {visibleOffers.length === 0 ? (
              <p className="py-5 text-center text-[13px] leading-relaxed text-wd-fg-tertiary">
                아직 빌려주겠다는 이웃이 없어요. <br />
                같은 라인 이웃에게 알림이 갔어요.
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
            className="mt-2 inline-flex h-12 items-center justify-center rounded-xl border border-wd-negative/30 bg-wd-bg-primary text-[15px] font-bold text-wd-negative transition-colors hover:bg-wd-negative-soft disabled:opacity-50"
          >
            {remove.isPending ? '삭제 중…' : '게시글 삭제'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ============================================================
   OwnerOfferCard — 작성자 시점 응답 카드 (lu-offer-card)
   ============================================================ */
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

  const canAct = requestStatus === 'open' && offer.status === 'pending';
  const isAccepted = offer.status === 'accepted';
  const isRejected = offer.status === 'rejected';

  const handleAccept = () => {
    confirm(
      `${offer.offerer.name} 이웃의 빌려주기를\n수락할까요?`,
      async () => {
        setActionError(null);
        try {
          const matched = await accept.mutateAsync();
          navigate('/matched', { state: { matched }, replace: true });
        } catch (err) {
          setActionError(
            err instanceof ApiError
              ? err.message || '수락에 실패했습니다.'
              : '네트워크 오류가 발생했습니다.',
          );
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
          setActionError(
            err instanceof ApiError
              ? err.message || '거절에 실패했습니다.'
              : '네트워크 오류가 발생했습니다.',
          );
        }
      },
      { confirmLabel: '거절', cancelLabel: '취소' },
    );
  };

  const cardBorder = isAccepted
    ? 'border-wd-positive bg-wd-positive-soft/40'
    : isRejected
      ? 'border-wd-border-subtle bg-wd-bg-tertiary opacity-70'
      : 'border-wd-border-default bg-wd-bg-primary';

  const isPending = accept.isPending || reject.isPending;

  return (
    <div
      className={`flex flex-col gap-2.5 rounded-2xl border p-3.5 ${cardBorder}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-bold text-wd-fg-primary">
          {offer.offerer.dong} {offer.offerer.unit} · {offer.offerer.name}
        </span>
        <OfferStatusPill status={offer.status} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Cell label="대여 시간" value={offer.rental_time} />
        <Cell label="반납 시간" value={offer.return_time} />
        <Cell label="대여 장소" value={offer.rental_place} />
        <Cell label="반납 장소" value={offer.return_place} />
      </div>

      {isAccepted && offer.offerer.phone ? (
        <div className="flex items-center justify-between rounded-lg border border-wd-positive bg-white px-3 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-wd-fg-tertiary">
            연락처
          </span>
          <a
            href={`tel:${offer.offerer.phone}`}
            className="inline-flex items-center gap-1 text-[14px] font-bold text-wd-primary"
          >
            <PhoneIcon className="h-3.5 w-3.5" />
            {offer.offerer.phone}
          </a>
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-lg border border-wd-negative/30 bg-wd-negative-soft px-2.5 py-1.5 text-[12px] text-wd-negative">
          {actionError}
        </div>
      ) : null}

      {canAct ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleReject}
            disabled={isPending}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-wd-border-default bg-wd-bg-primary text-[13px] font-bold text-wd-fg-primary transition-colors hover:bg-wd-bg-tertiary disabled:opacity-50"
          >
            {reject.isPending ? '거절 중…' : '거절'}
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={isPending}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-wd-primary text-[13px] font-bold text-white transition-colors hover:bg-wd-primary-hover disabled:opacity-50"
          >
            {accept.isPending ? '수락 중…' : '수락'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-wd-bg-tertiary px-3 py-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-wd-fg-tertiary">
        {label}
      </span>
      <span className="text-[13px] font-bold text-wd-fg-primary">{value}</span>
    </div>
  );
}

/* ============================================================
   NeighborView — 이웃 시점
   ============================================================ */
function NeighborView({
  request,
  offers,
}: {
  request: RequestPublic;
  offers: OfferPublic[];
}) {
  const navigate = useNavigate();
  const confirm = useConfirm();

  const myActiveOffer = offers.find(
    (o) => o.status === 'pending' || o.status === 'accepted',
  );

  const [showSheet, setShowSheet] = useState(false);
  const [showMyModal, setShowMyModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<OfferPublic | undefined>(undefined);

  const cancel = useDeleteOffer(myActiveOffer?.id ?? 0, request.id);
  const [actionError, setActionError] = useState<string | null>(null);

  const isOpen = request.status === 'open';
  const isMatched = request.status === 'matched';

  const handleOpenLend = () => {
    setEditingOffer(undefined);
    setShowSheet(true);
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
          setActionError(
            err instanceof ApiError
              ? err.message || '취소에 실패했습니다.'
              : '네트워크 오류가 발생했습니다.',
          );
        }
      },
      { confirmLabel: '취소하기', cancelLabel: '닫기' },
    );
  };

  const handleSeeMatched = () => {
    if (!myActiveOffer) return;
    navigate('/matched', { state: { matched: { request, offer: myActiveOffer } } });
  };

  return (
    <div className="flex flex-1 flex-col">
      <DetailHeader title="게시글 상세" onBack={() => navigate(-1)} />
      <HeroBlock request={request} />

      <div className="flex flex-1 flex-col gap-3 px-4 pb-28 pt-4">
        <Section title="요청 설명">
          <p className="text-[14px] leading-relaxed text-wd-fg-secondary">
            {request.description}
          </p>
        </Section>

        <Section title="요청자">
          <Row label="동·호수">
            <span className="text-[14px] font-bold text-wd-fg-primary">
              {request.author.dong} {request.author.unit}
            </span>
          </Row>
          <Row label="이름">
            <span className="text-[14px] text-wd-fg-primary">{request.author.name}</span>
          </Row>
          <Row label="요청 시각">
            <span className="text-[14px] text-wd-fg-secondary">
              {formatRelative(request.created_at)}
            </span>
          </Row>
          {request.author.phone ? (
            <Row label="연락처">
              <a
                href={`tel:${request.author.phone}`}
                className="text-[14px] font-bold text-wd-primary"
              >
                {request.author.phone}
              </a>
            </Row>
          ) : null}
        </Section>

        {myActiveOffer ? (
          <div
            className={`flex flex-col gap-1.5 rounded-2xl border p-3.5 ${
              myActiveOffer.status === 'accepted'
                ? 'border-wd-positive bg-wd-positive-soft'
                : 'border-wd-primary bg-wd-primary-soft'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[11px] font-extrabold uppercase tracking-[0.04em] ${
                  myActiveOffer.status === 'accepted' ? 'text-wd-positive' : 'text-wd-primary'
                }`}
              >
                내 빌려주기 응답
              </span>
              <OfferStatusPill status={myActiveOffer.status} />
            </div>
            <div className="text-[13px] leading-relaxed text-wd-fg-secondary">
              <strong>{myActiveOffer.rental_time}</strong> {myActiveOffer.rental_place}에서
              → <strong>{myActiveOffer.return_time}</strong> {myActiveOffer.return_place}로 반납
            </div>
          </div>
        ) : null}

        {actionError ? (
          <div className="rounded-lg border border-wd-negative/30 bg-wd-negative-soft px-3 py-2 text-[13px] text-wd-negative">
            {actionError}
          </div>
        ) : null}

        {isOpen && !myActiveOffer ? (
          <button
            type="button"
            onClick={handleOpenLend}
            className="mt-1 inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-wd-primary text-[15px] font-bold text-white transition-colors hover:bg-wd-primary-hover active:scale-[0.98]"
          >
            <PlusIcon className="h-4 w-4" /> 빌려주기
          </button>
        ) : null}

        {isOpen && myActiveOffer && myActiveOffer.status === 'pending' ? (
          <button
            type="button"
            onClick={() => setShowMyModal(true)}
            className="mt-1 inline-flex h-12 items-center justify-center rounded-xl border border-wd-border-default bg-wd-bg-primary text-[15px] font-bold text-wd-fg-primary transition-colors hover:bg-wd-bg-tertiary"
          >
            내 빌려주기 정보 보기
          </button>
        ) : null}

        {isMatched && myActiveOffer && myActiveOffer.status === 'accepted' ? (
          <button
            type="button"
            onClick={handleSeeMatched}
            className="mt-1 inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-wd-positive text-[15px] font-bold text-white transition-colors active:scale-[0.98]"
          >
            <CheckIcon className="h-4 w-4" /> 거래 성사 정보 보기
          </button>
        ) : null}

        {!isOpen && !isMatched ? (
          <div className="rounded-xl bg-wd-bg-tertiary px-3.5 py-3 text-center text-[13px] text-wd-fg-tertiary">
            {request.status === 'expired'
              ? '거래 기간이 종료된 게시글이에요.'
              : '취소된 게시글이에요.'}
          </div>
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

/* ============================================================
   공통: Section / Row / ParticipantBadge / OfferStatusPill
   ============================================================ */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-wd-border-default bg-wd-bg-primary p-4">
      <h2 className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.04em] text-wd-fg-tertiary">
        {title}
      </h2>
      <div className="flex flex-col">{children}</div>
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
    <div className="flex items-center justify-between gap-3 border-t border-wd-border-subtle py-2.5 first:border-t-0">
      <span className="text-[13px] text-wd-fg-tertiary">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}

function ParticipantBadge({
  role,
  dong,
  unit,
  name,
  tone,
  isMe,
}: {
  role: string;
  dong: string;
  unit: string;
  name: string;
  tone: 'me' | 'offerer' | 'subtle';
  isMe?: boolean;
}) {
  const cls = {
    me: 'bg-wd-primary-soft border-wd-primary/30',
    offerer: 'bg-wd-positive-soft border-wd-positive/30',
    subtle: 'bg-wd-bg-tertiary border-wd-border-subtle',
  }[tone];
  const labelCls = {
    me: 'text-wd-primary',
    offerer: 'text-wd-positive',
    subtle: 'text-wd-fg-tertiary',
  }[tone];
  return (
    <div className={`flex flex-col gap-0.5 rounded-xl border px-3.5 py-2.5 ${cls}`}>
      <span className={`text-[11px] font-bold uppercase tracking-wider ${labelCls}`}>
        {role}
      </span>
      <span className="text-[14px] font-bold text-wd-fg-primary">
        {dong} {unit} · {name}
        {isMe ? (
          <span className="ml-1.5 text-[12px] font-bold text-wd-primary">(본인)</span>
        ) : null}
      </span>
    </div>
  );
}

const OFFER_PILL: Record<OfferPublic['status'], { text: string; cls: string }> = {
  pending: { text: '대기 중', cls: 'bg-wd-primary-soft text-wd-primary' },
  accepted: { text: '수락됨', cls: 'bg-wd-positive-soft text-wd-positive' },
  rejected: { text: '거절됨', cls: 'bg-wd-bg-tertiary text-wd-fg-tertiary' },
  cancelled: { text: '취소됨', cls: 'bg-wd-bg-tertiary text-wd-fg-tertiary' },
};

function OfferStatusPill({ status }: { status: OfferPublic['status'] }) {
  const pill = OFFER_PILL[status];
  if (!pill) return null;
  return (
    <span
      className={`inline-flex h-[22px] items-center rounded-md px-2 text-[11px] font-bold tracking-wide ${pill.cls}`}
    >
      {pill.text}
    </span>
  );
}

/* ============================================================
   SVG icons (인라인)
   ============================================================ */
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 4a8 8 0 110 16 8 8 0 010-16zM12 8v4l3 2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M5 4h3l2 5-2.5 1.5a11 11 0 005 5L14 13l5 2v3a2 2 0 01-2 2 17 17 0 01-15-15 2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M5 12l4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

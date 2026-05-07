import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/lib/auth';
import type { MatchedResponse } from '@/lib/types';

/**
 * 화면 12 (거래 성사). PLAN.md §1.E.
 * 진입 경로:
 *   navigate('/matched', { state: { matched: MatchedResponse } })
 * URL 직접 접근 → / 로 리다이렉트.
 */
interface LocationState {
  matched?: MatchedResponse;
}

export function MatchedPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  // 새로고침/뒤로가기 등으로 state가 비어있으면 아래에서 / 로 리다이렉트
  const state = location.state as LocationState | null;
  const matched = state?.matched;

  if (!matched || !currentUser) {
    return <Navigate to="/" replace />;
  }

  const { request, offer } = matched;
  const isAuthor = request.author.id === currentUser.id;

  // 상대방 정보 결정
  const partner = isAuthor ? offer.offerer : request.author;
  const me = isAuthor ? request.author : offer.offerer;

  const partnerPhone = partner.phone;

  const handleClose = () => {
    navigate('/', { replace: true });
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center gap-5 px-5 pb-10 pt-12">
        <div className="text-5xl">🎉</div>
        <h1 className="text-center text-2xl font-black text-text">
          거래가 성사되었어요!
        </h1>
        <p className="text-center text-sm text-sub">
          같은 라인 이웃과의 거래가 매칭됐어요.
          <br />
          서로 연락해서 편하게 나눠요.
        </p>

        <section className="flex w-full flex-col gap-2 rounded-lnb bg-card p-4 shadow-lnb-sm">
          <Row label="물건">
            <span className="text-sm font-bold text-text">{request.name}</span>
          </Row>
          <Row label="카테고리">
            <span className="text-sm text-text">{request.category}</span>
          </Row>
        </section>

        <section className="flex w-full flex-col gap-2 rounded-lnb bg-card p-4 shadow-lnb-sm">
          <h2 className="text-sm font-bold text-text">내 정보</h2>
          <Row label="동·호수">
            <span className="text-sm font-bold text-text">
              {me.dong} {me.unit}
            </span>
          </Row>
          <Row label="이름">
            <span className="text-sm text-text">{me.name}</span>
          </Row>
        </section>

        <section className="flex w-full flex-col gap-2 rounded-lnb bg-card p-4 shadow-lnb-sm">
          <h2 className="text-sm font-bold text-text">
            {isAuthor ? '빌려주는 이웃' : '요청한 이웃'}
          </h2>
          <Row label="동·호수">
            <span className="text-sm font-bold text-text">
              {partner.dong} {partner.unit}
            </span>
          </Row>
          <Row label="이름">
            <span className="text-sm text-text">{partner.name}</span>
          </Row>
          {partnerPhone ? (
            <Row label="연락처">
              <a
                href={`tel:${partnerPhone}`}
                className="text-sm font-bold text-primary"
              >
                {partnerPhone}
              </a>
            </Row>
          ) : (
            <Row label="연락처">
              <span className="text-sm text-sub">정보 없음</span>
            </Row>
          )}
        </section>

        <section className="flex w-full flex-col gap-2 rounded-lnb bg-card p-4 shadow-lnb-sm">
          <h2 className="text-sm font-bold text-text">시간 · 장소</h2>
          <Row label="대여 시간">
            <span className="text-sm text-text">{offer.rental_time}</span>
          </Row>
          <Row label="반납 시간">
            <span className="text-sm text-text">{offer.return_time}</span>
          </Row>
          <Row label="대여 장소">
            <span className="text-sm text-text">{offer.rental_place}</span>
          </Row>
          <Row label="반납 장소">
            <span className="text-sm text-text">{offer.return_place}</span>
          </Row>
        </section>

        <button
          type="button"
          onClick={handleClose}
          className="mt-2 h-12 w-full rounded-lnb bg-primary font-bold text-white shadow-lnb-sm transition-colors hover:bg-primary-dark"
        >
          확인
        </button>
      </div>
    </div>
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
    <div className="flex items-center justify-between gap-3 border-t border-border py-2 first-of-type:border-t-0">
      <span className="text-sm text-sub">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}

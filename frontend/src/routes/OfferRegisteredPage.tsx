import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { OfferPublic } from '@/lib/types';

/**
 * 화면 10 (빌려주기 등록 완료). PLAN.md §1.D.
 * 진입 경로:
 *   navigate('/offers/registered', { state: { offer, requestName } })
 * URL 직접 접근 → / 로 리다이렉트.
 */
interface LocationState {
  offer?: OfferPublic;
  requestName?: string;
}

export function OfferRegisteredPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as LocationState | null;
  const offer = state?.offer;
  const requestName = state?.requestName ?? '';

  if (!offer) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center gap-5 px-5 pb-10 pt-12">
        <div className="text-5xl">📦</div>
        <h1 className="text-center text-2xl font-black text-text">
          빌려주기를 등록했어요!
        </h1>
        <p className="text-center text-sm text-sub">
          이웃의 요청에 빌려주기를 등록했어요.
          <br />
          요청자가 수락하면 거래가 성사돼요.
        </p>

        <section className="flex w-full flex-col gap-2 rounded-lnb bg-card p-4 shadow-lnb-sm">
          {requestName ? (
            <Row label="물건">
              <span className="text-sm font-bold text-text">{requestName}</span>
            </Row>
          ) : null}
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
          onClick={() => navigate('/', { replace: true })}
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

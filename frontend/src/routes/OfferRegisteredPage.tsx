import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { DetailHeader } from '@/components/layout/DetailHeader';
import type { OfferPublic } from '@/lib/types';

/**
 * 화면 10 (빌려주기 등록 완료). Wanted DS lu-registered 톤.
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

  const goHome = () => navigate('/', { replace: true });

  return (
    <div className="flex flex-1 flex-col">
      <DetailHeader title="등록 완료" onBack={goHome} />

      {/* registered-hero: 64×64 primary-soft 원형 + primary check icon */}
      <div className="flex flex-col items-center gap-3.5 px-6 pb-4 pt-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-wd-primary-soft text-wd-primary">
          <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
            <path
              d="M5 12l4.5 4.5L19 7"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="font-display text-[22px] font-extrabold tracking-tight text-wd-fg-primary">
          빌려주기 응답을 보냈어요
        </h1>
        <p className="text-[13px] leading-relaxed text-wd-fg-tertiary">
          요청한 이웃이 수락하면 알려드릴게요. <br />
          <strong className="text-wd-fg-secondary">
            거래가 성사돼야 전화번호가 공개
          </strong>
          됩니다.
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 pb-10">
        <Section title="응답 정보">
          {requestName ? <Row label="물건">{requestName}</Row> : null}
          <Row label="대여 시간">{offer.rental_time}</Row>
          <Row label="반납 시간">{offer.return_time}</Row>
          <Row label="대여 장소">{offer.rental_place}</Row>
          <Row label="반납 장소">{offer.return_place}</Row>
        </Section>

        <button
          type="button"
          onClick={goHome}
          className="mt-1 inline-flex h-12 items-center justify-center rounded-xl bg-wd-primary text-[15px] font-bold text-white transition-colors hover:bg-wd-primary-hover active:scale-[0.98]"
        >
          메인으로
        </button>
      </div>
    </div>
  );
}

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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-wd-border-subtle py-2.5 first:border-t-0">
      <span className="text-[13px] text-wd-fg-tertiary">{label}</span>
      <span className="text-[14px] font-bold text-wd-fg-primary">{children}</span>
    </div>
  );
}

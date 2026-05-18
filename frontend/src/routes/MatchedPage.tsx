import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/lib/auth';
import { DetailHeader } from '@/components/layout/DetailHeader';
import type { MatchedResponse } from '@/lib/types';

/**
 * 화면 12 (거래 성사). Wanted DS lu-matched 톤.
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

  const state = location.state as LocationState | null;
  const matched = state?.matched;

  if (!matched || !currentUser) {
    return <Navigate to="/" replace />;
  }

  const { request, offer } = matched;
  const isAuthor = request.author.id === currentUser.id;
  const partner = isAuthor ? offer.offerer : request.author;
  const partnerPhone = partner.phone;

  const goHome = () => navigate('/', { replace: true });

  return (
    <div className="flex flex-1 flex-col">
      <DetailHeader title="거래 성사" onBack={goHome} />

      {/* matched-hero: 72×72 positive 원형 + 흰 check + 그림자 */}
      <div className="flex flex-col items-center gap-3 px-4 pb-2 pt-8 text-center">
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-wd-positive text-white shadow-[0_6px_20px_rgba(0,191,64,0.30)]">
          <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8">
            <path
              d="M5 12l4.5 4.5L19 7"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="mt-1 font-display text-[22px] font-extrabold tracking-tight text-wd-fg-primary">
          거래가 성사되었어요!
        </h1>
        <p className="text-[13px] leading-relaxed text-wd-fg-tertiary">
          같은 라인 이웃과의 거래가 매칭됐어요. <br />
          서로 연락해서 편하게 나눠요.
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 pb-10 pt-4">
        <Section title="물건">
          <Row label="물건 이름">{request.name}</Row>
          <Row label="카테고리">{request.category}</Row>
        </Section>

        <Section title={isAuthor ? '빌려주는 이웃' : '요청한 이웃'}>
          <Row label="동·호수">
            {partner.dong} {partner.unit}
          </Row>
          <Row label="이름">{partner.name}</Row>
          <Row label="연락처">
            {partnerPhone ? (
              <a
                href={`tel:${partnerPhone}`}
                className="inline-flex items-center gap-1 text-wd-primary"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
                  <path
                    d="M5 4h3l2 5-2.5 1.5a11 11 0 005 5L14 13l5 2v3a2 2 0 01-2 2 17 17 0 01-15-15 2 2 0 012-2z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {partnerPhone}
              </a>
            ) : (
              <span className="font-normal text-wd-fg-tertiary">정보 없음</span>
            )}
          </Row>
        </Section>

        <Section title="시간 · 장소">
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
          확인
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
      <span className="text-right text-[14px] font-bold text-wd-fg-primary">
        {children}
      </span>
    </div>
  );
}

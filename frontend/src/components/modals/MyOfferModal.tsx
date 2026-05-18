import { useEffect } from 'react';
import type { OfferPublic } from '@/lib/types';

/**
 * 화면 09 (내 빌려주기 정보 모달). Wanted DS lu-sheet 톤.
 * 이미 active offer를 등록한 이웃이 누르면 본인 offer 정보를 보여주고
 * 수정/취소 액션을 제공한다.
 */
interface Props {
  open: boolean;
  onClose: () => void;
  offer: OfferPublic;
  onEdit: () => void;
  onCancel: () => void;
}

export function MyOfferModal({ open, onClose, offer, onEdit, onCancel }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-mobile animate-wd-slide-up rounded-t-3xl bg-wd-bg-primary px-5 pb-[max(env(safe-area-inset-bottom),24px)] pt-4 shadow-[0_-8px_24px_rgba(0,0,0,0.12)]">
        <div className="mx-auto mb-3.5 h-1 w-[42px] rounded-full bg-wd-border-strong" />

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[19px] font-extrabold tracking-tight text-wd-fg-primary">
            내 빌려주기 정보
          </h2>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-wd-bg-tertiary text-wd-fg-tertiary"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <InfoCell label="대여 시간" value={offer.rental_time} />
          <InfoCell label="반납 시간" value={offer.return_time} />
          <InfoCell label="대여 장소" value={offer.rental_place} />
          <InfoCell label="반납 장소" value={offer.return_place} />
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-wd-border-default bg-wd-bg-primary text-[14px] font-bold text-wd-fg-primary transition-colors hover:bg-wd-bg-tertiary"
          >
            수정하기
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-wd-negative/30 bg-wd-bg-primary text-[14px] font-bold text-wd-negative transition-colors hover:bg-wd-negative-soft"
          >
            요청 취소
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-wd-bg-tertiary px-3 py-2.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-wd-fg-tertiary">
        {label}
      </span>
      <span className="text-[14px] font-bold text-wd-fg-primary">{value}</span>
    </div>
  );
}

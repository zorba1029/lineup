import { useEffect } from 'react';
import type { OfferPublic } from '@/lib/types';

/**
 * 화면 09 (내 빌려주기 정보 모달). PLAN.md §1.D.
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
  // ESC로 닫기
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
      <div className="w-full max-w-mobile rounded-t-lnb bg-card p-5 pb-[max(env(safe-area-inset-bottom),20px)] shadow-lnb">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">내 빌려주기 정보</h2>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="text-2xl leading-none text-sub"
          >
            ×
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
            className="h-11 flex-1 rounded-lnb-sm border border-border bg-card text-sm font-bold text-text"
          >
            수정하기
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="h-11 flex-1 rounded-lnb-sm border border-accent/40 bg-card text-sm font-bold text-accent"
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
    <div className="flex flex-col gap-1 rounded-lnb-sm border border-border bg-bg px-3 py-2.5">
      <span className="text-[11px] text-sub">{label}</span>
      <span className="text-sm font-bold text-text">{value}</span>
    </div>
  );
}

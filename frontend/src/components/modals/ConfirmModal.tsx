import { useEffect } from 'react';
import { useConfirmStore } from '@/lib/confirm';

/**
 * 전역 confirm 모달. App에서 1회 마운트.
 * 어디서든 `useConfirm()` 또는 `useConfirmStore.getState().open(...)`로 띄운다.
 * Wanted DS 톤 — 중앙 카드 + 둥근 secondary/primary 버튼.
 */
export function ConfirmModal() {
  const message = useConfirmStore((s) => s.message);
  const onConfirm = useConfirmStore((s) => s.onConfirm);
  const confirmLabel = useConfirmStore((s) => s.confirmLabel);
  const cancelLabel = useConfirmStore((s) => s.cancelLabel);
  const close = useConfirmStore((s) => s.close);

  useEffect(() => {
    if (!message) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [message, close]);

  if (!message) return null;

  const handleConfirm = () => {
    const cb = onConfirm;
    close();
    cb?.();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="w-full max-w-[360px] rounded-2xl bg-wd-bg-primary p-5 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
        <p className="whitespace-pre-line text-[15px] leading-relaxed text-wd-fg-primary">
          {message}
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={close}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-wd-border-default bg-wd-bg-primary text-[14px] font-bold text-wd-fg-secondary transition-colors hover:bg-wd-bg-tertiary"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-wd-primary text-[14px] font-bold text-white transition-colors hover:bg-wd-primary-hover"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

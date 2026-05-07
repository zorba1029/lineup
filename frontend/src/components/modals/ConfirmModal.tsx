import { useEffect } from 'react';
import { useConfirmStore } from '@/lib/confirm';

/**
 * 전역 confirm 모달. App에서 1회 마운트.
 * 어디서든 `useConfirm()` 또는 `useConfirmStore.getState().open(...)`로 띄운다.
 */
export function ConfirmModal() {
  const message = useConfirmStore((s) => s.message);
  const onConfirm = useConfirmStore((s) => s.onConfirm);
  const confirmLabel = useConfirmStore((s) => s.confirmLabel);
  const cancelLabel = useConfirmStore((s) => s.cancelLabel);
  const close = useConfirmStore((s) => s.close);

  // ESC로 닫기
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
      <div className="w-full max-w-[360px] rounded-lnb bg-card p-5 shadow-lnb">
        <p className="whitespace-pre-line text-base text-text">{message}</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={close}
            className="h-11 flex-1 rounded-lnb-sm border border-border bg-card text-sm font-bold text-sub"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="h-11 flex-1 rounded-lnb-sm bg-primary text-sm font-bold text-white shadow-lnb-sm hover:bg-primary-dark"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

import { create } from 'zustand';

/**
 * 전역 confirm 모달용 store. 화면 어디서든 `useConfirmStore.getState().open(...)` 또는
 * `useConfirm()` 훅 한 줄로 사용한다. <ConfirmModal/>은 App에서 1회 마운트.
 */
interface ConfirmState {
  message: string | null;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: (() => void) | null;
  open: (
    message: string,
    onConfirm: () => void,
    options?: { confirmLabel?: string; cancelLabel?: string },
  ) => void;
  close: () => void;
}

export const useConfirmStore = create<ConfirmState>((set) => ({
  message: null,
  confirmLabel: '확인',
  cancelLabel: '취소',
  onConfirm: null,
  open: (message, onConfirm, options) =>
    set({
      message,
      onConfirm,
      confirmLabel: options?.confirmLabel ?? '확인',
      cancelLabel: options?.cancelLabel ?? '취소',
    }),
  close: () =>
    set({
      message: null,
      onConfirm: null,
      confirmLabel: '확인',
      cancelLabel: '취소',
    }),
}));

/**
 * 컴포넌트 안에서 한 줄로 confirm 띄우는 헬퍼.
 *
 *   const confirm = useConfirm();
 *   confirm('정말 삭제할까요?', () => doDelete());
 */
export function useConfirm() {
  const open = useConfirmStore((s) => s.open);
  return open;
}

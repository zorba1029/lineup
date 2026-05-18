import type { RequestStatus } from '@/lib/types';

interface Props {
  status: RequestStatus;
}

/** Wanted DS lu-status. dot + 라벨, soft-bg/색 변형. */

const LABELS: Record<RequestStatus, string> = {
  open: '진행 중',
  matched: '거래 완료',
  expired: '거래 종료',
  cancelled: '취소됨',
};

const STYLES: Record<RequestStatus, string> = {
  open: 'bg-wd-primary-soft text-wd-primary',
  matched: 'bg-wd-positive-soft text-wd-positive',
  expired: 'bg-wd-bg-tertiary text-wd-fg-tertiary',
  cancelled: 'bg-wd-bg-tertiary text-wd-fg-tertiary',
};

export function StatusBadge({ status }: Props) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-[12px] font-bold tracking-wide ${STYLES[status]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full bg-current ${status === 'open' ? '' : 'opacity-55'}`}
      />
      {LABELS[status]}
    </span>
  );
}

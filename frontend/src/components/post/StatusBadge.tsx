import type { RequestStatus } from '@/lib/types';

interface Props {
  status: RequestStatus;
}

/**
 * 게시글 상태 배지. cancelled는 BE가 이미 빼버리지만 안전하게 매핑.
 */
export function StatusBadge({ status }: Props) {
  switch (status) {
    case 'open':
      return (
        <span className="rounded-lnb-sm bg-primary-light px-2 py-1 text-[11px] font-bold text-primary">
          모집 중
        </span>
      );
    case 'matched':
      return (
        <span className="rounded-lnb-sm bg-green-light px-2 py-1 text-[11px] font-bold text-green">
          거래 완료
        </span>
      );
    case 'expired':
      return (
        <span className="rounded-lnb-sm bg-bg px-2 py-1 text-[11px] font-bold text-sub">
          거래 종료
        </span>
      );
    case 'cancelled':
      return (
        <span className="rounded-lnb-sm bg-bg px-2 py-1 text-[11px] font-bold text-sub">
          취소됨
        </span>
      );
    default:
      return null;
  }
}

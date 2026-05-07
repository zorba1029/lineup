import type { User } from '@/lib/types';
import { useLogout } from '@/features/auth/useLogout';

interface Props {
  user: User;
}

/**
 * 메인 헤더. 좌측 로고 / 우측 사용자 정보 + 로그아웃.
 * 64px height, 좌우 16px padding.
 */
export function Header({ user }: Props) {
  const logout = useLogout();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4">
      <div className="text-lg font-black text-text">옆집마켓</div>
      <div className="flex items-center gap-3">
        <div className="text-right text-sm text-sub">
          <span className="font-bold text-text">
            {user.dong} {user.unit}
          </span>{' '}
          · {user.name}님
        </div>
        <button
          type="button"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="rounded-lnb-sm border border-border px-2 py-1 text-xs text-sub hover:text-text disabled:opacity-50"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}

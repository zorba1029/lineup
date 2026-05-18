import type { User } from '@/lib/types';
import { useLogout } from '@/features/auth/useLogout';

interface Props {
  user: User;
}

/**
 * 메인 헤더. Wanted DS lu-header 기반.
 *  좌측: brand-dot + 라인이웃
 *  우측: 동·호수(loc) / 이름·라인 정보(name) 2단 + 로그아웃
 *  56px height, sticky.
 *
 * "같은 라인 6세대"는 PoC 정적 문구. 추후 line member count API로 대체.
 */
export function Header({ user }: Props) {
  const logout = useLogout();

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-wd-border-default bg-wd-bg-primary px-4">
      <div className="flex items-center gap-2 font-display text-[19px] font-extrabold tracking-tight text-wd-fg-primary">
        <span aria-hidden className="h-2 w-2 rounded-full bg-wd-primary" />
        <span>라인이웃</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex flex-col items-end gap-px text-xs leading-tight">
          <span className="font-bold text-wd-fg-primary">
            {user.dong} {user.unit}
          </span>
          <span className="text-[11px] text-wd-fg-tertiary">
            {user.name}님 · 같은 라인 6세대
          </span>
        </div>
        <button
          type="button"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="rounded-md border border-wd-border-subtle px-2 py-1 text-xs text-wd-fg-tertiary transition-colors hover:text-wd-fg-primary disabled:opacity-50"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}

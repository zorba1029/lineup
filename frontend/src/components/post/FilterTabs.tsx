/**
 * 메인 리스트 필터 — 3-tab segmented control.
 * - all  : 같은 라인의 전체 게시글
 * - mine : 내가 작성한 요청 ("나의 요청")
 * - lent : 내가 빌려주겠다고 응답한 글 ("나의 수락", pending + accepted)
 *
 * 세 모드는 상호 배타적. 이전 두 개의 독립 토글에서 의미 명확성을 위해 탭으로 변경.
 */

export type FilterMode = 'all' | 'mine' | 'lent';

interface Props {
  mode: FilterMode;
  onChange: (mode: FilterMode) => void;
  /** 활성 탭 안에 표시할 현재 필터 결과 개수. */
  count?: number;
}

const TABS: ReadonlyArray<{ value: FilterMode; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'mine', label: '나의 요청' },
  { value: 'lent', label: '나의 수락' },
];

export function FilterTabs({ mode, onChange, count }: Props) {
  return (
    <div
      role="tablist"
      aria-label="게시글 필터"
      className="flex gap-1 rounded-lnb bg-card p-1 shadow-lnb-sm"
    >
      {TABS.map((t) => {
        const active = mode === t.value;
        return (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={
              'flex flex-1 items-center justify-center gap-1.5 rounded-lnb-sm px-2 py-2 text-sm font-bold transition-colors ' +
              (active
                ? 'bg-primary text-white shadow-lnb-sm'
                : 'text-sub hover:text-text')
            }
          >
            <span>{t.label}</span>
            {/* 모든 탭에 동일 폭 placeholder. 비활성에선 invisible로 텍스트 위치 고정. */}
            <span
              aria-hidden={!active}
              className={
                'min-w-[22px] rounded-full px-1.5 text-xs font-extrabold leading-5 ' +
                (active && count !== undefined
                  ? 'bg-white text-primary shadow-lnb-sm'
                  : 'invisible')
              }
            >
              {count ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}

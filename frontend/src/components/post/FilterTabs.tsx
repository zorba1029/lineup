/**
 * 메인 리스트 필터 — 3-tab segmented control.
 * - all  : 같은 라인의 전체 게시글
 * - mine : 내가 작성한 요청만
 * - lent : 내가 빌려주겠다고 응답한 글만 (pending + accepted)
 *
 * 세 모드는 상호 배타적. 이전 두 개의 독립 토글에서 의미 명확성을 위해 탭으로 변경.
 */

export type FilterMode = 'all' | 'mine' | 'lent';

interface Props {
  mode: FilterMode;
  onChange: (mode: FilterMode) => void;
}

const TABS: ReadonlyArray<{ value: FilterMode; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'mine', label: '내 글 보기' },
  { value: 'lent', label: '내가 빌려준 글' },
];

export function FilterTabs({ mode, onChange }: Props) {
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
              'flex-1 rounded-lnb-sm px-2 py-2 text-sm font-bold transition-colors ' +
              (active
                ? 'bg-primary text-white shadow-lnb-sm'
                : 'text-sub hover:text-text')
            }
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

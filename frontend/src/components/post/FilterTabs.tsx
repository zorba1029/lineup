/**
 * 메인 리스트 필터 — 3-tab segmented control. Wanted DS lu-tabs 톤.
 *  - container: border 1px + rounded-xl + p-1
 *  - active: bg-wd-fg-primary(흑) + 흰 텍스트
 *  - 비활성: text-wd-fg-tertiary
 *  - count: 활성 탭만 표시, 흰 배경 + 흑 텍스트 작은 pill
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
      className="flex items-center gap-1 rounded-xl border border-wd-border-default bg-wd-bg-primary p-1"
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
              'inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-bold transition-colors ' +
              (active
                ? 'bg-wd-fg-primary text-wd-fg-on-primary'
                : 'text-wd-fg-tertiary hover:text-wd-fg-primary')
            }
          >
            <span>{t.label}</span>
            {/* count: 모든 탭에 동일 폭 placeholder. 비활성에선 invisible로 텍스트 위치 고정. */}
            <span
              aria-hidden={!active}
              className={
                'inline-flex h-[18px] min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-extrabold ' +
                (active && count !== undefined
                  ? 'bg-wd-bg-primary text-wd-fg-primary'
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

# ui-update.md ─ Wanted Design System 도입 작업 기록

이 문서는 `feat/ui-update` branch에서 진행 중인 UI 마이그레이션 작업 기록이다.
원본 디자인 자료: `~/Downloads/lineup-mobile.html` (Anthropic Claude bundler 형식,
"라인이웃 × Wanted Design System" 모바일 시안).

## 1. 작업 개요

- **목적**: UI 디자이너의 Wanted Design System 기반 모바일 시안을 우리 frontend에
  점진적으로 흡수.
- **branch**: `feat/ui-update` (main 기반)
- **전략**: **B. 토큰 + 핵심 컴포넌트 단계 교체**
  - Tailwind config + 글로벌 CSS에 Wanted DS semantic 토큰 도입
  - 컴포넌트는 단계별로 wd-* 톤으로 재작성
  - 라우팅 / 상태관리 / 데이터 흐름은 그대로 유지
- **시각 검증**: 각 단계 commit 전 `pnpm dev`에서 사용자 확인 후 진행

## 2. 디자인 시스템 매핑

### 2.1 디자인 토큰 (`--wd-*` CSS variables)

`frontend/src/styles/index.css` `:root`에 정의. `frontend/tailwind.config.ts`에서
`colors.wd.*` namespace로 노출 → Tailwind utility로 `bg-wd-primary`,
`text-wd-fg-secondary`, `border-wd-border-default` 등 사용.

| 카테고리 | 토큰 |
|---|---|
| Foreground | `--wd-fg-primary` `secondary` `tertiary` `quaternary` `disabled` `inverse` `on-primary` |
| Background | `--wd-bg-primary` `secondary` `tertiary` `quaternary` `inverse` `surface` `surface-tinted` |
| Primary    | `--wd-color-primary` `hover` `press` `soft` `faint` (#0066FF 계열) |
| Positive   | `--wd-color-positive` `soft` (#00BF40) |
| Negative   | `--wd-color-negative` `soft` (#FF4242) |
| Cautionary | `--wd-color-cautionary` `soft` (#FF9200) |
| Informative| `--wd-color-informative` `soft` (#0098B2) |
| Accent     | `--wd-color-accent` `soft` (#6541F2 보라 — `급해요`용) |
| Border     | `--wd-border-subtle` `default` `strong` |

기존 `primary` `accent` `green` `bg` `card` `text` `sub` `border` 등의 단일 톤
색상은 **legacy로 유지** — 마이그레이션 중 깨짐 없이 양쪽 다 사용 가능. 신규
컴포넌트는 `wd-*` 우선.

### 2.2 폰트

- **Pretendard Variable** (KR/Latin) — CDN dynamic subset import (`@import` in index.css)
- **Wanted Sans** — 브랜드 폰트, 파일 없으면 Pretendard로 fallback
- Tailwind `font-sans` = Pretendard 우선 / `font-display` = Wanted Sans → Pretendard

### 2.3 애니메이션 (Tailwind config)

| 이름 | 용도 | 정의 |
|---|---|---|
| `wd-pulse` | open 상태 dot ring 확장 | box-shadow 0→8px wd-primary, 1.8s ease-out |
| `wd-blink` | 급해요 dot fade blink | opacity 1↔0.35, 1.4s ease-in-out |
| `wd-newpost-pulse` | NewPostBanner 흰 dot ring | box-shadow 4→8px white, 1.6s ease-out |
| `wd-slide-up` | bottom sheet 진입 | translateY(40px)→0, 280ms cubic-bezier |
| `blink-soft` | (legacy) urgent dot — 사용 안 함, 제거 예정 |

## 3. 단계별 작업 (commits)

### Step 1 — 토큰 + 폰트 도입 (`1860bab`)

- `styles/index.css`: Pretendard CDN import, `:root` wd-* semantic 토큰, body 폰트/배경 갱신
- `tailwind.config.ts`: `colors.wd.*` namespace, `font-sans`/`font-display`

### Step 2 — Header (`c293d27`)

- 높이 64px → **56px**, sticky top-0
- "라인이웃" 좌측에 wd-primary brand-dot
- 우측 user info **2단 column**: 동·호수 / 이름·"같은 라인 6세대"
- 로그아웃 버튼 wd 토큰

### Step 3 — PostCard / CountdownTimer (`27e109c`)

- PostCard: rounded-2xl(16px) + wd-border-default border
- 좌측 4px status bar (open=primary / matched=positive / expired·cancelled=fg-quaternary)
- top row: status-line (dot + 라벨), **open=wd-pulse ring 확장**
- 응답 카운트 pill: wd-primary solid + 흰 텍스트
- 급해요 chip: wd-accent **보라** + wd-blink dot
- meta chip 통일 (22px h, wd-bg-tertiary 베이스)
- **open 카드 meta에 남은 시간 chip 추가** (CountdownTimer)
- CountdownTimer 1h 미만 강조 색: `text-accent`(빨강) → `text-wd-cautionary`(주황)

### Step 4 — FilterTabs / NudgeBanner / NewPostBanner / Fab (`8c94774`)

- **FilterTabs**: border + rounded-xl, active=**검은색 bg** + 흰 텍스트 (파랑 → 흑), count pill 작게(h-18)
- **NudgeBanner**: gradient `wd-primary → #4F95FF`, 강조 색 yellow → 살구 `#FFD49C`, CTA에 chevron-right SVG
- **NewPostBanner**: 카드 → **둥근 pill(rounded-full)**, 흰 dot의 ring expand 애니메이션
- **Fab**: 파랑 → **검은색**(wd-fg-primary), 텍스트 + → inline SVG

### Step 5 — LoginPage / SignupPage + DetailHeader 신규 (`fe7eb8b`)

- **LoginPage**:
  - 44×44 wd-primary brand mark + 28px display-font "옆집마켓"
  - **"오늘의 라인이웃" 카드 신규** (primary-soft, sparkles SVG): "101동 01라인 이웃 6세대가 함께해요"
  - **하단 안내 카드 신규**: 전화번호 노출 시점 + 라인 격리 강조 (bg-wd-bg-tertiary)
  - input/btn lu-* 톤 (h-12, rounded-xl)
- **SignupPage**:
  - **DetailHeader 도입** — sticky 56px, 뒤로 가기 + "회원가입" 17px 타이틀
  - H2 "우리 라인 이웃으로 시작해요" + sub-title
  - 동/호수 grid + placeholder + 전화번호 hint Field 내장
- **DetailHeader (신규 컴포넌트)**: `components/layout/DetailHeader.tsx` — 6단계 RequestDetailPage 등에서 재사용

### Step 6 — RequestDetailPage + StatusBadge (`7ade246`)

- 내부 DetailHeader 인라인 제거 → 공통 `DetailHeader` 사용
- **HeroBlock 신규**: status badge + "이웃이 찾고 있어요" eyebrow + 22px display 큰 이름
  + meta chip row (카테고리/급해요/남은시간(주황)/위치)
- **Section**: rounded-2xl + wd-border-default 흰 카드 + 12px uppercase tertiary 헤딩
- **OwnerView**: in-place 설명 편집 + 긴급 토글 **유지** (인터랙션 보존, 톤만 wd)
- **OwnerOfferCard**: 카드 + 4-cell grid (대여/반납 시간·장소) + accepted시 연락처 row(흰 bg + wd-positive border)
- **NeighborView**: HeroBlock + 요청 설명 + 요청자 Section + "내 빌려주기 응답" 카드 + 단계별 액션 버튼
- 인라인 SVG icons (clock / phone / plus / check)
- **StatusBadge**: "모집 중" → **"진행 중"**, dot prefix 추가, wd 토큰

### Step 7 — Sheet / Modal 4종 (`0148f11`)

- 공통: rounded-t-3xl(24px) + bg-wd-bg-primary + `animate-wd-slide-up` + 42×4 grab handle (wd-border-strong)
- 닫기 ✕ → wd-bg-tertiary 둥근 버튼 + close SVG
- **RequestModal**: 카테고리 **3-column grid** (active=primary-soft+primary border), 급해요 toggle box (active=accent border+soft bg)
- **OfferBottomSheet**: step indicator 2 dots 7px / preset chip **rounded-full** 32px / chevron-left "이전" 버튼
- **MyOfferModal**: 4-cell info grid + 수정·취소 lu-btn
- **ConfirmModal**: 중앙 카드 rounded-2xl + h-11 secondary/primary

### Step 8 — OfferRegisteredPage / MatchedPage (`5f80937`)

- **OfferRegisteredPage**:
  - DetailHeader "등록 완료" 추가 (← 메인으로)
  - 이모지 📦 → **64×64 wd-primary-soft 원형 + wd-primary check SVG**
  - 22px display "빌려주기 응답을 보냈어요" + "거래가 성사돼야 전화번호가 공개" 정책 강조
  - 응답 정보 Section (Row x 5: 물건 + 시간/장소)
  - "메인으로" 버튼 (wd-primary, h-12, rounded-xl)
- **MatchedPage**:
  - DetailHeader "거래 성사" 추가
  - 이모지 🎉 → **72×72 wd-positive 원형 + 흰 check SVG + positive 30% 그림자**
  - 22px display "거래가 성사되었어요!" + sub-title
  - Section: 물건 / 상대방 이웃(phone icon inline) / 시간·장소
  - **"내 정보" Section 제거** — 새 디자인은 상대방 정보만 노출 (본인 정보는 본인이 아니까)

### Step 9 — 잔여 마이그레이션 + legacy 정리

빠진 화면 wd 톤 마이그레이션:
- **PostList**: empty state — rounded-lnb/bg-card/shadow-lnb-sm → rounded-2xl + border + bg-wd-bg-primary
- **MobileShell**: bg-bg → bg-wd-bg-secondary (양쪽 다)
- **MainPage**: loading/error 박스 → wd 토큰 (negative-soft 등)
- **NotFoundPage**: text-sub/text-primary → wd 토큰
- **CountdownTimer**: 주석의 `text-accent` 안내를 `text-wd-cautionary`로 갱신

코드 cleanup:
- `lib/categories.ts`: `CATEGORY_CHIP_CLASS` 제거 (사용처 0, 카테고리 chip 스타일은 PostCard 등에 인라인)
- `tailwind.config.ts`: legacy 색상(`primary/accent/green/yellow/bg/card/text/sub/border`), `borderRadius.lnb*`, `boxShadow.lnb*`, `blink-soft` keyframe/animation 모두 제거
- `frontend/src/lib/auth.ts`: import 검증 결과 정상 사용 — 추가 정리 X

검증:
- `pnpm typecheck` ✅
- `pnpm build` ✅ (152 modules, 정상 산출)
- legacy 토큰 잔여 0 (정밀 grep 검증)

## 4. 신규 컴포넌트

| 파일 | 역할 |
|---|---|
| `components/layout/DetailHeader.tsx` | 디테일 화면용 sticky 56px 헤더 (back + title + right slot) |

## 5. 영향 받지 않은 부분 (의도적)

- 라우팅 (`App.tsx`) — 그대로
- 상태 관리 (Zustand authStore, confirm store) — 그대로
- 데이터 fetching (TanStack Query hooks `features/auth|requests|offers`) — 그대로
- API 클라이언트 (`lib/api.ts`) — 그대로
- 시간 포맷 (`lib/time.ts`) — 그대로
- 타입 (`lib/types.ts`) — 그대로

## 6. 진행 상황

- ✅ 1~9단계 main 머지 (`55287e3`) + frontend 재배포 완료
- ✅ PLAN.md v1.3 갱신 (디자인 시스템 도입 공식 반영)
- ✅ feat/ui-update branch 보존

## 7. 정리 (완료 — Step 9에 통합)

마이그레이션 완료 후 권장 작업이었으나 Step 9에서 한꺼번에 처리됨.
자세한 내용은 위 § 3 Step 9 참고.

## 8. 참고 자료

- 원본 디자인 자료: `~/Downloads/lineup-mobile.html`
- 디코드 결과: `/tmp/lineup-mobile-decoded.html` (46KB), `/tmp/lineup-mobile-bundle/` (jsx 파일들)
- 핵심 jsx:
  - `ec363a0b.jsx` — 재사용 컴포넌트 (`LU_C`)
  - `f980708b.jsx` — 모바일 화면 (`LU_S`)
  - `6bbda20b.jsx` — mock 데이터 (seed.rs 기반)
  - `660f10c0.jsx` — 인터랙티브 프로토타입 (라우터)
- branch 보존 정책: `[[feedback-branch-workflow]]` (main 직접 commit X, `feat/*` branch + `--no-ff` 머지, branch 삭제 X)

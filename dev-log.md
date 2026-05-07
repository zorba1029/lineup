# 라인이웃(옆집마켓) ─ 개발 로그

작업 기간: 2026-05-06 ~ 진행 중
작업자: 단독 (Claude Code 협업)

이 문서는 PLAN.md를 따라 마일스톤 단위로 진행한 실제 구현 흐름의 기록이다. 각 마일스톤 끝에는 검증 상태와 데모 절차를 명시한다.

---

## M1. Skeleton (사전 완료)

세션 시작 시점에 이미 적용된 상태:
- `docker-compose.yml` (MySQL 8.4 + Adminer)
- `backend/` axum 0.7 + sqlx 0.8 + tokio, `/healthz` `/readyz`
- `backend/migrations/0001_init.sql` (users / requests / offers DDL)
- `frontend/` Vite + React 18 + TypeScript + Tailwind, 라우터 7개 + `MobileShell`, 빈 페이지 stub
- 디자인 토큰을 `tailwind.config.ts`에 옮김 (primary `#5B6EF7`, accent, green, sub, border, `rounded-lnb`, `max-w-mobile` 등)

검증: `/healthz` 200, vite dev 서버 정상.

---

## M2. Auth

목표 (PLAN.md §9 M2): 회원가입 → 로그인 → 메인(빈 페이지) → 로그아웃 → 새로고침해도 토큰 유지/만료.

### 백엔드 — TDD 진행

primitive 모듈을 RED → GREEN 사이클로 4개 작성. 모든 테스트는 `cargo test --bin linenb-backend`로 실행.

#### 1) `src/auth/password.rs` — argon2id (3 tests)
- `hash(&str) -> Result<String, password_hash::Error>`
- `verify(&str, &str) -> Result<bool, password_hash::Error>` (PHC 잘못된 경우만 Err, 비밀번호 틀린 건 `Ok(false)`로 평탄화)
- 테스트: roundtrip, 잘못된 비번 거부, 같은 비번이라도 salt가 달라 hash가 다름

#### 2) `src/auth/jwt.rs` — JWT (5 tests)
- `Claims { user_id, dong, line_no, kind, exp }` + `enum TokenKind { Access, Refresh }` (serde rename_all=lowercase)
- `encode(&[u8], &Claims) -> Result<String, _>` / `decode(&[u8], &str) -> Result<Claims, _>`
- `decode`에서 `Validation::leeway = 0` 명시 (jsonwebtoken 기본 60초 leeway가 `expired_token_rejected` 테스트를 통과시키는 문제 발견 → 명시적으로 0으로)
- `exp_in(ttl_sec) -> i64` 헬퍼 (Utc::now().timestamp() + ttl)

#### 3) `src/auth/extractor.rs` — `AuthUser` axum extractor (7 tests)
- `FromRequestParts<AppState> for AuthUser` 구현
- 핵심 로직은 순수 함수 `extract(&HeaderMap, &[u8]) -> Result<AuthUser, AppError>`로 분리 (DB·async 없이 단위 테스트 가능)
- refresh 토큰은 access 컨텍스트에서 거부 (kind != Access면 Unauthorized)
- 7개 케이스: 정상, 헤더 없음, Bearer prefix 없음, 잘못된 jwt, 다른 시크릿, refresh 토큰, 만료

#### 4) `src/util/line.rs` — `extract_line_no` (6 tests)
- `"101호" → "01"`, `"1502호" → "02"`
- 호수 끝 두 자리가 숫자가 아니거나, 호로 끝나지 않거나, 너무 짧으면 `BadRequest`
- 한글 `호` 처리를 위해 chars 단위로 슬라이스

primitive 4종, 테스트 21/21 GREEN 확인.

### 백엔드 — 핸들러 (TDD 보류, 검증된 primitive 위에 조립)

DB 통합 테스트는 task로 분리(M2 외 deferred). 핸들러는 컴파일 + 타입 + clippy로 검증, 실제 라운드트립은 수동 curl/브라우저로 확인.

`src/routes/auth.rs` — 5개 엔드포인트:

| Method | Path | 동작 |
|---|---|---|
| POST | `/api/v1/auth/signup` | validator 검증 → `extract_line_no` → argon2 hash → INSERT → access+refresh 발급. MySQL 1062(SQLSTATE 23000)는 409 Conflict로 매핑 |
| POST | `/api/v1/auth/login` | username 조회 → password 검증 → access+refresh 발급. 존재 안 하거나 틀리면 401 |
| POST | `/api/v1/auth/refresh` | refresh 토큰 디코드 (kind 검증) → 사용자 조회 → access만 재발급 |
| POST | `/api/v1/auth/logout` | 204. stateless JWT — MVP는 서버 폐기 안 함 |
| GET  | `/api/v1/auth/me` | `AuthUser` extractor → 사용자 조회 → UserPublic |

`AppState`에 jwt 관련 필드 추가:
```rust
pub struct AppState {
    pub db: sqlx::MySqlPool,
    pub jwt_secret: Arc<Vec<u8>>,
    pub jwt_access_ttl_sec: i64,
    pub jwt_refresh_ttl_sec: i64,
}
```

`main.rs`의 CORS를 M1의 `permissive`에서 환경변수 `CORS_ORIGIN` 기반 화이트리스트로 전환.

### 프론트엔드 — 서브에이전트 위임

API 계약이 잠긴 시점에 self-contained 프롬프트로 위임. 서브에이전트는 다음 산출물을 만들었다:

- `src/lib/types.ts` — `User`, `AuthSession`, `ApiErrorBody`, `ApiErrorCode` 등
- `src/lib/auth.ts` — Zustand persist store (`linenb-auth` localStorage key) + 컴포넌트 외부 `authStore` 헬퍼
- `src/lib/api.ts` — `apiFetch<T>` 래퍼:
  - 자동 Bearer 주입
  - JSON body 자동 직렬화 + Content-Type
  - 401 시 in-flight refresh 1회 시도(동시 요청들이 promise 공유로 thundering herd 방지) → 성공 시 재시도, 실패 시 store clear
  - 204 / 빈 본문 처리
  - `ApiError extends Error` (status, code, message)
- `src/lib/queryKeys.ts` — query key factory
- `src/lib/validation.ts` — `@hookform/resolvers` 추가를 피하기 위한 minimal `zodResolver` (~20줄)
- `src/features/auth/` — `useLogin`, `useSignup`, `useMe`, `useLogout`
- `src/components/auth/RequireAuth.tsx` — 토큰 없으면 `/login`, 있으면 children + 백그라운드 useMe
- `src/routes/LoginPage.tsx` / `SignupPage.tsx` — RHF + zod, 401·409 인라인 에러
- `src/App.tsx` — 보호 라우트(`/`, `/requests/:id`, `/offers/registered`, `/matched`)만 RequireAuth 래핑

서브에이전트가 추가한 사소한 baseline 픽스 2건:
- `@types/node` devDep — `vite.config.ts`에서 `node:path` 사용에 필요했는데 빠져 있던 것
- `pnpm typecheck` 스크립트를 `tsc -p tsconfig.json --noEmit && tsc -p tsconfig.node.json --noEmit`로 분리 (기존 `tsc -b --noEmit`는 build 모드와 충돌)

### M2 검증
- `cargo test`: 21/21
- `cargo clippy --bin linenb-backend --all-targets -- -D warnings`: clean
- `pnpm typecheck`: 0 errors
- `pnpm build`: 305KB JS / gzip 93KB
- 수동 테스트: 회원가입 성공 확인 (사용자 직접 검증)

### M2 보류
- `#[sqlx::test]` 통합 테스트 (signup→login→me 라운드트립, 중복 username 409, 잘못된 비번 401, refresh roundtrip) — MySQL 테스트 인프라 셋업 후 작성

---

## M3. 게시글 CRUD + 메인 화면

목표 (PLAN.md §9 M3): hong이 글 작성 → kim 계정에서 같은 글이 보임 → 다른 라인의 박서준은 안 보임.

### 백엔드

#### 1) `src/util/category.rs` — 카테고리 validator (TDD, 5 tests)
- `CATEGORIES = &["공구", "주방", "오락", "전자기기", "가전", "기타"]`
- `validate_category(&str) -> Result<(), AppError>`
- PLAN.md §10 규약: DB·BE·FE 모두 한글 문자열 그대로
- 부분 매치(`"공구류"`)도 거부

#### 2) `src/models/request.rs` — DB row + DTOs (TDD, 2 tests)
- `RequestWithAuthorRow` (FromRow): `requests JOIN users` 결과를 한 row에 평탄화. 작성자 필드는 SQL alias로 `author_*` 네이밍
- `RequestPublic`: API 응답. snake_case 필드명 유지 (FE M2와 일관성)
- `AuthorInfo` + `into_public(include_phone: bool)` — 전화번호 노출은 matched 상태에서만 (현재는 호출처에서 false로 고정, M4에서 matched 분기에 따라 true 사용 예정)
- DTOs: `CreateRequestBody` (name, category, description, urgent), `UpdateRequestBody` (description?, urgent?)
- 테스트: `hides_phone_by_default` / `includes_phone_when_requested`

날짜 처리: MySQL `DATETIME` → `chrono::NaiveDateTime` (sqlx 0.8 mysql 컨벤션) → JSON 직렬화 시 `DateTime<Utc>::from_naive_utc_and_offset`로 UTC ISO 변환. 서버는 UTC 가정.

#### 3) `src/routes/requests.rs` — 5개 핸들러
모든 쿼리는 공통 `SELECT_BASE` 상수 사용:
```sql
SELECT r.*, u.name AS author_name, u.dong AS author_dong, ...
FROM requests r INNER JOIN users u ON u.id = r.user_id
WHERE u.dong = ? AND u.line_no = ?
```

| Method | Path | 동작 |
|---|---|---|
| GET    | `/api/v1/requests?mine&lent&since` | (dong, line_no) 격리 + `cancelled` 제외. mine은 user_id 추가 필터, since는 updated_at, lent=true는 M3에서 빈 리스트 (M4에서 offer 조인) |
| POST   | `/api/v1/requests` | validator + category 검증, `expires_at = DATE_ADD(NOW(), INTERVAL 72 HOUR)` |
| GET    | `/api/v1/requests/:id` | 같은 라인 + 비-cancelled 한정. 없으면 404 |
| PATCH  | `/api/v1/requests/:id` | 작성자만(403). status='open'만(409). `COALESCE(?, col)`로 부분 업데이트 |
| DELETE | `/api/v1/requests/:id` | 작성자만. soft-delete (status='cancelled'). 멱등 |

#### 4) `src/tasks/expire.rs` — 백그라운드 만료 task
`main.rs`에서 `tasks::expire::spawn(state.db.clone())` 호출. `tokio::interval(60s)` 루프로
```sql
UPDATE requests SET status = 'expired' WHERE status = 'open' AND expires_at <= NOW()
```
실행, 만료 건 수를 tracing::info로 로그. DB 에러는 잡고 다음 tick 계속 (task가 죽지 않도록).

### 프론트엔드 — 서브에이전트 위임

M2 산출물(api.ts, auth.ts 등)은 보호 명시. 새로 만든 것:

`src/lib/`
- `categories.ts` — `CATEGORIES` 상수 + 카테고리별 색상 클래스 맵
- `time.ts` — `formatRelative(iso)` ("방금 전" / "N분 전" / "N시간 전" / "N일 전" / "MM/DD"), `formatRemaining(iso)`. 외부 lib 없이 직접 작성.
- `confirm.ts` — 전역 confirm Zustand store + `useConfirm()` 훅
- `types.ts` 확장: `RequestPublic`, `RequestAuthor`, `RequestStatus`, `RequestListResponse`
- `queryKeys.ts` 확장: `requests.{all,list(filters),detail(id)}`

`src/features/requests/` — useQuery·useMutation 5종
- `useRequests({mine?, lent?})` — list, mutation 후 invalidate 대상
- `useRequest(id)` — single (404/403은 retry 안 함)
- `useCreateRequest` — POST + 캐시 prime + 새 글 상세로 navigate
- `useUpdateRequest` — PATCH + invalidate
- `useDeleteRequest` — DELETE → 메인 navigate

`src/components/`
- `layout/Header.tsx` — 로고 / 사용자 정보(`{dong} {unit} · {name}`) / 로그아웃
- `post/PostCard.tsx`, `PostList.tsx`, `FilterChips.tsx` (button + aria-pressed), `Fab.tsx`, `StatusBadge.tsx`
- `modals/RequestModal.tsx` — 등록 bottom sheet (RHF + zod, name 1-80, category enum, description 1-200, urgent toggle)
- `modals/ConfirmModal.tsx` — 전역 confirm slot (App에 1회 마운트)
- `timer/CountdownTimer.tsx` — 정적 stub. props 시그니처는 M5에서 1초 갱신으로 교체될 형태로 미리 잡음

`src/routes/`
- `MainPage.tsx` — Header / FilterChips / PostList / Fab / RequestModal. NewPostBanner·NudgeBanner는 M5 자리 주석으로 표시.
- `RequestDetailPage.tsx` — `request.author.id === currentUser.id` 분기
  - 작성자 뷰: 편집 가능 description + 「저장」, urgent 즉시 PATCH, 게시글 삭제(confirm), offer 리스트 placeholder
  - 이웃 뷰: read-only. 「빌려주기」 버튼은 의도적으로 미노출 (M4에서 활성화)
- `App.tsx` — `<ConfirmModal />`을 RequireAuth 안쪽에 1회 마운트

### M3 검증
- `cargo test`: 28/28
- `cargo clippy -D warnings`: clean
- `pnpm typecheck`: 0 errors
- `pnpm build`: 324KB JS / gzip 98KB
- 수동 데모 절차 (사용자 검증 대기):
  1. `docker compose up -d mysql && cd backend && cargo run`
  2. `cd frontend && pnpm dev`
  3. hong으로 로그인 → FAB로 글 작성 → 상세 페이지 확인
  4. 같은 라인의 다른 계정 가입 → hong의 글이 보이는지 확인
  5. 다른 라인 계정(예: 102호) 가입 → 안 보이는지 확인
  6. 작성자 PATCH/DELETE 동작 확인

### M3 보류
- M4: OfferBottomSheet, 이웃 뷰 「빌려주기」 노출, offer 리스트, accept 트랜잭션, MatchedPage
- M5: NewPostBanner / NudgeBanner / TanStack `refetchInterval` polling / 1초 갱신 카운트다운

---

## M4. Offer 플로우

목표 (PLAN.md §9 M4): kim이 hong의 글에 offer → hong이 수락 → 양쪽 거래 성사 화면.

### 백엔드

#### 1) `src/models/offer.rs` — DB row + DTOs (TDD, 2 tests)
- `OfferWithOffererRow` (FromRow): `offers JOIN users` 평탄화. offerer 필드는 `offerer_*` alias.
- `OfferPublic` + `OffererInfo` + `into_public(include_phone)` — request와 동일한 phone-gating 패턴.
- DTOs: `CreateOfferBody` (rental_time/return_time 1-20자, rental_place/return_place 1-60자), `UpdateOfferBody` (모두 Optional).
- 테스트: phone 가시성 두 케이스.

#### 2) `src/routes/offers.rs` — 6개 엔드포인트
두 라우터로 분할:
- `requests_scoped_router()` — `/:id/offers` (POST + GET) — `routes::mod`에서 `requests::router()`와 `merge`
- `top_router()` — `/:id` PATCH/DELETE, `/:id/accept`, `/:id/reject`

`SELECT_OFFER_BASE` 상수: `offers o JOIN users u (offerer) JOIN requests r JOIN users ru (request author) WHERE ru.dong = ? AND ru.line_no = ?` — 격리는 request 작성자의 (dong, line_no) 기준.

| Method | Path | 핵심 로직 |
|---|---|---|
| POST   | `/requests/:id/offers` | validator + request open 검증 + 본인 글 거부 + `(request_id, user_id, status='pending')` 활성 offer 1건 강제 → INSERT |
| GET    | `/requests/:id/offers` | 작성자: 모든 offer / 이웃: `WHERE o.user_id = auth.user_id` |
| PATCH  | `/offers/:id` | 본인 + status='pending'만. `COALESCE(?, col)`로 부분 업데이트 |
| DELETE | `/offers/:id` | 본인. pending → 'cancelled', 그 외 멱등 (204) |
| POST   | `/offers/:id/accept` | **트랜잭션**(아래) |
| POST   | `/offers/:id/reject` | request 작성자 + offer.status='pending'만 → 'rejected' |

##### accept 트랜잭션
```rust
let mut tx = db.begin().await?;
// 1. SELECT offer FOR UPDATE — pending 검증
// 2. SELECT request FOR UPDATE — 격리 + 작성자 검증 + open 검증
// 3. UPDATE this offer SET status='accepted'
// 4. UPDATE other pending offers SET status='rejected' WHERE request_id=? AND id<>?
// 5. UPDATE request SET status='matched'
tx.commit().await?;
// 응답: { request: RequestPublic(phone=true), offer: OfferPublic(phone=true) }
```
양 당사자가 phone을 보는 것은 응답에서만 활성화 — 이후 GET /requests/:id로 재진입할 때도 동일하게 노출됨 (task #14 참조).

#### 3) `src/routes/requests.rs` — `GET /:id` 응답 shape 변경 (M3 → M4 breaking)
M3 응답: `RequestPublic` 직접
M4 응답: `DetailResponse { request, offers, pending_offer_count }`

핵심 분기 로직:
```rust
let is_author = req.user_id == auth.user_id;
let req_status = req.status.clone();
let all_offers = /* SELECT all offers for this request */;

let pending_offer_count = all_offers.iter().filter(|o| o.status == "pending").count();
let matched_offerer_id = all_offers.iter().find(|o| o.status == "accepted").map(|o| o.user_id);

let auth_is_matched_offerer = matched_offerer_id == Some(auth.user_id);
let request_phone = req_status == "matched" && auth_is_matched_offerer;

let visible = all_offers.into_iter().filter(|o| {
    if is_author { o.status != "cancelled" } else { o.user_id == auth.user_id }
});
let offers = visible.map(|o| {
    let include_phone = req_status == "matched" && o.status == "accepted" && is_author;
    o.into_public(include_phone)
});
```

phone 노출 매트릭스:
- 작성자 → matched offer의 offerer phone 보임
- 매칭된 offerer → request 작성자의 phone 보임
- 그 외 (다른 이웃) → phone 안 보임

### 프론트엔드 — 서브에이전트 위임

새로 만든 것:

`src/features/offers/` (5종)
- `useCreateOffer` — POST /requests/:id/offers + 성공 시 `/offers/registered`로 navigate(state)
- `useUpdateOffer` — PATCH /offers/:id
- `useDeleteOffer` — DELETE /offers/:id (cancel)
- `useAcceptOffer` — POST /offers/:id/accept + 성공 시 `/matched`로 navigate(state)
- `useRejectOffer` — POST /offers/:id/reject

`src/components/`
- `sheets/OfferBottomSheet.tsx` — 2-step (시간 → 장소). `editingOffer?: OfferPublic` prop으로 신규/수정 동일 UI. ESC/backdrop 닫기.
- `modals/MyOfferModal.tsx` — 이웃 본인의 active offer 정보 + 「수정하기」/「요청 취소」

`src/routes/`
- `MatchedPage.tsx` — `location.state.matched` 진입. URL 직접 접근 → `/` 리다이렉트. 작성자/오퍼러 양방향 분기로 상대 정보 자동 결정. phone은 `tel:` 링크.
- `OfferRegisteredPage.tsx` — 1회용 등록 완료 화면. state 없으면 `/`로.
- `RequestDetailPage.tsx` 전체 리팩터 (DetailResponse 새 shape 반영):
  - 작성자 뷰: 각 offer 카드 + 「수락」/「거절」 + ConfirmModal. accepted offer는 `bg-green-light` 강조, matched/expired에선 액션 자동 비활성화.
  - 이웃 뷰: 본인 active offer 유무로 「빌려주기」 / 「내 빌려주기 정보 보기」 / 「거래 성사 정보 보기」 분기.

수정한 것:
- `lib/types.ts` — `OfferPublic`, `OfferStatus`, `Offerer`, `RequestDetailResponse`, `MatchedResponse` 추가
- `lib/queryKeys.ts` — `offers.all` 추가
- `features/requests/useRequest.ts` — 응답 타입 `RequestDetailResponse`로 변경
- `features/requests/useCreateRequest.ts`, `useUpdateRequest.ts` — `setQueryData(detail, RequestPublic)` 호출 제거 (캐시 shape이 wrapper로 바뀌어 type mismatch). 대신 invalidate로 단순화.

### M4 검증
- `cargo test`: 30/30
- `cargo clippy -D warnings`: clean
- `pnpm typecheck`: 0 errors
- `pnpm build`: 343KB JS / gzip 101KB (147 modules)
- 수동 데모 절차 (사용자 검증 대기):
  1. hong으로 글 작성
  2. kim 가입(같은 라인 다른 호수) → hong의 글 상세 → 「빌려주기」 → 시간·장소 입력 → `/offers/registered`
  3. hong 재로그인 → 글 상세에 kim의 offer 카드 → 「수락」 confirm → `/matched` 진입, kim의 phone 표시
  4. kim 측 글 상세 → 「거래 성사 정보 보기」 → `/matched`에 hong의 phone 표시

### M4 의도적 trade-off
- 2-step 가로 슬라이드 애니메이션은 step pip indicator로 단순화 (M5에서 폴리시).
- mutation 후 `requests.all` 광범위 invalidate. M5 polling과 함께 좁힐 여지.
- `useUpdateOffer(editingOffer?.id ?? 0, requestId)` — editing 아닐 때 0 fallback. mutate 미호출이라 안전하지만 약한 code smell.

### M5로 미룬 부분
- TanStack `refetchInterval` polling
- 1초 갱신 카운트다운 (`CountdownTimer`는 정적 stub 그대로)
- NewPostBanner / NudgeBanner
- bottom sheet 슬라이드 업 + step 가로 슬라이드 애니
- toast/snackbar

---

## M5. Polling / 카운트다운 / 배너

목표 (PLAN.md §9 M5): 다른 사람이 글을 쓰면 5초 내 자동 표시, 카운트다운 실시간 갱신, 새 글/Nudge 배너로 발견성 향상.

작업은 모두 프론트엔드 — 백엔드는 추가 작업 없음. 메인 세션에서 직접 작업 (서브에이전트 위임 X — 4건 합쳐 ~250 LoC, 단일 stack 변경이라 직접이 빠름).

이 마일스톤부터 워크플로 변경: `feat/m5-polling-banners` branch에서 작업 → 사용자 검증 → `--no-ff`로 main에 merge. main은 검증된 코드만 유지.

### 1) `CountdownTimer` 1초 갱신 (M5-1)
`src/components/timer/CountdownTimer.tsx` — M3 정적 stub을 인터벌 기반으로 교체.
- `useState(new Date()) + useEffect setInterval(1000)` + cleanup
- 만료 시점이 지나면 setInterval 자체를 정리 → 무용한 tick 방지
- `remainingMs < 1시간`일 때 `text-accent font-bold` 강조 (PLAN §1 urgent)

### 2) TanStack `refetchInterval` (M5-2)
- `useRequests`: 5초 polling, `refetchIntervalInBackground=false` (탭 백그라운드일 때 중단)
- `useRequest`: 1초 polling. **상태 의존 동적 인터벌**:
  ```ts
  refetchInterval: (query) => {
    const status = query.state.data?.request.status;
    if (status && status !== 'open') return false;  // matched/expired/cancelled은 자동 중단
    return 1000;
  }
  ```

### 3) `NewPostBanner` — 미열람 N건 (M5-3)
- `src/lib/lastSeen.ts` — localStorage `linenb-last-seen`에 ms epoch. 첫 방문 시 NOW로 초기화 (옛 글이 "새 글"로 안 잡히도록). 다른 탭과 storage 이벤트로 동기화.
- `src/components/nudge/NewPostBanner.tsx` — derived count:
  ```ts
  items.filter(it => it.author.id !== currentUserId && created > lastSeen).length
  ```
  별도 fetch 없이 메인의 `useRequests` 결과 + polling과 자동 동기화. 닫기(✕) → `lastSeen = now` → 카운트 0 → null 반환으로 자동 제거.

### 4) `NudgeBanner` — 정적 추천 + RequestModal 프리필 (M5-4)
- `src/lib/nudgePool.ts` — 12건 정적 풀 (PLAN §3 시드 카테고리 분배)
- `src/components/nudge/NudgeBanner.tsx` — `useMemo([])`로 mount 시 랜덤 1건 lock, 클릭 시 부모 콜백
- `RequestModal`에 `prefill?: { name?, category?, description? }` prop 추가. open && prefill 변화 시 `reset({...defaults, ...prefill})`.
- PLAN의 "자동 등록" 대신 사용자 확인 단계 보존 — 잘못 누름 방지가 더 중요한 UX.

### 결정 사항
- **폼 프리필 vs 즉시 POST**: PLAN.md는 자동 등록을 명시하지만 RequestModal 프리필 채택. 잘못된 요청 1건이라도 노이즈가 크고, 같은 라인 이웃 모두에게 알림이 가는 구조라 신중한 게 맞음.
- **NewPostBanner는 derived state**: 별도 `?since=` 쿼리 대신 기존 list query에서 계산. 1 fetch 줄이고 polling과 자동 정합. 단점: 페이지 진입 시점 vs lastSeen이 가까우면 N=0이라 배너 안 뜸 (의도 — "방금 본 거 알지" 휴리스틱).
- **상태 의존 polling**: matched/expired/cancelled 글은 polling 자동 중단. 비활성 글에 1초마다 GET 보낼 이유 없음.

### M5 검증
- `pnpm typecheck`: 0 errors
- `pnpm build`: 151 modules, 347KB JS / gzip 102KB (M4 대비 +4KB)
- 사용자 브라우저 검증 ✅:
  1. 두 계정 → A 글 작성 → B 메인 5초 내 자동 표시 ✅
  2. 1초 갱신 카운트다운 ✅ (urgent 강조 SQL로 단축 후 확인)
  3. NewPostBanner 카운트 + 닫기 동작 ✅
  4. NudgeBanner 클릭 → RequestModal 프리필 ✅

### M6로 미룬 부분
- bottom sheet 슬라이드 업 / step 가로 슬라이드 애니메이션 (CSS only)
- toast/snackbar
- `/me/notifications/summary` 엔드포인트 (현재 derived count로 충분)

---

## 수평 결정 사항 (모든 M에 적용)

### TDD 적용 범위
- **순수 primitive (password, jwt, extractor 핵심 함수, line·category validator, 모델 변환)**: 엄격한 RED → GREEN 사이클. 28건 단위 테스트.
- **DB 핸들러**: TDD 보류. 통합 테스트는 별도 task. 컴파일/clippy/타입 + 사용자 수동 검증으로 안전망.
- **프론트엔드**: 컴포넌트 단위 테스트 미작성. typecheck + build로만 검증. 수동 브라우저 테스트가 일차 안전망.

### 서브에이전트 협업 패턴
프론트엔드는 매 마일스톤 BE API가 잠긴 직후 self-contained 프롬프트로 위임.
프롬프트 구조:
1. 작업 디렉토리
2. 손대면 안 되는 파일 목록 (이전 마일스톤 산출물)
3. 백엔드 API 계약 (snake_case 필드 포함 정확한 shape)
4. 구현 범위 — 파일 단위로 책임 명시
5. FE 컨벤션 (Tailwind 토큰만, 외부 dep 추가 금지, RHF+zod, TanStack Query, `@/` alias)
6. 디자인 가이드 (프로토타입 HTML 참조)
7. DoD: typecheck + build 통과
8. 보고 형식 (300단어 이하, 만든 파일 + 보류 부분 + 의도적 trade-off)

위임 후 메인 세션이 결과를 직접 typecheck/build로 재검증.

### JSON 네이밍
중간에 카멜/스네이크 혼재가 발생 — 정리:
- 인증 토큰 필드는 `accessToken` / `refreshToken` (camelCase, M2에서 결정)
- 그 외 도메인 필드는 모두 snake_case (`line_no`, `start_time`, `expires_at`, `created_at`)
M3에서 `RequestPublic`을 처음에 camelCase로 작성했다가 FE가 이미 `line_no`로 사용 중인 점 고려해 snake_case로 통일.

### 격리 (dong, line_no)
모든 request 관련 쿼리는 `INNER JOIN users WHERE u.dong = ? AND u.line_no = ?`을 강제. `fetch_one` / `list_requests` / 내부 헬퍼 모두 동일 베이스 쿼리(`SELECT_BASE`) 재사용해 누락 가능성 차단.

### 만료 처리 (PLAN.md §10)
백그라운드 task(60s 주기)만 적용. PLAN에 언급된 "조회 시 lazy 검사"는 일관성 측면에서 굳이 안 함 — 60초 지연은 UX상 허용 가능, 핸들러 복잡도 증가 회피.

### 전화번호 노출 (PLAN.md §10)
`AuthorInfo.phone: Option<String>`으로 표현. 직렬화 시 `skip_serializing_if = "Option::is_none"`으로 None일 때 키 자체 제거. M3는 항상 None, M4 matched 분기에서 양방향 활성화 예정.

---

## 다음 단계

**M6. 마감** (PLAN.md §9 M6)
- 시드 데이터 (`cargo run --bin seed` 또는 SQL 마이그레이션). 4명 사용자 + 카테고리별 샘플 글 몇 건.
- 운영용 Dockerfile (FE → nginx static, BE → distroless 또는 alpine)
- GitHub Actions CI: `cargo test`, `cargo clippy -D warnings`, `cargo sqlx prepare`, `pnpm typecheck`, `pnpm build`. PR 트리거.
- 보류 task #6 (`#[sqlx::test]` 통합 테스트) 처리 — CI에서 MySQL 서비스 띄우고 실행
- README 마감 (배포 절차 + 데모 URL이 있으면 추가)
- 폴리시: bottom sheet 슬라이드 업, toast/snackbar (옵션)

---

## 누적 산출물 카운트

| 영역 | 파일 수 (대략) | 테스트 수 |
|---|---|---|
| 백엔드 | 16 (auth 3 / models 3 / routes 4 / util 2 / tasks 1 / db·config·error·main) | 30 |
| 프론트엔드 | 36 (lib 10 / features 9 / components 15 / routes 7) | 0 |
| 마이그레이션 | 1 | — |

테스트 진행: 21(M2) → 28(+M3) → 30(+M4 offer 모델) → 30(M5 — FE 전용이라 BE 테스트 변동 없음). 핸들러 통합 테스트는 task #6으로 별도 적재(M6 CI에서 처리 예정).

빌드 사이즈: 305KB(M2) → 324KB(+M3) → 343KB(+M4) → 347KB(+M5). gzip 93→98→101→102KB.

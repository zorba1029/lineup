# CLAUDE.md ─ 라인이웃(옆집마켓) 프로젝트 컨텍스트

이 파일은 **Claude Code가 세션 시작 시 자동으로 읽는** 프로젝트 안내서다.
이전 Cowork 세션에서 만들어진 산출물을 바탕으로, 코딩에 바로 들어갈 수 있도록 핵심만 정리했다.

## 1. 프로젝트 한 줄

같은 아파트 동·라인(예: 01라인 = 101·201·301·401·501호) 이웃 간 즉시 물품 대여 매칭 모바일 웹.

## 2. 필수 참조 문서 (반드시 먼저 읽기)

1. **`./PLAN.md`** ─ 종합 플랜 v1.1.
   - §0 합의된 의사결정 (MVP 전체재현 / JWT+회원가입 / Polling / (동, 라인) 격리)
   - §1 화면 12개 × 5섹션
   - §2 도메인 엔티티 + 상태 머신
   - §4 MySQL DDL
   - §5 REST API 18개 엔드포인트
   - §9 마일스톤 M1~M6
   - §10 위험요소 (race condition, 72h 만료, 전화번호 노출 시점 등)
2. **`../ideation/hn_sharing/neighbor-borrow-app.html`** ─ 작동하는 1,312줄 프로토타입.
   동작 검증 시 사이드 바이 사이드로 비교.
3. **Cowork artifact `linenb-screen-mockups`** ─ 12개 화면 정적 명세 + React 컴포넌트/API 라벨.

## 3. 기술 스택

| Layer | 의존성 |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind 3, React Router 6, TanStack Query 5, Zustand 4, react-hook-form, zod |
| Backend  | Rust, axum 0.7, sqlx 0.8 (mysql), jsonwebtoken 9, argon2 0.5, tokio, tower-http, validator, dotenvy, tracing |
| DB       | MySQL 8 (Docker) |
| 빌드     | pnpm (FE), cargo (BE) |

## 4. 디렉토리 (현재 = M5 완료, 다음 = M6)

```
impl/
├── PLAN.md / README.md / CLAUDE.md / dev-log.md
├── docker-compose.yml          # mysql + adminer
├── .env.example
├── backend/
│   ├── Cargo.toml / Cargo.lock
│   ├── .env.example
│   ├── migrations/
│   │   └── 0001_init.sql       # users / requests / offers
│   └── src/
│       ├── main.rs             # /healthz + /readyz, AppState, expire task spawn
│       ├── config.rs
│       ├── db.rs               # MySqlPool
│       ├── error.rs            # AppError + IntoResponse
│       ├── auth/               # ✅ M2
│       │   ├── password.rs     # argon2 hash/verify (TDD 3 tests)
│       │   ├── jwt.rs          # Claims + TokenKind, encode/decode (TDD 5 tests)
│       │   └── extractor.rs    # AuthUser FromRequestParts (TDD 7 tests)
│       ├── models/             # ✅ M2~M4
│       │   ├── user.rs         # UserRow + UserPublic
│       │   ├── request.rs      # RequestWithAuthorRow + DTOs (TDD 2 tests)
│       │   └── offer.rs        # OfferWithOffererRow + DTOs (TDD 2 tests)
│       ├── routes/             # ✅ M2~M4 (services/ 미도입 — DB 접근 inline)
│       │   ├── auth.rs         # signup/login/refresh/logout/me
│       │   ├── requests.rs     # CRUD + detail wrapper(offers + count)
│       │   └── offers.rs       # 6 endpoints + accept 트랜잭션
│       ├── tasks/              # ✅ M3
│       │   └── expire.rs       # 60s interval, status='open' → 'expired'
│       └── util/               # ✅ M2~M3
│           ├── line.rs         # "101호" → "01" (TDD 6 tests)
│           └── category.rs     # 6 카테고리 validator (TDD 5 tests)
└── frontend/
    ├── package.json / pnpm-lock.yaml
    ├── vite.config.ts / tailwind.config.ts / tsconfig*.json
    ├── index.html
    └── src/
        ├── main.tsx            # QueryClient + BrowserRouter
        ├── App.tsx             # 7개 라우트, RequireAuth로 보호 라우트 래핑
        ├── styles/index.css    # @tailwind ...
        ├── components/
        │   ├── auth/RequireAuth.tsx           # ✅ M2
        │   ├── layout/{MobileShell,Header}    # ✅ M1/M3
        │   ├── modals/{Confirm,Request,MyOffer}# ✅ M3~M4
        │   ├── post/{PostCard,PostList,FilterChips,Fab,StatusBadge} # ✅ M3
        │   ├── nudge/{NewPostBanner,NudgeBanner}  # ✅ M5
        │   ├── sheets/OfferBottomSheet.tsx    # ✅ M4 (2-step)
        │   └── timer/CountdownTimer.tsx       # ✅ M5 (1초 갱신, 1시간 미만 강조)
        ├── routes/                             # ✅ 7개 모두 구현됨
        ├── features/
        │   ├── auth/{useLogin,useSignup,useMe,useLogout}     # ✅ M2
        │   ├── requests/{useRequests,useRequest,useCreate,useUpdate,useDelete} # ✅ M3
        │   └── offers/{useCreate,useUpdate,useDelete,useAccept,useReject}      # ✅ M4
        └── lib/
            ├── api.ts          # apiFetch + 401 in-flight refresh
            ├── auth.ts         # Zustand persist store
            ├── categories.ts   # CATEGORIES 상수
            ├── confirm.ts      # 전역 confirm slot
            ├── lastSeen.ts     # ✅ M5 — localStorage NewPostBanner용
            ├── nudgePool.ts    # ✅ M5 — 정적 추천 풀 12건
            ├── queryKeys.ts
            ├── time.ts         # formatRelative / formatRemaining
            ├── types.ts        # User, RequestPublic, OfferPublic, ...
            └── validation.ts   # 자체 zodResolver (외부 dep 회피)
```

## 5. 자주 쓰는 명령어

```bash
# 0. env 준비 (1회)
cp .env.example .env
cp .env.example backend/.env

# 1. MySQL 띄우기
docker compose up -d mysql            # http://localhost:3306
docker compose up -d adminer          # http://localhost:8081 (선택)

# 2. 백엔드
cd backend
cargo install sqlx-cli --no-default-features --features mysql   # 1회
sqlx migrate run                                                # 마이그레이션
cargo run                                                       # http://localhost:8080
cargo check                                                     # 빠른 타입체크
cargo clippy --all-targets -- -D warnings                       # 린트
cargo test                                                      # 테스트
cargo sqlx prepare -- --bin linenb-backend                      # 오프라인 SQL 캐시 (CI용)

# 3. 프론트엔드
cd frontend
pnpm install                          # 1회
pnpm dev                              # http://localhost:5173 (axum 8080으로 /api 프록시)
pnpm typecheck
pnpm build                            # dist/ 정적 빌드

# 4. 헬스체크
curl http://localhost:8080/healthz    # → ok
curl http://localhost:8080/readyz     # → ready (DB 연결 정상)
```

## 6. 핵심 컨벤션

### 6.1 백엔드
- 모든 핸들러는 `Result<Json<T>, AppError>` 반환. 에러 변환은 `?` 로 통일.
- DB 접근은 `routes/*.rs`에 inline (services/ 모듈 미도입 — MVP 단순성 우선). 각 라우트 파일이 SQL 베이스 상수(`SELECT_BASE`)와 `fetch_one` 헬퍼 보유. 너무 커지면 그때 services/로 추출.
- 트랜잭션이 필요한 곳(특히 `POST /offers/:id/accept`):
  ```rust
  let mut tx = state.db.begin().await?;
  // SELECT ... FOR UPDATE
  // UPDATE 다른 pending → rejected
  // UPDATE 이 offer → accepted
  // UPDATE request → matched
  tx.commit().await?;
  ```
- **권한 격리는 모든 쿼리에 강제**: `JOIN users u ON u.id = r.user_id WHERE u.dong = ? AND u.line_no = ?`
- JWT 클레임: `{ user_id, dong, line_no, exp }`. axum extractor `AuthUser`로 한 줄에 끝냄.
- `unit` 끝 두 자리에서 `line_no` 파싱: `util::line::extract("101호") → "01"`. 가입/수정 시 적용.

### 6.2 프론트엔드
- 모든 서버 상태는 TanStack Query. 클라이언트 상태(폼·모달·토큰)는 Zustand 또는 useState.
- API 호출은 `lib/api.ts` 한 곳을 거침 (JWT 자동 주입 + 401 → refresh).
- 폼은 react-hook-form + zod 스키마 검증.
- 모바일 퍼스트. `MobileShell`이 480px 폭 강제. 새 페이지는 `<MobileShell>` 내부에 들어감 (이미 App.tsx에서 감쌈).
- Tailwind 디자인 토큰은 `tailwind.config.ts`에 정의 ─ `bg-primary`, `text-sub`, `border-border`, `rounded-lnb`, `max-w-mobile` 등 사용.
- 새 모달/시트는 `components/modals` 또는 `components/sheets`에 추가.

### 6.3 공통
- TypeScript/Rust 모두 strict. `any` / `unwrap()` 지양.
- 한글 UI 텍스트는 컴포넌트 안에 인라인 ─ M6 전까지 i18n 도입 X.
- 시간 포맷: 서버는 ISO 8601 UTC, 프론트가 dayjs/date-fns로 "방금 전/N분 전" 변환.

## 7. 위험 포인트 (PLAN.md §10 요약)

| 위험 | 한 줄 대응 |
|---|---|
| 동시 accept race | `BEGIN; SELECT ... FOR UPDATE` 후 status 검증 |
| (request, user) 활성 offer 중복 | 등록 핸들러에서 `status='pending'` 행 1건만 허용 (애플리케이션 레벨) |
| 72h 만료 누락 | tokio::interval 60s 백그라운드 task + 조회 시 lazy 검사 |
| 전화번호 노출 | `status='matched'` 일 때만 응답 직렬화에 포함 |
| 이웃 격리 우회 | 모든 쿼리 `WHERE u.dong = ? AND u.line_no = ?` 강제 |
| 모바일 100vh 버그 | `min-h-dvh` + safe-area-inset (이미 적용) |

## 8. 다음 작업 ─ M6 마감 (예상 2일)

PLAN.md §9 M6:

### 백엔드
1. **시드 데이터** — `migrations/0002_seed.sql` 또는 `bin/seed.rs`. 사용자 4명(101동 01라인 hong/kim/lee/park) + 카테고리별 샘플 글 3~5건. 비밀번호는 argon2 미리 해시한 값 박아두거나 시드 바이너리에서 동적 생성.
2. **`#[sqlx::test]` 통합 테스트** (보류 task #6) — signup→login→me 라운드트립, 중복 username 409, request CRUD 격리, offer accept 트랜잭션 동시성. CI에서 MySQL service container로 실행.
3. **운영 Dockerfile** — multi-stage build, distroless 또는 `gcr.io/distroless/cc-debian12` 베이스. `cargo sqlx prepare`로 오프라인 SQL 캐시 후 빌드.

### 프론트엔드
1. **운영 Dockerfile** — `pnpm build` → `dist/` → nginx static. SPA fallback (`try_files $uri /index.html`).
2. **toast/snackbar** (옵션) — 현재는 인라인 에러만. polish.

### 인프라
1. **GitHub Actions CI** — `.github/workflows/ci.yml`:
   - BE: `cargo fmt --check`, `cargo clippy -D warnings`, `cargo test`(MySQL service)
   - FE: `pnpm typecheck`, `pnpm build`
   - PR + main push 트리거
2. **README 마감** — 배포 절차, env 변수 정리, 데모 URL/스크린샷 (있으면).

### 워크플로
M5부터 적용된 패턴 유지: `feat/m6-final` branch → 검증 → `--no-ff` merge.

## 10. 메모

- 카테고리 enum은 한글 그대로 DB에 저장: `공구 | 주방 | 오락 | 전자기기 | 가전 | 기타`. 프론트와 백 모두 동일 상수 (FE: `src/lib/categories.ts`, BE: `src/models/category.rs`).
- request `status` 가능값: `open | matched | expired | cancelled`.
- offer `status` 가능값: `pending | accepted | rejected | cancelled`.
- 본인 글에는 offer 불가 ─ 서버에서 강제 + UI에서 버튼 숨김 (이중 가드).
- 단일 단지 + (동, 라인) 격리만 ─ 다단지 멀티테넌시는 v2.

---

이 컨텍스트를 바탕으로 곧장 M6 작업에 들어갈 수 있다. 막히면 PLAN.md의 해당 절을 펴고, 진행 흐름 복기는 `dev-log.md`를 참조.

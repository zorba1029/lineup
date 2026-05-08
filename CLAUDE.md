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

## 4. 디렉토리 (현재 = M6 완료 + post-M6 폴리시, 다음 phase = AWS 배포)

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
│   ├── tests/                  # ✅ M6 — #[sqlx::test] 통합 테스트
│   │   ├── common/mod.rs       # test_app, call, signup_default 헬퍼
│   │   └── {auth,requests,offers}_flow.rs    # 12 tests (accept 동시성 포함)
│   └── src/
│       ├── lib.rs              # ✅ M6 — build_app(state, cors) 바이너리·테스트 공유
│       ├── main.rs             # 진입점 (lib::build_app 호출)
│       ├── bin/seed.rs         # ✅ M6 — cargo run --bin seed (멱등, --reset 옵션)
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
        │   ├── post/{PostCard,PostList,FilterTabs,Fab,StatusBadge} # ✅ M3 + post-M6 폴리시
        │   │   # PostCard: 좌측 status bar / 상단 pill / 응답 카운트 칩 / blinking urgent dot
        │   │   # FilterTabs: 'all'/'mine'/'lent' 3-tab segmented (이전 FilterChips 토글에서 교체)
        │   ├── nudge/{NewPostBanner,NudgeBanner}  # ✅ M5 + post-M6 (NudgeBanner prototype 톤 재디자인)
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

### 6.4 Post-M6 폴리시 결정 (브라우저 데모 후)
- **카테고리 칩 단일 톤**: 6색 분기 → 모두 `bg-primary-light` + `text-primary`. 인지 부담 ↓.
- **`pending_offer_count` 위치**: list/detail 공통 필드로 `RequestPublic`에 통합. `DetailResponse`에서 제거. SQL은 correlated subquery (N+1 회피).
- **`lent` 필터 의미**: `pending` + `accepted` 모두 포함 (요청자 수락 전 응답도 보여야 함). `cancelled`/`rejected`는 제외.
- **메인 필터는 3-tab segmented control** (`'all' | 'mine' | 'lent'` 상호 배타). 이전 두 개 독립 토글에서 교체.
- **PostCard 상태 indicator**: 좌측 세로 6px bar + 상단 pill 라벨 + 상단 응답 카운트. 메타 row(카테고리/급해요/시간/위치)는 정보용으로 분리.
- **MobileShell 배경**을 `bg-bg`로 설정해 카드/헤더의 `bg-card`(흰색)가 떠보이게.
- **prototype 디자인 톤 존중** — 폰트/padding/줄 간격은 prototype 값(11-15px / 3-9px / 3-7px) 기반.

## 7. 위험 포인트 (PLAN.md §10 요약)

| 위험 | 한 줄 대응 |
|---|---|
| 동시 accept race | `BEGIN; SELECT ... FOR UPDATE` 후 status 검증 |
| (request, user) 활성 offer 중복 | 등록 핸들러에서 `status='pending'` 행 1건만 허용 (애플리케이션 레벨) |
| 72h 만료 누락 | tokio::interval 60s 백그라운드 task + 조회 시 lazy 검사 |
| 전화번호 노출 | `status='matched'` 일 때만 응답 직렬화에 포함 |
| 이웃 격리 우회 | 모든 쿼리 `WHERE u.dong = ? AND u.line_no = ?` 강제 |
| 모바일 100vh 버그 | `min-h-dvh` + safe-area-inset (이미 적용) |

## 8. 다음 phase ─ AWS PoC 배포 (M6 이후)

로컬은 M6에서 모두 완료 (seed + 통합 테스트 12개 + README). 다음은 AWS에 올려 팀 데모.

### 사용자 결정 (이미 확정)
- **FE**: S3 + CloudFront + Route53 alias
- **BE**: EC2 1대에 raw `cargo build --release` + systemd (Docker 미사용)
- **DB**: AWS RDS MySQL
- **DNS**: Route53 (custom 도메인 사용)
- **HTTPS**: ACM 인증서 (CloudFront에 적용) + EC2는 nginx/caddy + Let's Encrypt 또는 ALB+ACM (TBD)

### 작업 항목 (예상 0.5~1일)
1. **도메인 등록 / Route53 호스팅 영역 생성**
2. **FE 배포**: `pnpm build` → S3 sync, CloudFront distribution + 404→index.html 매핑(SPA fallback), Route53 A 레코드(alias)
3. **EC2 셋업**: t3.small 정도, security group(80/443/22), Rust 빌드 + systemd unit (`linenb-backend.service`), nginx reverse proxy + certbot
4. **RDS 셋업**: db.t4g.micro, security group(EC2에서 3306만), `sqlx migrate run` + `cargo run --bin seed`
5. **env 정리**: BE `.env`(또는 systemd `Environment=`)에 RDS DATABASE_URL, 강한 JWT_SECRET, 운영 도메인의 CORS_ORIGIN
6. **검증**: 모바일에서 도메인 접속 → 가입/로그인/거래 라운드트립

### 워크플로
M5에서 확립된 branch+PR 흐름 유지: `feat/aws-deploy` 또는 `feat/m7-deploy` branch → push → PR 생성 (`gh pr create`) → 사용자가 GitHub UI에서 머지.

## 10. 메모

- 카테고리 enum은 한글 그대로 DB에 저장: `공구 | 주방 | 오락 | 전자기기 | 가전 | 기타`. 프론트와 백 모두 동일 상수 (FE: `src/lib/categories.ts`, BE: `src/models/category.rs`).
- request `status` 가능값: `open | matched | expired | cancelled`.
- offer `status` 가능값: `pending | accepted | rejected | cancelled`.
- 본인 글에는 offer 불가 ─ 서버에서 강제 + UI에서 버튼 숨김 (이중 가드).
- 단일 단지 + (동, 라인) 격리만 ─ 다단지 멀티테넌시는 v2.

---

이 컨텍스트를 바탕으로 곧장 AWS 배포 phase에 들어갈 수 있다. 막히면 PLAN.md의 해당 절을 펴고, 진행 흐름 복기는 `dev-log.md`를 참조.

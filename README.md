# 라인이웃 (옆집마켓)

같은 아파트 동·라인 이웃 간 즉시 물품 대여 매칭 모바일 웹 서비스.
72시간 카운트다운, 2-step 빌려주기 시트, 거래 성사 시점에만 전화번호 공개, (동, 라인) 격리.

- 종합 플랜: [`PLAN.md`](./PLAN.md)
- 진행 기록: [`dev-log.md`](./dev-log.md)
- 협업 컨텍스트(Claude Code): [`CLAUDE.md`](./CLAUDE.md)
- Repo: https://github.com/zorba1029/lineup

## 기술 스택

| Layer | Stack |
|---|---|
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS · React Router 6 · TanStack Query 5 · Zustand · react-hook-form + zod |
| Backend  | Rust · axum 0.7 · sqlx 0.8 · jsonwebtoken · argon2 · tokio |
| DB       | MySQL 8 |

## 빠른 시작

전제: Docker, Rust (`cargo` ≥ 1.75), Node.js (≥ 20) + pnpm.

```bash
# 0. env 준비 (한 번만)
cp .env.example .env
cp .env.example backend/.env

# 1. MySQL 기동 + 스키마 적용
docker compose up -d mysql
# (옵션) Adminer GUI: docker compose up -d adminer  → http://localhost:8081

cd backend
cargo install sqlx-cli --no-default-features --features mysql   # 1회만
sqlx migrate run

# 2. (선택) 시드 데이터 — 데모용 사용자 4명 + 카테고리별 글 5건 + offer 2건
cargo run --bin seed                                            # 멱등: hong 존재 시 스킵
# cargo run --bin seed -- --reset                               # 모든 데이터 지우고 재시드

# 3. 백엔드 기동
cargo run                                                       # http://localhost:8080

# 4. 프론트 기동 (별도 터미널)
cd ../frontend
pnpm install                                                    # 1회만
pnpm dev                                                        # http://localhost:5173
```

확인:

```bash
curl http://localhost:8080/healthz   # → ok
curl http://localhost:8080/readyz    # → ready (DB 연결 정상)
```

브라우저에서 http://localhost:5173 접속 → 로그인 (시드 계정 사용 시 hong/1234 등).

## 시드 계정

`cargo run --bin seed` 실행 후 사용 가능:

| username | 이름 | 호수 | 비밀번호 |
|---|---|---|---|
| hong | 홍길동 | 101동 101호 | 1234 |
| kim  | 김민수 | 101동 201호 | 1234 |
| lee  | 이지영 | 101동 301호 | 1234 |
| park | 박서준 | 101동 401호 | 1234 |

모두 같은 라인(101동 01라인)이라 서로의 글이 보이며, hong의 드릴 글에 kim·lee의 pending offer가 미리 등록되어 있어 로그인 직후 `accept` 플로우 데모 가능.

## 환경 변수 (`.env.example` 참조)

| 변수 | 기본값 | 설명 |
|---|---|---|
| `DATABASE_URL` | `mysql://linenb:dev@localhost:3306/linenb` | sqlx 연결 문자열. 통합 테스트엔 root 계정 필요 (`mysql://root:dev@localhost:3306/linenb`). |
| `JWT_SECRET` | `replace-me-...` | HS256 서명용. **운영에선 32바이트 이상 랜덤값으로 교체 필수.** |
| `JWT_ACCESS_TTL_SEC` | `900` (15분) | access 토큰 만료. |
| `JWT_REFRESH_TTL_SEC` | `2592000` (30일) | refresh 토큰 만료. |
| `BIND_ADDR` | `0.0.0.0:8080` | axum 바인딩. |
| `CORS_ORIGIN` | `http://localhost:5173` | 운영 도메인으로 교체. |

프론트엔드는 `VITE_API_BASE` (`http://localhost:8080/api/v1` 기본) 사용. vite dev 서버는 `/api`를 axum으로 프록시.

## 테스트

```bash
cd backend

# 단위 테스트 (DB 불필요): 30개 — primitive 모듈 TDD
cargo test --lib

# 통합 테스트 (MySQL root 권한 필요 — sqlx::test가 per-test DB 생성)
DATABASE_URL=mysql://root:dev@localhost:3306/linenb cargo test --tests
# → auth_flow 5 / requests_flow 3 / offers_flow 4 = 12개
# 핵심: offers_flow::concurrent_accept_only_one_succeeds — accept 트랜잭션 동시성

# 전체
DATABASE_URL=mysql://root:dev@localhost:3306/linenb cargo test
# → 42 passed (단위 30 + 통합 12)

# 린트
cargo clippy --all-targets -- -D warnings
```

프론트엔드:

```bash
cd frontend
pnpm typecheck   # tsc --noEmit
pnpm build       # 프로덕션 빌드 (dist/)
```

## 디렉토리

```
impl/
├── PLAN.md / CLAUDE.md / dev-log.md / README.md
├── docker-compose.yml          # MySQL 8 + Adminer
├── .env.example
├── backend/                    # Rust + axum
│   ├── Cargo.toml / Cargo.lock
│   ├── migrations/0001_init.sql
│   ├── src/
│   │   ├── lib.rs              # build_app(state, cors_origin) — 바이너리·테스트 공유
│   │   ├── main.rs             # 진입점
│   │   ├── bin/seed.rs         # cargo run --bin seed
│   │   ├── auth/{password,jwt,extractor}.rs
│   │   ├── models/{user,request,offer}.rs
│   │   ├── routes/{auth,requests,offers}.rs
│   │   ├── tasks/expire.rs     # 60s interval 만료 처리
│   │   └── util/{line,category}.rs
│   └── tests/                  # #[sqlx::test] 통합 테스트
│       ├── common/mod.rs
│       └── {auth,requests,offers}_flow.rs
└── frontend/                   # React + TS + Tailwind
    ├── package.json / pnpm-lock.yaml
    └── src/
        ├── main.tsx / App.tsx
        ├── components/{auth,layout,modals,nudge,post,sheets,timer}/
        ├── routes/             # 7개 페이지
        ├── features/{auth,requests,offers}/   # TanStack Query 훅
        └── lib/                # api / auth / categories / time / 등
```

## 마일스톤 진행

- [x] **M1** Skeleton — `/healthz`, `/readyz`, 7개 빈 페이지, 라우터, MySQL 마이그레이션
- [x] **M2** Auth — argon2/JWT/AuthUser extractor, signup/login/refresh/logout/me, 라우트 가드 (TDD 21 tests)
- [x] **M3** 게시글 CRUD + 메인 화면 — `/api/v1/requests/*` 5엔드포인트, (dong, line_no) 격리, 72h 만료 백그라운드 task, MainPage + RequestDetailPage
- [x] **M4** Offer 플로우 — `/api/v1/{requests/:id/offers, offers/*}` 6엔드포인트 + accept 트랜잭션, OfferBottomSheet(2-step), MyOfferModal, MatchedPage(양 당사자 phone 노출)
- [x] **M5** Polling / 1초 카운트다운 / NewPostBanner / NudgeBanner — TanStack `refetchInterval`(메인 5s, 상세 1s + status 의존 자동 중단), lastSeen localStorage 기반 derived 카운트, 정적 풀 + RequestModal 프리필
- [x] **M6** 로컬 마감 — seed 바이너리 (멱등), `#[sqlx::test]` 통합 테스트 (accept 동시성 포함), README 정리
- [x] **Post-M6 폴리시** — PostCard 시각 정리(좌측 status bar / 상단 pill / blink dot / 카테고리 통일), `pending_offer_count` list/detail 통합, `lent` 필터 확장(pending 포함), 3-tab segmented filter, NudgeBanner prototype 톤, ParticipantBadge

다음 phase: **AWS PoC 배포** — CloudFront + S3 (FE), EC2 + RDS (BE/DB), Route53 (DNS).

검증 현황: `cargo test` **46/46** (단위 31 + 통합 15) · `cargo clippy --all-targets -- -D warnings` clean · `pnpm typecheck` / `pnpm build` clean (gzip ~103KB).

# 라인이웃 (옆집마켓) – 구현

같은 아파트 동·라인 이웃 간 즉시 물품 대여 매칭 모바일 웹 서비스.

- **기획·아키텍처**: [`PLAN.md`](./PLAN.md)
- **화면 명세 (mockup)**: Cowork artifact `linenb-screen-mockups` (12개 화면)
- **Claude Code 세션 컨텍스트**: [`CLAUDE.md`](./CLAUDE.md)

## 기술 스택

| Layer | Stack |
|---|---|
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS · React Router 6 · TanStack Query 5 · Zustand |
| Backend  | Rust · axum 0.7 · sqlx 0.8 · jsonwebtoken · argon2 · tokio |
| DB       | MySQL 8 |

## 빠른 시작

전제: Docker, Rust(`cargo` ≥ 1.75), Node.js(≥ 20) + pnpm 설치.

```bash
# 0. env 준비
cp .env.example .env
cp .env.example backend/.env

# 1. MySQL 띄우기
docker compose up -d mysql
# (옵션) Adminer GUI: http://localhost:8081

# 2. 백엔드 마이그레이션 + 기동
cd backend
cargo install sqlx-cli --no-default-features --features mysql   # 1회
sqlx migrate run                                                # 0001_init.sql 적용
cargo run                                                       # http://localhost:8080

# 3. 프론트 기동 (별도 터미널)
cd frontend
pnpm install
pnpm dev                                                        # http://localhost:5173
```

확인:

```bash
curl http://localhost:8080/healthz   # → ok
curl http://localhost:8080/readyz    # → ready (DB 연결 정상)
```

## 디렉토리

```
impl/
├── PLAN.md            # 종합 플랜 (도메인·DDL·API·마일스톤)
├── CLAUDE.md          # Claude Code 세션 컨텍스트
├── README.md          # 본 파일
├── docker-compose.yml # MySQL + Adminer
├── .env.example
├── backend/           # Rust + axum
└── frontend/          # React + TS + Tailwind
```

## 마일스톤 진행

- [x] **M1** Skeleton — `/healthz`, `/readyz`, 7개 빈 페이지, 라우터, MySQL 마이그레이션
- [x] **M2** Auth — argon2/JWT/AuthUser extractor, signup/login/refresh/logout/me, 라우트 가드 (TDD 21 tests)
- [x] **M3** 게시글 CRUD + 메인 화면 — `/api/v1/requests/*` 5엔드포인트, (dong, line_no) 격리, 72h 만료 백그라운드 task, MainPage(Header/FilterChips/Fab) + RequestDetailPage
- [x] **M4** Offer 플로우 — `/api/v1/{requests/:id/offers, offers/*}` 6엔드포인트 + accept 트랜잭션, OfferBottomSheet(2-step), MyOfferModal, MatchedPage(양 당사자 phone 노출), OfferRegisteredPage
- [ ] **M5** Polling, 1초 카운트다운, NewPostBanner, NudgeBanner
- [ ] **M6** 마감 (시드, 운영 Dockerfile, GitHub Actions CI, README 정리)

진행 기록은 [`dev-log.md`](./dev-log.md), 종합 플랜은 [`PLAN.md`](./PLAN.md) §9 참조.

검증 현황: `cargo test` 30/30 / `cargo clippy -D warnings` clean / `pnpm typecheck` & `pnpm build` clean.

## Repository

https://github.com/zorba1029/lineup.git

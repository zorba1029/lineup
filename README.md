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
- [ ] **M2** Auth — JWT, signup/login/refresh/me, 라우트 가드
- [ ] **M3** 게시글 CRUD + 메인 화면
- [ ] **M4** Offer 플로우 (2-step sheet, accept 트랜잭션, 매칭 화면)
- [ ] **M5** Polling, 카운트다운, 새 글 배너
- [ ] **M6** 마감 (시드, 운영 Dockerfile, CI, README 정리)

자세한 내용은 `PLAN.md` §9 참조.

git repository (public)
https://github.com/zorba1029/lineup.git

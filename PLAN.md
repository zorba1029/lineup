# 라인이웃(옆집마켓) – 개발 플랜 v1.2

> 같은 아파트 동(棟)·라인(예: 01라인 = 101·201·301·401·501호) 이웃 간 즉시 물품 대여 매칭 모바일 웹 서비스.
> Source: `ideation/hn_sharing/neighbor-borrow-service.md`(기획서) + `ideation/hn_sharing/neighbor-borrow-app.html`(작동하는 프로토타입, 1,312줄).
> 화면 mockup: Cowork artifact `linenb-screen-mockups` (12개 화면, 5개 섹션).
>
> **v1.2 변경점** (M6 + post-M6 폴리시 후 사용자·기획자 결정 반영):
> - §1.B 메인 필터: 「독립 토글 칩 2개」 → 「**3-tab segmented control** (전체 / 내 글 보기 / 내가 빌려준 글)」, 상호 배타적.
> - §1.B Nudge 배너: 「자동 request 등록」 → 「**RequestModal 프리필** 모달 (사용자 확인 후 등록)」.
> - §5.2 `GET /requests?lent=true` 의미 명시: 「내가 빌려주겠다고 응답한 글 — `pending` + `accepted` 둘 다, `cancelled`/`rejected` 제외」.
> - §5.2 `GET /requests/:id` 응답 shape 명시: `{request, offers}` wrapper. `pending_offer_count`는 `request` 내부에 통합 (list/detail 공통 필드).
> - §5.2 `GET /requests` 응답 shape: `{items: RequestPublic[]}`. `RequestPublic`에 `pending_offer_count` 포함 (메인 카드의 "N명 응답" 칩 표시용).
>
> **v1.1 변경점**: §1 화면 표를 9 → 12개로 확장하고 5개 섹션(A 인증 / B 메인 / C 상세 / D Offer / E 매칭&공통)으로 그룹핑. 신규 화면 3개(`/signup`, MyOfferModal, ConfirmModal) 추가. §6.3 컴포넌트 매핑 갱신.

---

## 0. 합의된 의사결정 (요약)

| 항목 | 결정 | 비고 |
|---|---|---|
| MVP 범위 | **프로토타입 전체 재현** | 72h 타이머, 2-step offer sheet, 수락/거절, 새 글 배너, 필터까지 모두 |
| 인증 | **JWT + 회원가입** | bcrypt/argon2, access + refresh 토큰 |
| 실시간성 | **Polling** | 5~10초 간격 `GET /requests?since=...`, `GET /offers?since=...` |
| 데이터 격리 | **단일 단지, (동, 라인)으로 격리** | `dong`, `line_no` 컬럼만 추가, 단지 개념은 환경설정 한 줄 |
| FE 스택 | React 18 + TypeScript + Vite + Tailwind + React Router + TanStack Query + Zustand | |
| BE 스택 | Rust + axum + sqlx(MySQL) + jsonwebtoken + argon2 + tokio | |
| DB | MySQL 8 | sqlx-cli 마이그레이션 |

---

## 1. 프로토타입 분석 ─ 화면

프로토타입은 SPA 한 파일에 5개 "screen" 상태로 렌더된다. React 라우팅으로 옮기면 12개 화면이 되고, 마일스톤과 정렬되도록 5개 섹션으로 묶인다. 번호는 mockup artifact `linenb-screen-mockups`와 일치.

### A. 인증 (M2)

| # | 화면 | Path / 형태 | 주요 요소 |
|---|---|---|---|
| 01 | 로그인 | `/login` | 아이디/비번. 실패 시 인라인 에러. 「회원가입」 링크 |
| 02 | 회원가입 *(신규)* | `/signup` | 아이디/비번/비번확인/이름/동/호수/전화번호. 서버가 `unit("101호") → line_no("01")` 자동 추출. 200 시 access/refresh JWT 즉시 발급 → `/`로 |

### B. 메인 & 게시글 (M3)

| # | 화면 | Path / 형태 | 주요 요소 |
|---|---|---|---|
| 03 | 메인 | `/` | 헤더(로고 + `dong unit · name`), 새 글 배너(미열람 N건), nudge 배너(랜덤 AVAILABLE 1건), **필터 3-tab** (`전체` / `내 글 보기` / `내가 빌려준 글`, 상호 배타, default `전체`), 게시글 카드 리스트, FAB(＋) |
| 04 | FAB 요청 모달 | 모달 (메인 위) | 물건 이름, 설명, 긴급 토글 → `POST /requests` → 작성자 상세(05)로 이동 |

### C. 게시글 상세 (M3 후반)

| # | 화면 | Path / 형태 | 주요 요소 |
|---|---|---|---|
| 05 | 상세 (작성자 뷰) | `/requests/:id` 본인 | 아이템명·설명 편집(80자), 긴급 토글, 제출된 offer 리스트(수락/거절), 72h 카운트다운, 게시글 삭제 |
| 06 | 상세 (이웃 뷰) | `/requests/:id` 이웃 | 게시글 정보 read-only, 「빌려주기」(신규) 또는 「내 요청 정보 보기」(이미 offer 한 경우) |

### D. Offer 플로우 (M4)

| # | 화면 | Path / 형태 | 주요 요소 |
|---|---|---|---|
| 07 | 빌려주기 시트 · Step 1 | 모달 (상세 위) | 대여시간/반납시간 프리셋 칩 4×4. 미입력 시 토스트 |
| 08 | 빌려주기 시트 · Step 2 | 모달 | 대여장소/반납장소 텍스트. 신규 등록 + 수정 동일 UI(`editingOfferId`로 분기) |
| 09 | 내 요청 정보 모달 *(신규)* | 모달 | 이미 offer 한 이웃이 자기 active offer 확인. 「수정하기」 → step 1로, 「요청 취소」 → confirm(11) → `DELETE /offers/:id` |
| 10 | 빌려주기 등록 완료 | `/offers/registered` | 등록 정보 카드. 1회용 화면 — URL 직접 접근 시 `/` redirect. 「확인」 → 메인 |

### E. 거래 성사 & 공통 (M4 후반)

| # | 화면 | Path / 형태 | 주요 요소 |
|---|---|---|---|
| 11 | 공통 confirm 모달 *(신규)* | 모달 (가운데 팝업) | 모든 위험 액션 공유: 게시글 삭제, offer 수락/거절, 내 offer 취소. 전역 store `{ message, onConfirm }` 단일 슬롯, `openConfirm(msg, cb)` 한 줄로 호출 |
| 12 | 거래 성사 | `/matched` | 🎉 메시지, 물건/내정보/이웃정보(연락처)/시간/장소 카드. 「닫기」 → 메인. ⚠ 전화번호 노출은 `status='matched'`일 때만 |

핵심 인터랙션 5가지를 빠뜨리면 안 된다:

1. **72시간 카운트다운** ─ `formatCountdown(startTime)`, 1초 간격 갱신, 1시간 미만 시 `urgent` 강조 클래스. 만료 시 게시글 status = `expired`.
2. **새 글 배너** ─ 로그인 시점 기준 미열람 request 수를 표시. 닫기 → 세션 동안 비표시.
3. **Nudge 배너** ─ 본인 외 AVAILABLE 풀에서 랜덤 1건. 클릭 시 RequestModal이 해당 아이템으로 **프리필된 채 열림** (사용자 확인 후 등록). 잘못 누름 방지 + 같은 라인 이웃 모두에게 알림이 가는 구조라 신중성 우선.
4. **2-step bottom sheet** ─ next/prev 시 `anim-next`/`anim-prev` CSS 애니메이션. 신규 등록과 기존 offer 수정 시 동일 UI 재사용 (`editingOfferId`).
5. **수락/거절 토글** ─ 작성자가 한 offer를 accept하면 상대 정보 + 약속이 `matched` 화면에 즉시 표출. 거절 offer는 리스트에서 사라짐(`status = rejected`).

---

## 2. 프로토타입 분석 ─ 도메인 엔티티 & 상태

### 2.1 User
프로토타입의 USERS 배열:
```js
{ id: 'hong', pw: '1234', name: '홍길동', unit: '101호', dong: '101동', phone: '010-...' }
```
서비스화하며 추가:
- `email` (로그인 식별자, 또는 `id`를 그대로 username으로 유지)
- `password_hash` (argon2)
- `line_no` ─ unit 끝 두 자리에서 파생 (`101호 → "01"`). DB에 명시적으로 저장(쿼리 단순화).

### 2.2 Request (= 빌리고 싶다는 게시글)
```js
{
  id, name, cat, requester, unit, userId, desc,
  urgent, status, time, phone, startTime,
  offers: [...]
}
```
정규화:
- `requester`, `unit`, `phone` → `user_id` FK로 통합 (응답 시 join).
- `status` 가능값: `open` | `matched` | `expired` | `cancelled`
- `time` 표시 문자열은 서버에서 내려주지 않음 ─ FE가 `created_at` 기준으로 "방금 전/N분 전/..." 포맷.
- `cat` 카테고리는 enum: `공구 | 주방 | 오락 | 전자기기 | 가전 | 기타`. (프로토타입에 `가전` 케이스 발견됨.)

### 2.3 Offer (빌려드릴게요)
```js
{ offerId, userId, userName, unit, phone,
  rentalTime, returnTime, rentalPlace, returnPlace, status }
```
정규화:
- `userName`, `unit`, `phone` → `user_id` FK 후 join.
- `status` 가능값: `pending` | `accepted` | `rejected` | `cancelled`
- 같은 (request_id, user_id)에 active offer 1건만 허용 (UNIQUE INDEX with partial 조건은 MySQL에서 제한적이므로 애플리케이션에서 보장 또는 status='cancelled'/'rejected' 행은 별도 처리).

### 2.4 핵심 비즈니스 규칙
1. 같은 `(dong, line_no)` 의 사용자만 서로의 request/offer를 본다.
2. request `start_time + 72h` 경과 시 status=`expired`, 신규 offer 불가.
3. 본인 request에는 offer 등록 불가 (서버에서 강제 + UI에서 숨김).
4. accepted offer 발생 시 동일 request의 다른 pending offer는 자동 `rejected` 처리 (프로토타입 동작은 명시적이지 않으나 UX상 자연스러움 ─ MVP에 포함, 트랜잭션으로 처리).
5. request 작성자가 게시글을 삭제하면 모든 하위 offer는 cascade.
6. 사용자는 자기 offer를 수정하거나 취소할 수 있다 (status가 pending인 동안만).

### 2.5 상태 머신

```
Request:   open ─(accept offer)→ matched
              ├─(72h)→ expired
              └─(작성자 삭제)→ cancelled

Offer:     pending ─(작성자 accept)→ accepted
                  ├─(작성자 reject)→ rejected
                  ├─(같은 request 내 다른 offer accepted)→ rejected (자동)
                  └─(이웃 본인 취소)→ cancelled
```

---

## 3. 카테고리·시드 데이터

기획서 §6 + 프로토타입 데이터 통합:

| 카테고리 | 예시 |
|---|---|
| 공구 | 드릴, 망치, 사다리, 렌치, 드라이버 |
| 주방 | 케이크 틀, 핸드믹서, 보관 용기 |
| 오락 | 보드게임, 콘솔, 캠핑 장비 |
| 전자기기 | 삼각대, 보조배터리, 스피커 |
| 가전 | 청소 스팀기 등 (프로토타입에 등장) |
| 기타 | 박스, 카트, 우산 |

시드: `users` 4명(hong/kim/lee/park, 모두 `101동` `01라인`), 샘플 request 3건, 샘플 AVAILABLE 5건은 프론트 nudge 풀로만 사용(별도 DB 테이블 없이 정적 JSON이어도 무방).

---

## 4. 데이터베이스 스키마 (MySQL DDL 초안)

```sql
-- 0001_init.sql
CREATE TABLE users (
  id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  username        VARCHAR(40)  NOT NULL UNIQUE,
  email           VARCHAR(120) NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  name            VARCHAR(40)  NOT NULL,
  dong            VARCHAR(10)  NOT NULL,           -- "101동"
  unit            VARCHAR(10)  NOT NULL,           -- "101호"
  line_no         VARCHAR(4)   NOT NULL,           -- "01"  (unit의 끝 두 자리)
  phone           VARCHAR(20)  NOT NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_line (dong, line_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE requests (
  id            BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  name          VARCHAR(80)  NOT NULL,
  category      VARCHAR(20)  NOT NULL,             -- 공구|주방|오락|전자기기|가전|기타
  description   VARCHAR(200) NOT NULL,
  urgent        TINYINT(1)   NOT NULL DEFAULT 0,
  status        VARCHAR(20)  NOT NULL DEFAULT 'open',  -- open|matched|expired|cancelled
  start_time    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at    DATETIME     NOT NULL,             -- start_time + 72h, 인덱싱·만료 처리용
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_req_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_req_status (status, expires_at),
  INDEX idx_req_user (user_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE offers (
  id            BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  request_id    BIGINT UNSIGNED NOT NULL,
  user_id       BIGINT UNSIGNED NOT NULL,
  rental_time   VARCHAR(20)  NOT NULL,             -- "5분 후" / "10:00" 등 자유문자열
  return_time   VARCHAR(20)  NOT NULL,
  rental_place  VARCHAR(60)  NOT NULL,
  return_place  VARCHAR(60)  NOT NULL,
  status        VARCHAR(20)  NOT NULL DEFAULT 'pending',  -- pending|accepted|rejected|cancelled
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_off_req  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_off_user FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  INDEX idx_off_req_status (request_id, status),
  INDEX idx_off_user (user_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- "한 (request, user) 당 active offer 1건" 보장:
--  · pending/accepted 만 활성으로 보고
--  · 트랜잭션 내 SELECT … FOR UPDATE 로 race 방지
--  · 추가 컬럼 active_key 등으로 partial unique 흉내내는 것은 v2.
```

선택적 추가 테이블 (확장 로드맵용, MVP 미포함):
- `notifications` (push token, in-app feed)
- `reviews` (거래 후기)
- `chat_messages` (라인 채팅)

---

## 5. REST API 설계

베이스: `/api/v1`. 모든 mutating 엔드포인트는 `Authorization: Bearer <jwt>` 필요.

### 5.1 Auth

| Method | Path | Body | 응답 |
|---|---|---|---|
| POST | `/auth/signup` | `{username, password, name, dong, unit, phone}` | `{user, accessToken, refreshToken}` |
| POST | `/auth/login` | `{username, password}` | `{user, accessToken, refreshToken}` |
| POST | `/auth/refresh` | `{refreshToken}` | `{accessToken}` |
| POST | `/auth/logout` | — | 204 |
| GET  | `/auth/me` | — | `{user}` |

`line_no`는 가입 시 `unit`에서 서버가 추출 (정규식 `(\d{2})호$`), 응답에 포함.

### 5.2 Requests (게시글)

| Method | Path | Query / Body | 응답 / 권한 |
|---|---|---|---|
| GET    | `/requests` | `?mine=bool&lent=bool&since=ISO8601` | `{items: RequestPublic[]}`. 같은 (dong, line_no) 글. `since` 이후 변경분만. **세 필터는 상호 배타적**: `mine=true`는 작성자 = 본인, `lent=true`는 본인이 등록한 `pending`/`accepted` offer가 있는 글 (cancelled/rejected 제외). 둘 다 false면 전체. |
| POST   | `/requests` | `{name, category, description, urgent}` | 201 + `RequestPublic`. 작성자=본인. 서버가 `start_time=now`, `expires_at=now+72h`, `status=open` 설정. |
| GET    | `/requests/:id` | — | `{request: RequestPublic, offers: OfferPublic[]}`. 같은 라인이면 누구나. offers는 작성자에겐 모든 offer (cancelled 제외), 이웃에겐 자기 것만. **`pending_offer_count`는 `request` 내부 필드**(list/detail 공통). |
| PATCH  | `/requests/:id` | `{description?, urgent?}` | `RequestPublic`. 작성자만. matched/expired면 거부 (409). |
| DELETE | `/requests/:id` | — | 204. 작성자만. status=cancelled 로 soft-delete. |

`RequestPublic` 핵심 필드: `id, name, category, description, urgent, status, start_time, expires_at, created_at, author{id,name,dong,unit,line_no,phone?}, pending_offer_count`. `author.phone`은 `status='matched'` && (현재 사용자가 매칭된 offerer)일 때만 포함.

### 5.3 Offers (빌려드릴게요)

| Method | Path | Body | 응답 / 권한 |
|---|---|---|---|
| POST   | `/requests/:id/offers` | `{rental_time, return_time, rental_place, return_place}` | 201 + `OfferPublic`. 같은 라인이면서 본인 게시글 X. request status=open 일 때만. 같은 (request, user)에 active offer(pending) 1건만 허용 (409). |
| GET    | `/requests/:id/offers` | — | `{items: OfferPublic[]}`. 작성자 → 전체 (cancelled 제외). 이웃 → 자기 것만. |
| PATCH  | `/offers/:id` | 동일 (Optional fields) | `OfferPublic`. 본인 offer + status=pending 일 때만 (409). |
| DELETE | `/offers/:id` | — | 204. 본인 offer + status=pending → cancelled. 멱등. |
| POST   | `/offers/:id/accept` | — | `{request, offer}` (양 당사자 phone 포함). request 작성자만. 트랜잭션: 이 offer=accepted, 같은 request의 다른 pending=rejected, request.status=matched. |
| POST   | `/offers/:id/reject` | — | `OfferPublic`. request 작성자만. status=rejected. |

### 5.4 Polling 보조

| Method | Path | 설명 |
|---|---|---|
| GET | `/requests?since=...` | 변경된 request + offers (lightweight) |
| GET | `/me/notifications/summary` | `{unseenRequestCount, pendingOfferCount, matchedToday}` (배너 표시용) |

### 5.5 권한·격리 정책 (모든 핸들러 공통)
1. JWT → `user_id, dong, line_no` 추출.
2. 모든 request/offer 쿼리에 `WHERE u.dong = :dong AND u.line_no = :line_no` 강제 조인.
3. 작성자/소유자 권한 체크는 핸들러별 분기.

---

## 6. 프론트엔드 구조

### 6.1 라이브러리 선택
- **Vite + React 18 + TypeScript** (개발 속도, 빌드 결과물 작음)
- **Tailwind CSS** ─ 프로토타입의 디자인 토큰(`--primary: #5B6EF7` 등)을 `tailwind.config.ts`의 `theme.extend.colors`로 그대로 옮김.
- **React Router v6** ─ 7개 라우트(`/login`, `/signup`, `/`, `/requests/:id`, `/offers/registered`, `/matched`, 404).
- **TanStack Query (React Query)** ─ 서버 상태 캐시 + 5초 polling (`refetchInterval: 5_000`)으로 새 글/offer 자동 갱신.
- **Zustand** ─ 인증 토큰, 현재 사용자, 모달 표시 등 클라이언트 상태.
- **react-hook-form + zod** ─ 로그인/회원가입/요청 모달 폼 검증.
- **dayjs (또는 date-fns)** ─ "방금 전/N분 전" 포맷, 72h 카운트다운.

### 6.2 디렉토리

```
impl/frontend/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── src/
    ├── main.tsx
    ├── App.tsx                       # Router + QueryClientProvider
    ├── lib/
    │   ├── api.ts                    # fetch 래퍼, JWT 자동 주입, 401 → refresh
    │   ├── auth.ts                   # 토큰 저장(localStorage), Zustand 스토어
    │   ├── time.ts                   # formatRelativeTime, formatCountdown
    │   └── queryKeys.ts
    ├── routes/
    │   ├── LoginPage.tsx
    │   ├── SignupPage.tsx
    │   ├── MainPage.tsx              # screen-main
    │   ├── RequestDetailPage.tsx     # 작성자/이웃 뷰 분기
    │   ├── OfferRegisteredPage.tsx
    │   ├── MatchedPage.tsx
    │   └── NotFoundPage.tsx
    ├── features/
    │   ├── auth/                     # useLogin, useSignup, useMe
    │   ├── requests/                 # useRequests, useRequest, useCreateRequest, ...
    │   └── offers/                   # useCreateOffer, useAcceptOffer, ...
    ├── components/
    │   ├── layout/                   # MobileShell (max-w-[480px] 중앙정렬)
    │   ├── post/                     # PostCard, PostList, FilterChips
    │   ├── nudge/                    # NudgeBanner, NewPostBanner
    │   ├── modals/                   # RequestModal, ConfirmModal, MyOfferModal
    │   ├── sheets/                   # OfferBottomSheet (2-step)
    │   ├── timer/                    # CountdownTimer
    │   └── ui/                       # Button, Chip, Toggle, InputGroup
    └── styles/
        └── index.css                 # @tailwind base/components/utilities + 전역 토큰
```

### 6.3 컴포넌트-기능 매핑 (mockup 번호 → 프로토타입 → React)

| # | 프로토타입 | React 컴포넌트 |
|---|---|---|
| 01 | `renderLogin()` | `LoginPage` + `<InputGroup>`, `<Button>` |
| 02 | *(신규)* | `SignupPage` + react-hook-form + zod 검증, 가입 성공 시 자동 로그인 |
| 03 | `renderMain()` | `MainPage` + `<Header>`, `<NewPostBanner>`, `<NudgeBanner>`, `<FilterChips>`, `<PostList>`, `<PostCard>`, `<Fab>` |
| 04 | `renderRequestModal()` | `<RequestModal>` (Dialog) |
| 05 | `renderDetailOwner()` | `<OwnerDetailView>` ─ 게시글 설정 폼, `<OfferList>`, `<DetailFooter>`, `<CountdownTimer>` |
| 06 | `renderDetailNeighbor()` | `<NeighborDetailView>` ─ 정보 카드, `<DetailFooter>`, `<CountdownTimer>` |
| 07 | `renderOfferSheet()` step 1 | `<OfferBottomSheet step=1>` (대여/반납 시간 프리셋) |
| 08 | `renderOfferSheet()` step 2 | `<OfferBottomSheet step=2>` (장소 입력, 신규/수정 동일 UI) |
| 09 | `renderMyOfferModal()` | `<MyOfferModal>` ─ 내 active offer 확인/수정/취소 |
| 10 | `renderOfferRegistered()` | `OfferRegisteredPage` |
| 11 | `renderConfirmModal()` | `<ConfirmModal>` + 전역 `useConfirm()` 훅 (Zustand `{ message, onConfirm }` 단일 슬롯) |
| 12 | `renderMatched()` | `MatchedPage` |
| — | `showSnackbar/showToast` | `<ToastProvider>` (sonner 또는 자체) |

### 6.4 전역 레이아웃
프로토타입 `#app { max-width:480px; margin:auto }` 그대로. `<MobileShell>` 컴포넌트가 모든 라우트를 감싸 `min-h-screen`, `max-w-[480px]`, 흰 배경 카드 모양 유지.

---

## 7. 백엔드 구조 (Rust + axum)

### 7.1 크레이트 의존성 (Cargo.toml)

```toml
[dependencies]
tokio        = { version = "1", features = ["full"] }
axum         = { version = "0.7", features = ["macros"] }
tower        = "0.5"
tower-http   = { version = "0.6", features = ["cors", "trace"] }
sqlx         = { version = "0.8", features = ["runtime-tokio", "mysql", "chrono", "macros", "migrate"] }
serde        = { version = "1", features = ["derive"] }
serde_json   = "1"
chrono       = { version = "0.4", features = ["serde"] }
jsonwebtoken = "9"
argon2       = "0.5"
thiserror    = "1"
anyhow       = "1"
tracing      = "0.1"
tracing-subscriber = "0.3"
dotenvy      = "0.15"
validator    = { version = "0.18", features = ["derive"] }
```

### 7.2 디렉토리

```
impl/backend/
├── Cargo.toml
├── .env.example
├── migrations/                       # sqlx-cli (0001_init.sql 등)
└── src/
    ├── main.rs                       # tokio main, AppState 조립, axum router
    ├── config.rs                     # env 로딩 (DATABASE_URL, JWT_SECRET, BIND_ADDR)
    ├── error.rs                      # AppError + IntoResponse
    ├── auth/
    │   ├── mod.rs
    │   ├── jwt.rs                    # encode/decode, Claims { user_id, dong, line_no, exp }
    │   ├── password.rs               # argon2 hash/verify
    │   └── extractor.rs              # `AuthUser` axum extractor (Bearer → DB → 컨텍스트)
    ├── db.rs                         # sqlx::MySqlPool 생성
    ├── models/
    │   ├── user.rs
    │   ├── request.rs
    │   └── offer.rs
    ├── routes/
    │   ├── mod.rs                    # /api/v1 nested router
    │   ├── auth.rs                   # signup/login/refresh/me/logout
    │   ├── requests.rs               # CRUD + 리스트 필터 + since
    │   └── offers.rs                 # 등록/수정/취소 + accept/reject
    ├── services/                     # 비즈니스 로직 (트랜잭션, 권한)
    │   ├── request_service.rs
    │   └── offer_service.rs
    └── util/
        ├── line.rs                   # unit "101호" → ("101동", "01") 파서
        └── time.rs                   # 72h 만료 계산
```

### 7.3 만료 처리
주기적 백그라운드 task (tokio::spawn + interval 60s):
```rust
UPDATE requests
SET status = 'expired'
WHERE status = 'open' AND expires_at <= NOW();
```
또는 단순히 GET 시점에 lazy하게 처리(쿼리에 `CASE WHEN expires_at <= NOW() THEN 'expired' ELSE status END`). MVP는 백그라운드 task 추천.

---

## 8. ./impl 전체 디렉토리 + 개발 환경

```
impl/
├── PLAN.md                         # 본 문서
├── README.md                       # 빠른 시작 가이드 (마일스톤 M1에서 작성)
├── docker-compose.yml              # mysql + (선택) adminer
├── .env.example
├── backend/                        # Rust + axum
│   └── ...                         # §7.2
└── frontend/                       # React + TS + Tailwind
    └── ...                         # §6.2
```

### 8.1 docker-compose.yml (개발용)

```yaml
services:
  mysql:
    image: mysql:8.4
    environment:
      MYSQL_ROOT_PASSWORD: dev
      MYSQL_DATABASE: linenb
      MYSQL_USER: linenb
      MYSQL_PASSWORD: dev
    ports: ["3306:3306"]
    volumes: ["./.data/mysql:/var/lib/mysql"]
  adminer:
    image: adminer
    ports: ["8081:8080"]
```

백엔드/프런트는 호스트에서 `cargo run` / `pnpm dev`로 띄움 (DX 우선). 운영용 Dockerfile은 추후 마일스톤.

### 8.2 환경 변수 (.env.example)

```
# backend
DATABASE_URL=mysql://linenb:dev@localhost:3306/linenb
JWT_SECRET=replace-me-with-32-bytes
JWT_ACCESS_TTL_SEC=900
JWT_REFRESH_TTL_SEC=2592000
BIND_ADDR=0.0.0.0:8080
CORS_ORIGIN=http://localhost:5173

# frontend
VITE_API_BASE=http://localhost:8080/api/v1
VITE_POLL_INTERVAL_MS=5000
```

---

## 9. 마일스톤

각 마일스톤 끝에는 "데모 가능한 상태"를 두는 것이 원칙.

### M1. Skeleton (1~2일)
- `impl/` 모노레포 구조, Tailwind 셋업, axum hello world, MySQL Docker 기동, sqlx-cli 마이그레이션 0001 적용.
- 프론트: `<MobileShell>` + 라우터 + 빈 페이지 7개.
- 백엔드: `/healthz` + DB ping.
- 데모: 두 프로세스가 떠 있고 `/healthz` 200.

### M2. Auth (2~3일)
- `users` 테이블, signup/login/refresh/me 엔드포인트, argon2 + JWT.
- 프론트: 로그인/회원가입 폼, 토큰 저장, 라우트 가드(`<RequireAuth>`).
- 데모: 회원가입 → 로그인 → 메인(빈) → 로그아웃.

### M3. 게시글 CRUD + 메인 화면 (3~4일)
- `requests` 테이블, GET/POST/GET-:id/PATCH/DELETE.
- 프론트: 메인 페이지(헤더, 필터, 리스트, FAB), 요청 등록 모달, 상세(작성자: 편집/삭제 / 이웃: read-only).
- (동, 라인) 격리 적용. 72h `expires_at` 저장 및 만료 백그라운드 task.
- 데모: hong이 글 작성 → kim 계정에서 같은 글이 보임 → 다른 라인 박서준은 안 보임.

### M4. Offer 플로우 (3~4일)
- `offers` 테이블, 등록/수정/취소/accept/reject.
- 프론트: 2-step `<OfferBottomSheet>`, 작성자 상세의 offer 리스트 + 수락/거절, `<MyOfferModal>`, `<MatchedPage>`, `<OfferRegisteredPage>`.
- accept 시 트랜잭션 (다른 pending → rejected, request → matched).
- 데모: kim이 hong의 글에 offer → hong이 수락 → 양쪽 거래 성사 화면.

### M5. Polling, 타이머, 새 글 배너 (1~2일)
- TanStack Query polling 5s, 상세 페이지에서는 1s polling for offer 변화.
- `<CountdownTimer>` 1초 갱신 컴포넌트.
- `<NewPostBanner>` ─ "마지막으로 본 시각" localStorage + GET `/requests?since=...`.
- `<NudgeBanner>` ─ 카테고리/이웃별 추천 1건 (정적 풀 또는 가장 최근 open request).

### M6. 마감 (2일)
- 폼 검증 메시지, 에러 토스트, 빈 상태 그래픽, 접근성 라벨.
- 시드 데이터 (sqlx migration 또는 `cargo run --bin seed`).
- 운영용 Dockerfile (frontend → nginx static, backend → distroless), GitHub Actions CI(빌드+sqlx prepare).
- README 정리.

총 예상 11~16 영업일 (1인 기준). 두 명이면 FE/BE 분리해서 8~10일.

---

## 10. 위험요소 & 대응

| 위험 | 영향 | 대응 |
|---|---|---|
| **Polling 부하** | DB QPS 증가 | `since` 파라미터로 변경분만 반환. 1단지 기준 동시 사용자 ≤ 수십이라 큰 문제 X. 5s가 부담되면 10s로. |
| **race: 두 명이 동시에 같은 offer accept 시도** | 데이터 일관성 | `BEGIN; SELECT … FOR UPDATE` 후 status 검증 후 update. axum에서 `sqlx::Transaction` 사용. |
| **(request_id, user_id) active offer 중복** | UX 혼란 | 등록 핸들러에서 `WHERE status IN ('pending')` 체크 + 동일 이웃의 활성 offer는 PATCH로 유도. |
| **72h 만료 누락** | 만료된 글이 계속 보임 | 백그라운드 task + 조회 시 lazy 검사 둘 다 적용. |
| **JWT secret 유출** | 토큰 위조 | `.env`로만 주입, repo `.gitignore`. refresh 토큰은 DB 저장 안 함(MVP). v2에서 rotation. |
| **개인정보(전화번호) 노출** | 프라이버시 | 같은 라인 + matched 상태에서만 phone 응답에 포함. open 상태에서는 작성자에게도 미공개(이웃 offer 화면). |
| **모바일 webkit 100vh 버그** | 레이아웃 깨짐 | `min-h-dvh` + safe-area-inset. Tailwind plugin `tailwindcss-safe-area`. |
| **카테고리 enum 불일치** | DB 데이터 깨짐 | 서버에서 enum validation (validator crate) + 프론트에서 동일 상수 import. |

### 추후 고려 (v2 로드맵)
- **PWA + Web Push**: service worker, VAPID 키, 백그라운드 알림.
- **WebSocket으로 전환**: 채팅/실시간 offer 알림.
- **거래 후기 + 평점**: `reviews` 테이블, `users.trust_score`.
- **다단지 멀티테넌시**: `complexes` 테이블, 모든 도메인 테이블에 `complex_id` FK.
- **관리자 콘솔**: 신고/차단, 카테고리 관리.

---

## 11. 다음 액션

1. `./impl/` 에 모노레포 스캐폴드 (M1).
2. `docker-compose up -d mysql` 후 `0001_init.sql` 적용.
3. axum + sqlx hello world, vite + tailwind hello world.
4. M2부터 차례로 구현.

플랜에 대한 피드백을 받아 다음 갱신(v1.2) 또는 M1 코드 작성 착수.

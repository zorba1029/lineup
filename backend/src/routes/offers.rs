//! Offer 핸들러. PLAN.md §5.3.
//!
//! 두 라우터로 분할:
//! - `requests_scoped_router()`: `/requests/:id/offers` (POST + GET)
//! - `top_router()`: `/offers/:id` (PATCH/DELETE), `/offers/:id/accept`, `/offers/:id/reject`
//!
//! 격리: 모든 조회는 request 작성자의 (dong, line_no)와 auth가 일치해야 함.

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, patch, post},
    Json, Router,
};
use serde::Serialize;
use validator::Validate;

use crate::auth::extractor::AuthUser;
use crate::error::AppError;
use crate::models::offer::{
    CreateOfferBody, OfferPublic, OfferWithOffererRow, UpdateOfferBody,
};
use crate::models::request::{RequestPublic, RequestWithAuthorRow};
use crate::routes::requests::SELECT_BASE as SELECT_REQUEST_BASE;
use crate::AppState;

pub fn requests_scoped_router() -> Router<AppState> {
    Router::new().route("/:id/offers", get(list_offers).post(create_offer))
}

pub fn top_router() -> Router<AppState> {
    Router::new()
        .route("/:id", patch(update_offer).delete(delete_offer))
        .route("/:id/accept", post(accept_offer))
        .route("/:id/reject", post(reject_offer))
}

// ─────────────────────────── Response ───────────────────────────

#[derive(Debug, Serialize)]
pub struct OfferListResponse {
    pub items: Vec<OfferPublic>,
}

#[derive(Debug, Serialize)]
pub struct MatchedResponse {
    pub request: RequestPublic,
    pub offer: OfferPublic,
}

// ─────────────────────────── SQL constants ───────────────────────────

/// offer + offerer 정보 + 격리(request 작성자의 dong/line_no가 auth와 일치).
const SELECT_OFFER_BASE: &str = r#"
SELECT
  o.id, o.request_id, o.user_id,
  o.rental_time, o.return_time, o.rental_place, o.return_place,
  o.status, o.created_at,
  u.name    AS offerer_name,
  u.dong    AS offerer_dong,
  u.unit    AS offerer_unit,
  u.line_no AS offerer_line_no,
  u.phone   AS offerer_phone
FROM offers o
INNER JOIN users    u  ON u.id  = o.user_id
INNER JOIN requests r  ON r.id  = o.request_id
INNER JOIN users    ru ON ru.id = r.user_id
WHERE ru.dong = ? AND ru.line_no = ?
"#;

// request 격리 + 작성자 정보 + pending_offer_count는 `routes::requests::SELECT_BASE` 재사용.

// ─────────────────────────── Handlers ───────────────────────────

/// POST /requests/:id/offers
async fn create_offer(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(request_id): Path<u64>,
    Json(body): Json<CreateOfferBody>,
) -> Result<(StatusCode, Json<OfferPublic>), AppError> {
    body.validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;

    let req = fetch_request(&state, &auth, request_id).await?;
    if req.user_id == auth.user_id {
        return Err(AppError::Forbidden);
    }
    if req.status != "open" {
        return Err(AppError::Conflict(format!(
            "글이 {} 상태라 빌려주기를 등록할 수 없습니다",
            req.status
        )));
    }

    // 같은 (request, user) 활성 offer 1건만. PLAN.md §10.
    let active: Option<(u64,)> = sqlx::query_as(
        "SELECT id FROM offers WHERE request_id = ? AND user_id = ? AND status = 'pending' LIMIT 1",
    )
    .bind(request_id)
    .bind(auth.user_id)
    .fetch_optional(&state.db)
    .await?;
    if active.is_some() {
        return Err(AppError::Conflict(
            "이미 빌려주기를 등록하신 글입니다".into(),
        ));
    }

    let res = sqlx::query(
        "INSERT INTO offers (request_id, user_id, rental_time, return_time, rental_place, return_place) \
         VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(request_id)
    .bind(auth.user_id)
    .bind(&body.rental_time)
    .bind(&body.return_time)
    .bind(&body.rental_place)
    .bind(&body.return_place)
    .execute(&state.db)
    .await?;

    let id = res.last_insert_id();
    let row = fetch_offer(&state, &auth, id).await?;
    Ok((StatusCode::CREATED, Json(row.into_public(false))))
}

/// GET /requests/:id/offers — 작성자: 전체. 이웃: 자기 것만.
async fn list_offers(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(request_id): Path<u64>,
) -> Result<Json<OfferListResponse>, AppError> {
    let req = fetch_request(&state, &auth, request_id).await?;

    let mut sql = format!("{SELECT_OFFER_BASE} AND o.request_id = ?");
    let is_author = req.user_id == auth.user_id;
    if !is_author {
        sql.push_str(" AND o.user_id = ?");
    }
    sql.push_str(" ORDER BY o.created_at ASC");

    let mut q = sqlx::query_as::<_, OfferWithOffererRow>(&sql)
        .bind(&auth.dong)
        .bind(&auth.line_no)
        .bind(request_id);
    if !is_author {
        q = q.bind(auth.user_id);
    }

    let rows = q.fetch_all(&state.db).await?;
    let items = rows.into_iter().map(|r| r.into_public(false)).collect();
    Ok(Json(OfferListResponse { items }))
}

/// PATCH /offers/:id
async fn update_offer(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(offer_id): Path<u64>,
    Json(body): Json<UpdateOfferBody>,
) -> Result<Json<OfferPublic>, AppError> {
    body.validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;

    let row = fetch_offer(&state, &auth, offer_id).await?;
    if row.user_id != auth.user_id {
        return Err(AppError::Forbidden);
    }
    if row.status != "pending" {
        return Err(AppError::Conflict(format!(
            "수정할 수 없는 상태입니다: {}",
            row.status
        )));
    }

    if body.rental_time.is_none()
        && body.return_time.is_none()
        && body.rental_place.is_none()
        && body.return_place.is_none()
    {
        return Ok(Json(row.into_public(false)));
    }

    sqlx::query(
        "UPDATE offers SET \
           rental_time  = COALESCE(?, rental_time), \
           return_time  = COALESCE(?, return_time), \
           rental_place = COALESCE(?, rental_place), \
           return_place = COALESCE(?, return_place) \
         WHERE id = ? AND user_id = ?",
    )
    .bind(body.rental_time.as_deref())
    .bind(body.return_time.as_deref())
    .bind(body.rental_place.as_deref())
    .bind(body.return_place.as_deref())
    .bind(offer_id)
    .bind(auth.user_id)
    .execute(&state.db)
    .await?;

    let updated = fetch_offer(&state, &auth, offer_id).await?;
    Ok(Json(updated.into_public(false)))
}

/// DELETE /offers/:id — 본인 + pending만 → status='cancelled'.
async fn delete_offer(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(offer_id): Path<u64>,
) -> Result<impl IntoResponse, AppError> {
    let row = fetch_offer(&state, &auth, offer_id).await?;
    if row.user_id != auth.user_id {
        return Err(AppError::Forbidden);
    }
    if row.status != "pending" {
        // 멱등 처리 — 이미 종료된 offer는 그냥 204.
        return Ok(StatusCode::NO_CONTENT);
    }
    sqlx::query("UPDATE offers SET status = 'cancelled' WHERE id = ? AND user_id = ?")
        .bind(offer_id)
        .bind(auth.user_id)
        .execute(&state.db)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

/// POST /offers/:id/accept — 트랜잭션. PLAN.md §10.
/// 같은 request 내 다른 pending offer 자동 rejected, request → matched.
async fn accept_offer(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(offer_id): Path<u64>,
) -> Result<Json<MatchedResponse>, AppError> {
    let mut tx = state.db.begin().await?;

    // 1) offer 잠금 + 권한 검증
    let offer: OfferLockRow =
        sqlx::query_as("SELECT id, request_id, status FROM offers WHERE id = ? FOR UPDATE")
            .bind(offer_id)
            .fetch_optional(&mut *tx)
            .await?
            .ok_or(AppError::NotFound)?;

    if offer.status != "pending" {
        return Err(AppError::Conflict(format!(
            "수락할 수 없는 상태입니다: {}",
            offer.status
        )));
    }

    // 2) request 잠금 + 작성자 검증 + 격리
    let request: RequestLockRow = sqlx::query_as(
        "SELECT r.id, r.user_id, r.status \
         FROM requests r INNER JOIN users u ON u.id = r.user_id \
         WHERE r.id = ? AND u.dong = ? AND u.line_no = ? FOR UPDATE",
    )
    .bind(offer.request_id)
    .bind(&auth.dong)
    .bind(&auth.line_no)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(AppError::NotFound)?;

    if request.user_id != auth.user_id {
        return Err(AppError::Forbidden);
    }
    if request.status != "open" {
        return Err(AppError::Conflict(format!(
            "글이 {} 상태라 수락할 수 없습니다",
            request.status
        )));
    }

    // 3) 적용
    sqlx::query("UPDATE offers SET status = 'accepted' WHERE id = ?")
        .bind(offer_id)
        .execute(&mut *tx)
        .await?;
    sqlx::query(
        "UPDATE offers SET status = 'rejected' \
         WHERE request_id = ? AND id <> ? AND status = 'pending'",
    )
    .bind(offer.request_id)
    .bind(offer_id)
    .execute(&mut *tx)
    .await?;
    sqlx::query("UPDATE requests SET status = 'matched' WHERE id = ?")
        .bind(offer.request_id)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    // 4) matched 양쪽 정보 응답 — 양 당사자가 phone 보임.
    let req_row = fetch_request(&state, &auth, offer.request_id).await?;
    let off_row = fetch_offer(&state, &auth, offer_id).await?;
    Ok(Json(MatchedResponse {
        request: req_row.into_public(true),
        offer: off_row.into_public(true),
    }))
}

/// POST /offers/:id/reject — request 작성자만.
async fn reject_offer(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(offer_id): Path<u64>,
) -> Result<Json<OfferPublic>, AppError> {
    let row = fetch_offer(&state, &auth, offer_id).await?;
    let req = fetch_request(&state, &auth, row.request_id).await?;
    if req.user_id != auth.user_id {
        return Err(AppError::Forbidden);
    }
    if row.status != "pending" {
        return Err(AppError::Conflict(format!(
            "거절할 수 없는 상태입니다: {}",
            row.status
        )));
    }
    sqlx::query("UPDATE offers SET status = 'rejected' WHERE id = ?")
        .bind(offer_id)
        .execute(&state.db)
        .await?;
    let updated = fetch_offer(&state, &auth, offer_id).await?;
    Ok(Json(updated.into_public(false)))
}

// ─────────────────────────── helpers ───────────────────────────

#[derive(sqlx::FromRow)]
struct OfferLockRow {
    #[allow(dead_code)]
    pub id: u64,
    pub request_id: u64,
    pub status: String,
}

#[derive(sqlx::FromRow)]
struct RequestLockRow {
    #[allow(dead_code)]
    pub id: u64,
    pub user_id: u64,
    pub status: String,
}

async fn fetch_offer(
    state: &AppState,
    auth: &AuthUser,
    id: u64,
) -> Result<OfferWithOffererRow, AppError> {
    let sql = format!("{SELECT_OFFER_BASE} AND o.id = ?");
    sqlx::query_as::<_, OfferWithOffererRow>(&sql)
        .bind(&auth.dong)
        .bind(&auth.line_no)
        .bind(id)
        .fetch_optional(&state.db)
        .await?
        .ok_or(AppError::NotFound)
}

async fn fetch_request(
    state: &AppState,
    auth: &AuthUser,
    id: u64,
) -> Result<RequestWithAuthorRow, AppError> {
    let sql = format!("{SELECT_REQUEST_BASE} AND r.id = ?");
    sqlx::query_as::<_, RequestWithAuthorRow>(&sql)
        .bind(&auth.dong)
        .bind(&auth.line_no)
        .bind(id)
        .fetch_optional(&state.db)
        .await?
        .ok_or(AppError::NotFound)
}

//! GET/POST/GET-:id/PATCH/DELETE /api/v1/requests — PLAN.md §5.2.
//!
//! 격리 규칙: 모든 쿼리에 JOIN users + WHERE u.dong = ? AND u.line_no = ? 강제.

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use validator::Validate;

use crate::auth::extractor::AuthUser;
use crate::error::AppError;
use crate::models::offer::{OfferPublic, OfferWithOffererRow};
use crate::models::request::{
    CreateRequestBody, RequestPublic, RequestWithAuthorRow, UpdateRequestBody,
};
use crate::util::category::validate_category;
use crate::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_requests).post(create_request))
        .route(
            "/:id",
            get(get_request).patch(update_request).delete(delete_request),
        )
}

// ─────────────────────────── Query / DTO ───────────────────────────

#[derive(Debug, Deserialize)]
pub struct ListQuery {
    #[serde(default)]
    pub mine: Option<bool>,
    #[serde(default)]
    pub lent: Option<bool>,
    #[serde(default)]
    pub since: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize)]
pub struct ListResponse {
    pub items: Vec<RequestPublic>,
}

/// 상세 응답: request + 표시용 offer 리스트.
/// pending_offer_count는 `request.pending_offer_count`로 통일됨 (list/detail 공통).
/// 작성자/이웃에 따라 offers 가시성과 phone 노출이 다르다.
#[derive(Debug, Serialize)]
pub struct DetailResponse {
    pub request: RequestPublic,
    pub offers: Vec<OfferPublic>,
}

// 모든 SELECT가 공유하는 컬럼 + JOIN. 쿼리 끝에 추가 WHERE를 이어 붙여 사용.
// pending_offer_count는 correlated subquery로 항상 같이 계산됨 (N+1 방지).
pub const SELECT_BASE: &str = r#"
SELECT
  r.id, r.user_id, r.name, r.category, r.description,
  r.urgent, r.status, r.start_time, r.expires_at, r.created_at,
  u.name      AS author_name,
  u.dong      AS author_dong,
  u.unit      AS author_unit,
  u.line_no   AS author_line_no,
  u.phone     AS author_phone,
  (SELECT COUNT(*) FROM offers o WHERE o.request_id = r.id AND o.status = 'pending')
    AS pending_offer_count
FROM requests r
INNER JOIN users u ON u.id = r.user_id
WHERE u.dong = ? AND u.line_no = ?
"#;

// ─────────────────────────── Handlers ───────────────────────────

async fn list_requests(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(q): Query<ListQuery>,
) -> Result<Json<ListResponse>, AppError> {
    let mine = q.mine.unwrap_or(false);
    let lent = q.lent.unwrap_or(false);

    let mut sql = String::from(SELECT_BASE);
    sql.push_str(" AND r.status <> 'cancelled'");
    if mine {
        sql.push_str(" AND r.user_id = ?");
    }
    if lent {
        // 내가 빌려주겠다고 응답한 글들 — pending(요청자가 아직 수락 안 함) + accepted(매칭됨).
        // 자기가 취소했거나 거절된 offer는 제외.
        sql.push_str(
            " AND EXISTS ( \
               SELECT 1 FROM offers o \
               WHERE o.request_id = r.id AND o.user_id = ? \
                 AND o.status IN ('pending', 'accepted') \
             )",
        );
    }
    if q.since.is_some() {
        sql.push_str(" AND r.updated_at >= ?");
    }
    sql.push_str(" ORDER BY r.created_at DESC");

    let mut query = sqlx::query_as::<_, RequestWithAuthorRow>(&sql)
        .bind(&auth.dong)
        .bind(&auth.line_no);
    if mine {
        query = query.bind(auth.user_id);
    }
    if lent {
        query = query.bind(auth.user_id);
    }
    if let Some(since) = q.since {
        query = query.bind(since.naive_utc());
    }

    let rows = query.fetch_all(&state.db).await?;
    let items = rows.into_iter().map(|r| r.into_public(false)).collect();
    Ok(Json(ListResponse { items }))
}

async fn create_request(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(body): Json<CreateRequestBody>,
) -> Result<(StatusCode, Json<RequestPublic>), AppError> {
    body.validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;
    validate_category(&body.category)?;

    let res = sqlx::query(
        "INSERT INTO requests (user_id, name, category, description, urgent, expires_at) \
         VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 72 HOUR))",
    )
    .bind(auth.user_id)
    .bind(&body.name)
    .bind(&body.category)
    .bind(&body.description)
    .bind(body.urgent)
    .execute(&state.db)
    .await?;

    let id = res.last_insert_id();
    let row = fetch_one(&state, &auth, id).await?;
    Ok((StatusCode::CREATED, Json(row.into_public(false))))
}

async fn get_request(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<u64>,
) -> Result<Json<DetailResponse>, AppError> {
    let req = fetch_one(&state, &auth, id).await?;
    let is_author = req.user_id == auth.user_id;
    let req_status = req.status.clone();

    // 이 request에 달린 모든 offer를 한 번에 가져와서 (가시성/phone 분기는 메모리에서)
    let all_offers: Vec<OfferWithOffererRow> = sqlx::query_as(
        "SELECT \
           o.id, o.request_id, o.user_id, \
           o.rental_time, o.return_time, o.rental_place, o.return_place, \
           o.status, o.created_at, \
           u.name    AS offerer_name, \
           u.dong    AS offerer_dong, \
           u.unit    AS offerer_unit, \
           u.line_no AS offerer_line_no, \
           u.phone   AS offerer_phone \
         FROM offers o INNER JOIN users u ON u.id = o.user_id \
         WHERE o.request_id = ? \
         ORDER BY o.created_at ASC",
    )
    .bind(req.id)
    .fetch_all(&state.db)
    .await?;

    let matched_offerer_id: Option<u64> = all_offers
        .iter()
        .find(|o| o.status == "accepted")
        .map(|o| o.user_id);

    // 양 당사자(작성자, 매칭된 offerer)에게만 phone 공개. PLAN.md §10.
    let auth_is_matched_offerer = matched_offerer_id == Some(auth.user_id);
    let request_phone = req_status == "matched" && auth_is_matched_offerer;
    let request_public = req.into_public(request_phone);

    // offer 가시성 + 각 offer의 phone 분기
    let offers: Vec<OfferPublic> = all_offers
        .into_iter()
        .filter(|o| {
            if is_author {
                o.status != "cancelled"
            } else {
                o.user_id == auth.user_id
            }
        })
        .map(|o| {
            let include_phone =
                req_status == "matched" && o.status == "accepted" && is_author;
            o.into_public(include_phone)
        })
        .collect();

    Ok(Json(DetailResponse {
        request: request_public,
        offers,
    }))
}

async fn update_request(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<u64>,
    Json(body): Json<UpdateRequestBody>,
) -> Result<Json<RequestPublic>, AppError> {
    body.validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;

    let row = fetch_one(&state, &auth, id).await?;
    if row.user_id != auth.user_id {
        return Err(AppError::Forbidden);
    }
    if row.status != "open" {
        return Err(AppError::Conflict(format!(
            "수정할 수 없는 상태입니다: {}",
            row.status
        )));
    }

    // 둘 다 None이면 변경 없음 — 그냥 현재 row 그대로 반환.
    if body.description.is_none() && body.urgent.is_none() {
        return Ok(Json(row.into_public(false)));
    }

    sqlx::query(
        "UPDATE requests \
         SET description = COALESCE(?, description), \
             urgent      = COALESCE(?, urgent) \
         WHERE id = ? AND user_id = ?",
    )
    .bind(body.description.as_deref())
    .bind(body.urgent)
    .bind(id)
    .bind(auth.user_id)
    .execute(&state.db)
    .await?;

    let updated = fetch_one(&state, &auth, id).await?;
    Ok(Json(updated.into_public(false)))
}

async fn delete_request(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<u64>,
) -> Result<impl IntoResponse, AppError> {
    let row = fetch_one(&state, &auth, id).await?;
    if row.user_id != auth.user_id {
        return Err(AppError::Forbidden);
    }
    // open이 아니면 멱등 — 이미 종료된 글은 cancelled 처리만.
    sqlx::query("UPDATE requests SET status = 'cancelled' WHERE id = ? AND user_id = ?")
        .bind(id)
        .bind(auth.user_id)
        .execute(&state.db)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

// ─────────────────────────── helpers ───────────────────────────

async fn fetch_one(
    state: &AppState,
    auth: &AuthUser,
    id: u64,
) -> Result<RequestWithAuthorRow, AppError> {
    let sql = format!("{SELECT_BASE} AND r.id = ?");
    sqlx::query_as::<_, RequestWithAuthorRow>(&sql)
        .bind(&auth.dong)
        .bind(&auth.line_no)
        .bind(id)
        .fetch_optional(&state.db)
        .await?
        .ok_or(AppError::NotFound)
}

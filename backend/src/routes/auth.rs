//! POST /signup, /login, /refresh, /logout, GET /me — PLAN.md §5.1 구현.

use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use validator::Validate;

use crate::auth::{
    extractor::AuthUser,
    jwt::{self, Claims, TokenKind},
    password,
};
use crate::error::AppError;
use crate::models::user::{UserPublic, UserRow};
use crate::util::line::extract_line_no;
use crate::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/signup", post(signup))
        .route("/login", post(login))
        .route("/refresh", post(refresh))
        .route("/logout", post(logout))
        .route("/me", get(me))
}

// ─────────────────────────── DTO ───────────────────────────

#[derive(Debug, Deserialize, Validate)]
pub struct SignupBody {
    #[validate(length(min = 3, max = 40))]
    pub username: String,
    #[validate(length(min = 6, max = 100))]
    pub password: String,
    #[validate(length(min = 1, max = 40))]
    pub name: String,
    #[validate(length(min = 2, max = 10))]
    pub dong: String,
    #[validate(length(min = 2, max = 10))]
    pub unit: String,
    #[validate(length(min = 9, max = 20))]
    pub phone: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct LoginBody {
    #[validate(length(min = 1, max = 40))]
    pub username: String,
    #[validate(length(min = 1, max = 100))]
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct RefreshBody {
    #[serde(rename = "refreshToken")]
    pub refresh_token: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub user: UserPublic,
    #[serde(rename = "accessToken")]
    pub access_token: String,
    #[serde(rename = "refreshToken")]
    pub refresh_token: String,
}

#[derive(Debug, Serialize)]
pub struct AccessOnlyResponse {
    #[serde(rename = "accessToken")]
    pub access_token: String,
}

#[derive(Debug, Serialize)]
pub struct MeResponse {
    pub user: UserPublic,
}

// ─────────────────────────── Handlers ───────────────────────────

async fn signup(
    State(state): State<AppState>,
    Json(body): Json<SignupBody>,
) -> Result<Json<AuthResponse>, AppError> {
    body.validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;

    let line_no = extract_line_no(&body.unit)?;
    let pw_hash = password::hash(&body.password)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("hash failed: {e}")))?;

    let res = sqlx::query(
        "INSERT INTO users (username, password_hash, name, dong, unit, line_no, phone) \
         VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&body.username)
    .bind(&pw_hash)
    .bind(&body.name)
    .bind(&body.dong)
    .bind(&body.unit)
    .bind(&line_no)
    .bind(&body.phone)
    .execute(&state.db)
    .await
    .map_err(map_unique_violation)?;

    let id = res.last_insert_id();
    let row = fetch_by_id(&state, id).await?;
    Ok(Json(issue_tokens(&state, row)?))
}

async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginBody>,
) -> Result<Json<AuthResponse>, AppError> {
    body.validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;

    let row: Option<UserRow> = sqlx::query_as(
        "SELECT id, username, password_hash, name, dong, unit, line_no, phone \
         FROM users WHERE username = ?",
    )
    .bind(&body.username)
    .fetch_optional(&state.db)
    .await?;

    let row = row.ok_or(AppError::Unauthorized)?;
    if !password::verify(&body.password, &row.password_hash).unwrap_or(false) {
        return Err(AppError::Unauthorized);
    }

    Ok(Json(issue_tokens(&state, row)?))
}

async fn refresh(
    State(state): State<AppState>,
    Json(body): Json<RefreshBody>,
) -> Result<Json<AccessOnlyResponse>, AppError> {
    let claims = jwt::decode(state.jwt_secret.as_ref(), &body.refresh_token)
        .map_err(|_| AppError::Unauthorized)?;
    if claims.kind != TokenKind::Refresh {
        return Err(AppError::Unauthorized);
    }
    let row = fetch_by_id(&state, claims.user_id).await?;
    let access = encode_token(&state, &row, TokenKind::Access)?;
    Ok(Json(AccessOnlyResponse { access_token: access }))
}

async fn logout() -> impl IntoResponse {
    // MVP: stateless JWT — 클라이언트에서 토큰만 폐기. 서버는 204만 돌려준다.
    StatusCode::NO_CONTENT
}

async fn me(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<MeResponse>, AppError> {
    let row = fetch_by_id(&state, auth.user_id).await?;
    Ok(Json(MeResponse {
        user: UserPublic::from(row),
    }))
}

// ─────────────────────────── helpers ───────────────────────────

async fn fetch_by_id(state: &AppState, id: u64) -> Result<UserRow, AppError> {
    sqlx::query_as::<_, UserRow>(
        "SELECT id, username, password_hash, name, dong, unit, line_no, phone \
         FROM users WHERE id = ?",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound)
}

fn encode_token(state: &AppState, row: &UserRow, kind: TokenKind) -> Result<String, AppError> {
    let ttl = match kind {
        TokenKind::Access => state.jwt_access_ttl_sec,
        TokenKind::Refresh => state.jwt_refresh_ttl_sec,
    };
    let claims = Claims {
        user_id: row.id,
        dong: row.dong.clone(),
        line_no: row.line_no.clone(),
        kind,
        exp: jwt::exp_in(ttl),
    };
    jwt::encode(state.jwt_secret.as_ref(), &claims)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("jwt encode failed: {e}")))
}

fn issue_tokens(state: &AppState, row: UserRow) -> Result<AuthResponse, AppError> {
    let access = encode_token(state, &row, TokenKind::Access)?;
    let refresh = encode_token(state, &row, TokenKind::Refresh)?;
    Ok(AuthResponse {
        user: UserPublic::from(row),
        access_token: access,
        refresh_token: refresh,
    })
}

/// MySQL UNIQUE constraint 위반(코드 1062 / SQLSTATE 23000)을 409 Conflict로 변환.
fn map_unique_violation(e: sqlx::Error) -> AppError {
    if let sqlx::Error::Database(ref dbe) = e {
        if dbe.code().as_deref() == Some("23000") {
            return AppError::Conflict("이미 사용 중인 아이디입니다".into());
        }
    }
    AppError::Db(e)
}

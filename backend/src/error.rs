//! 통합 에러 타입. M1엔 거의 안 쓰이지만 M2부터 핸들러들이 `Result<_, AppError>`로 반환.
#![allow(dead_code)]

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("internal error")]
    Internal(#[from] anyhow::Error),

    #[error("db error")]
    Db(#[from] sqlx::Error),

    #[error("not found")]
    NotFound,

    #[error("unauthorized")]
    Unauthorized,

    #[error("forbidden")]
    Forbidden,

    #[error("bad request: {0}")]
    BadRequest(String),

    #[error("conflict: {0}")]
    Conflict(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code) = match &self {
            AppError::NotFound => (StatusCode::NOT_FOUND, "not_found"),
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, "unauthorized"),
            AppError::Forbidden => (StatusCode::FORBIDDEN, "forbidden"),
            AppError::BadRequest(_) => (StatusCode::BAD_REQUEST, "bad_request"),
            AppError::Conflict(_) => (StatusCode::CONFLICT, "conflict"),
            AppError::Db(_) | AppError::Internal(_) => {
                (StatusCode::INTERNAL_SERVER_ERROR, "internal_error")
            }
        };
        // 5xx 는 로그 남기고 메시지 노출 안함
        if status.is_server_error() {
            tracing::error!(error = %self, "server error");
        }
        let msg = match &self {
            AppError::BadRequest(m) | AppError::Conflict(m) => m.as_str(),
            _ => code,
        };
        (status, Json(json!({ "error": code, "message": msg }))).into_response()
    }
}

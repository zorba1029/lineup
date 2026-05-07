//! 라인이웃 백엔드 라이브러리.
//! 바이너리(main.rs, bin/seed.rs)와 통합 테스트(tests/*)가 공유하는 모듈.

use std::sync::Arc;

use axum::{
    extract::State,
    http::{
        header::{AUTHORIZATION, CONTENT_TYPE},
        HeaderValue, Method, StatusCode,
    },
    response::IntoResponse,
    routing::get,
    Router,
};
use tower_http::{cors::CorsLayer, trace::TraceLayer};

pub mod auth;
pub mod config;
pub mod db;
pub mod error;
pub mod models;
pub mod routes;
pub mod tasks;
pub mod util;

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::MySqlPool,
    pub jwt_secret: Arc<Vec<u8>>,
    pub jwt_access_ttl_sec: i64,
    pub jwt_refresh_ttl_sec: i64,
}

/// `/healthz`, `/readyz`, `/api/v1/*` + CORS + trace를 묶은 axum Router.
/// 운영 main()과 통합 테스트가 공유. CORS origin은 인자로 받아 테스트에선 와일드카드 가능.
pub fn build_app(state: AppState, cors_origin: HeaderValue) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(cors_origin)
        .allow_methods([Method::GET, Method::POST, Method::PATCH, Method::DELETE])
        .allow_headers([AUTHORIZATION, CONTENT_TYPE]);

    Router::new()
        .route("/healthz", get(healthz))
        .route("/readyz", get(readyz))
        .nest("/api/v1", routes::api_router())
        .with_state(state)
        .layer(cors)
        .layer(TraceLayer::new_for_http())
}

/// liveness: 프로세스 살아있음.
async fn healthz() -> impl IntoResponse {
    (StatusCode::OK, "ok")
}

/// readiness: DB 연결까지 정상.
async fn readyz(State(state): State<AppState>) -> impl IntoResponse {
    match sqlx::query_scalar::<_, i64>("SELECT 1")
        .fetch_one(&state.db)
        .await
    {
        Ok(_) => (StatusCode::OK, "ready"),
        Err(e) => {
            tracing::error!(error = ?e, "db ping failed");
            (StatusCode::SERVICE_UNAVAILABLE, "db unavailable")
        }
    }
}

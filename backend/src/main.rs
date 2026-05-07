//! 라인이웃 백엔드 진입점.
//! M1: /healthz, /readyz 만 노출. M2부터 /api/v1/auth/* 추가.

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

mod auth;
mod config;
mod db;
mod error;
mod models;
mod routes;
mod tasks;
mod util;

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::MySqlPool,
    pub jwt_secret: Arc<Vec<u8>>,
    pub jwt_access_ttl_sec: i64,
    pub jwt_refresh_ttl_sec: i64,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,sqlx=warn,tower_http=info".into()),
        )
        .init();

    let cfg = config::load()?;
    tracing::info!(addr = %cfg.bind_addr, "starting linenb-backend");

    let pool = db::connect(&cfg.database_url).await?;
    sqlx::migrate!("./migrations").run(&pool).await?;
    tracing::info!("migrations applied");

    let state = AppState {
        db: pool,
        jwt_secret: Arc::new(cfg.jwt_secret.into_bytes()),
        jwt_access_ttl_sec: cfg.jwt_access_ttl_sec,
        jwt_refresh_ttl_sec: cfg.jwt_refresh_ttl_sec,
    };

    tasks::expire::spawn(state.db.clone());

    let origin: HeaderValue = cfg
        .cors_origin
        .parse()
        .map_err(|e| anyhow::anyhow!("invalid CORS_ORIGIN {:?}: {e}", cfg.cors_origin))?;
    let cors = CorsLayer::new()
        .allow_origin(origin)
        .allow_methods([Method::GET, Method::POST, Method::PATCH, Method::DELETE])
        .allow_headers([AUTHORIZATION, CONTENT_TYPE]);

    let app = Router::new()
        .route("/healthz", get(healthz))
        .route("/readyz", get(readyz))
        .nest("/api/v1", routes::api_router())
        .with_state(state)
        .layer(cors)
        .layer(TraceLayer::new_for_http());

    let listener = tokio::net::TcpListener::bind(&cfg.bind_addr).await?;
    tracing::info!(addr = %cfg.bind_addr, "listening");
    axum::serve(listener, app).await?;
    Ok(())
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

//! 라인이웃 백엔드 진입점.
//! 라우팅·핸들러는 `lib.rs`에 있고, 여기선 환경 로드 + 실행만.

use std::sync::Arc;

use axum::http::HeaderValue;
use linenb_backend::{build_app, config, db, tasks, AppState};

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

    let app = build_app(state, origin);

    let listener = tokio::net::TcpListener::bind(&cfg.bind_addr).await?;
    tracing::info!(addr = %cfg.bind_addr, "listening");
    axum::serve(listener, app).await?;
    Ok(())
}

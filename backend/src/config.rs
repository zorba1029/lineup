//! 환경 변수 로딩. `.env` 파일이 있으면 미리 dotenvy로 import 되어 있다고 가정.

use anyhow::Context;

#[derive(Debug, Clone)]
pub struct Config {
    pub database_url: String,
    pub jwt_secret: String,
    pub jwt_access_ttl_sec: i64,
    pub jwt_refresh_ttl_sec: i64,
    pub bind_addr: String,
    pub cors_origin: String,
}

pub fn load() -> anyhow::Result<Config> {
    Ok(Config {
        database_url: std::env::var("DATABASE_URL").context("DATABASE_URL not set")?,
        jwt_secret: std::env::var("JWT_SECRET").context("JWT_SECRET not set")?,
        jwt_access_ttl_sec: parse_or("JWT_ACCESS_TTL_SEC", 900),
        jwt_refresh_ttl_sec: parse_or("JWT_REFRESH_TTL_SEC", 2_592_000),
        bind_addr: std::env::var("BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".into()),
        cors_origin: std::env::var("CORS_ORIGIN").unwrap_or_else(|_| "http://localhost:5173".into()),
    })
}

fn parse_or<T: std::str::FromStr>(key: &str, default: T) -> T {
    std::env::var(key)
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(default)
}

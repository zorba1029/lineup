//! 통합 테스트 공통 헬퍼.
//!
//! `#[sqlx::test]` 매크로가 fresh DB를 만들고 migrations 적용 후 MySqlPool을 주입.
//! 실행에는 root 권한의 DATABASE_URL이 필요 (CREATE/DROP DATABASE):
//!   DATABASE_URL=mysql://root:dev@localhost:3306/linenb cargo test
//!
//! .env가 있으면 dotenvy가 로드함.

#![allow(dead_code)] // 헬퍼는 일부 파일에서만 쓰일 수 있음

use std::sync::Arc;

use axum::body::Body;
use axum::http::{HeaderValue, Method, Request, StatusCode};
use axum::Router;
use linenb_backend::{build_app, AppState};
use serde_json::{json, Value};
use sqlx::MySqlPool;
use tower::ServiceExt;

/// 테스트용 axum app + state. JWT 시크릿은 고정값.
pub fn test_app(pool: MySqlPool) -> Router {
    let state = AppState {
        db: pool,
        jwt_secret: Arc::new(b"test-secret-32bytes-of-something!!!!".to_vec()),
        jwt_access_ttl_sec: 900,
        jwt_refresh_ttl_sec: 3600,
    };
    // CORS는 oneshot에선 사실상 무의미 — 임의 origin.
    build_app(state, HeaderValue::from_static("http://test.local"))
}

/// HTTP 호출. 응답 status + JSON body 반환. body가 없으면 Value::Null.
pub async fn call(
    app: &Router,
    method: Method,
    path: &str,
    token: Option<&str>,
    body: Option<&Value>,
) -> (StatusCode, Value) {
    let mut builder = Request::builder().method(method).uri(path);
    if let Some(t) = token {
        builder = builder.header("Authorization", format!("Bearer {t}"));
    }
    let req = match body {
        Some(b) => builder
            .header("Content-Type", "application/json")
            .body(Body::from(serde_json::to_vec(b).unwrap()))
            .unwrap(),
        None => builder.body(Body::empty()).unwrap(),
    };
    let resp = app.clone().oneshot(req).await.unwrap();
    let status = resp.status();
    let bytes = axum::body::to_bytes(resp.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: Value = if bytes.is_empty() {
        Value::Null
    } else {
        serde_json::from_slice(&bytes).unwrap_or(Value::Null)
    };
    (status, json)
}

/// 기본 라인(101동 01라인)에 사용자 등록 + access token 반환. setup용.
pub async fn signup_default(app: &Router, username: &str, unit: &str) -> String {
    let body = json!({
        "username": username,
        "password": "test1234",
        "name": username,
        "dong": "101동",
        "unit": unit,
        "phone": format!("010-0000-{:04}", username.bytes().map(|b| b as u32).sum::<u32>() % 10000),
    });
    let (status, json) = call(app, Method::POST, "/api/v1/auth/signup", None, Some(&body)).await;
    assert_eq!(
        status,
        StatusCode::OK,
        "signup '{username}' failed: {json}"
    );
    json["accessToken"].as_str().unwrap().to_string()
}

/// 다른 라인(`line_no`)에 사용자 등록.
pub async fn signup_other_line(
    app: &Router,
    username: &str,
    dong: &str,
    unit: &str,
) -> String {
    let body = json!({
        "username": username,
        "password": "test1234",
        "name": username,
        "dong": dong,
        "unit": unit,
        "phone": "010-9999-9999",
    });
    let (status, json) = call(app, Method::POST, "/api/v1/auth/signup", None, Some(&body)).await;
    assert_eq!(status, StatusCode::OK, "signup other line failed: {json}");
    json["accessToken"].as_str().unwrap().to_string()
}

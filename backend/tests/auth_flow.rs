//! 인증 플로우 통합 테스트.
//! 실행: `DATABASE_URL=mysql://root:dev@localhost:3306/linenb cargo test --test auth_flow`

mod common;

use axum::http::{Method, StatusCode};
use common::{call, test_app};
use serde_json::json;
use sqlx::MySqlPool;

#[sqlx::test(migrations = "./migrations")]
async fn signup_login_me_roundtrip(pool: MySqlPool) {
    let app = test_app(pool);

    let signup_body = json!({
        "username": "alice",
        "password": "hunter22",
        "name": "앨리스",
        "dong": "101동",
        "unit": "101호",
        "phone": "010-1234-5678",
    });
    let (status, body) = call(&app, Method::POST, "/api/v1/auth/signup", None, Some(&signup_body)).await;
    assert_eq!(status, StatusCode::OK, "signup body: {body}");
    assert!(body["accessToken"].is_string());
    assert!(body["refreshToken"].is_string());
    assert_eq!(body["user"]["username"], "alice");
    assert_eq!(body["user"]["line_no"], "01"); // "101호" → "01" 자동 추출

    // login으로 동일 자격 검증
    let (status, login_body) = call(
        &app,
        Method::POST,
        "/api/v1/auth/login",
        None,
        Some(&json!({"username": "alice", "password": "hunter22"})),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let access = login_body["accessToken"].as_str().unwrap();

    // /me로 토큰 검증
    let (status, me) = call(&app, Method::GET, "/api/v1/auth/me", Some(access), None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(me["user"]["username"], "alice");
    assert_eq!(me["user"]["dong"], "101동");
}

#[sqlx::test(migrations = "./migrations")]
async fn duplicate_username_returns_409(pool: MySqlPool) {
    let app = test_app(pool);

    let body = json!({
        "username": "bob",
        "password": "test1234",
        "name": "밥",
        "dong": "101동",
        "unit": "101호",
        "phone": "010-1111-1111",
    });
    let (s1, _) = call(&app, Method::POST, "/api/v1/auth/signup", None, Some(&body)).await;
    assert_eq!(s1, StatusCode::OK);

    let (s2, json) = call(&app, Method::POST, "/api/v1/auth/signup", None, Some(&body)).await;
    assert_eq!(s2, StatusCode::CONFLICT, "got body: {json}");
    assert_eq!(json["error"], "conflict");
}

#[sqlx::test(migrations = "./migrations")]
async fn login_with_wrong_password_returns_401(pool: MySqlPool) {
    let app = test_app(pool);

    let _ = call(
        &app,
        Method::POST,
        "/api/v1/auth/signup",
        None,
        Some(&json!({
            "username": "carol",
            "password": "correct-password",
            "name": "캐롤",
            "dong": "101동",
            "unit": "201호",
            "phone": "010-2222-2222",
        })),
    )
    .await;

    let (status, body) = call(
        &app,
        Method::POST,
        "/api/v1/auth/login",
        None,
        Some(&json!({"username": "carol", "password": "WRONG"})),
    )
    .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    assert_eq!(body["error"], "unauthorized");
}

#[sqlx::test(migrations = "./migrations")]
async fn me_without_token_returns_401(pool: MySqlPool) {
    let app = test_app(pool);
    let (status, _) = call(&app, Method::GET, "/api/v1/auth/me", None, None).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[sqlx::test(migrations = "./migrations")]
async fn signup_with_invalid_unit_returns_400(pool: MySqlPool) {
    let app = test_app(pool);
    let (status, _) = call(
        &app,
        Method::POST,
        "/api/v1/auth/signup",
        None,
        Some(&json!({
            "username": "dave",
            "password": "test1234",
            "name": "데이브",
            "dong": "101동",
            "unit": "ABC", // "호"로 끝나지 않음 → BadRequest
            "phone": "010-3333-3333",
        })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

//! Offer 라이프사이클 + accept 트랜잭션 동시성 통합 테스트.
//! 실행: `DATABASE_URL=mysql://root:dev@localhost:3306/linenb cargo test --test offers_flow`
//!
//! 가장 중요한 테스트는 `concurrent_accept_only_one_succeeds` —
//! 동시에 두 accept 요청이 들어와도 SELECT FOR UPDATE 트랜잭션이 직렬화하는지 검증.

mod common;

use axum::http::{Method, StatusCode};
use common::{call, signup_default, test_app};
use serde_json::json;
use sqlx::MySqlPool;

async fn create_request_and_offers(app: &axum::Router) -> (String, u64, u64, u64) {
    // hong: 글 작성
    let hong = signup_default(app, "hong", "101호").await;
    let (_, created) = call(
        app,
        Method::POST,
        "/api/v1/requests",
        Some(&hong),
        Some(&json!({
            "name": "드릴",
            "category": "공구",
            "description": "선반 달려고요",
            "urgent": false,
        })),
    )
    .await;
    let request_id = created["id"].as_u64().unwrap();

    // kim, lee: pending offer 등록
    let kim = signup_default(app, "kim", "201호").await;
    let lee = signup_default(app, "lee", "301호").await;
    let offer_body = json!({
        "rental_time": "10분 후",
        "return_time": "1시간 후",
        "rental_place": "1층 로비",
        "return_place": "1층 로비",
    });

    let (_, kim_offer) = call(
        app,
        Method::POST,
        &format!("/api/v1/requests/{request_id}/offers"),
        Some(&kim),
        Some(&offer_body),
    )
    .await;
    let kim_offer_id = kim_offer["id"].as_u64().unwrap();

    let (_, lee_offer) = call(
        app,
        Method::POST,
        &format!("/api/v1/requests/{request_id}/offers"),
        Some(&lee),
        Some(&offer_body),
    )
    .await;
    let lee_offer_id = lee_offer["id"].as_u64().unwrap();

    (hong, request_id, kim_offer_id, lee_offer_id)
}

#[sqlx::test(migrations = "./migrations")]
async fn cannot_offer_on_own_request(pool: MySqlPool) {
    let app = test_app(pool);
    let hong = signup_default(&app, "hong", "101호").await;
    let (_, created) = call(
        &app,
        Method::POST,
        "/api/v1/requests",
        Some(&hong),
        Some(&json!({"name":"드릴","category":"공구","description":"x","urgent":false})),
    )
    .await;
    let request_id = created["id"].as_u64().unwrap();

    let (status, _) = call(
        &app,
        Method::POST,
        &format!("/api/v1/requests/{request_id}/offers"),
        Some(&hong),
        Some(&json!({
            "rental_time":"5분","return_time":"1h","rental_place":"x","return_place":"x"
        })),
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

#[sqlx::test(migrations = "./migrations")]
async fn duplicate_pending_offer_returns_409(pool: MySqlPool) {
    let app = test_app(pool);
    let hong = signup_default(&app, "hong", "101호").await;
    let kim = signup_default(&app, "kim", "201호").await;
    let (_, created) = call(
        &app,
        Method::POST,
        "/api/v1/requests",
        Some(&hong),
        Some(&json!({"name":"드릴","category":"공구","description":"x","urgent":false})),
    )
    .await;
    let request_id = created["id"].as_u64().unwrap();
    let offer_body = json!({
        "rental_time":"5분","return_time":"1h","rental_place":"로비","return_place":"로비"
    });

    let (s1, _) = call(
        &app,
        Method::POST,
        &format!("/api/v1/requests/{request_id}/offers"),
        Some(&kim),
        Some(&offer_body),
    )
    .await;
    assert_eq!(s1, StatusCode::CREATED);

    let (s2, _) = call(
        &app,
        Method::POST,
        &format!("/api/v1/requests/{request_id}/offers"),
        Some(&kim),
        Some(&offer_body),
    )
    .await;
    assert_eq!(s2, StatusCode::CONFLICT);
}

/// 핵심 동시성 테스트.
/// hong이 같은 offer를 동시에 두 번 accept하면 정확히 한 쪽만 200, 다른 쪽 409.
#[sqlx::test(migrations = "./migrations")]
async fn concurrent_accept_only_one_succeeds(pool: MySqlPool) {
    let app = test_app(pool);
    let (hong, _request_id, kim_offer_id, _) = create_request_and_offers(&app).await;

    let app1 = app.clone();
    let app2 = app.clone();
    let token1 = hong.clone();
    let token2 = hong;
    let path = format!("/api/v1/offers/{kim_offer_id}/accept");
    let path1 = path.clone();
    let path2 = path;

    let f1 = tokio::spawn(async move { call(&app1, Method::POST, &path1, Some(&token1), None).await });
    let f2 = tokio::spawn(async move { call(&app2, Method::POST, &path2, Some(&token2), None).await });
    let (r1, r2) = tokio::join!(f1, f2);
    let (s1, _) = r1.unwrap();
    let (s2, _) = r2.unwrap();

    let oks = [s1, s2].iter().filter(|s| s.is_success()).count();
    let conflicts = [s1, s2].iter().filter(|s| **s == StatusCode::CONFLICT).count();
    assert_eq!(
        oks, 1,
        "exactly one accept should succeed (got s1={s1} s2={s2})"
    );
    assert_eq!(conflicts, 1);
}

/// accept 후 다른 offer를 또 accept 시도 → request가 이미 matched라 409.
#[sqlx::test(migrations = "./migrations")]
async fn cannot_accept_second_offer_after_match(pool: MySqlPool) {
    let app = test_app(pool);
    let (hong, request_id, kim_offer_id, lee_offer_id) = create_request_and_offers(&app).await;

    // 첫 accept 성공
    let (s1, matched) = call(
        &app,
        Method::POST,
        &format!("/api/v1/offers/{kim_offer_id}/accept"),
        Some(&hong),
        None,
    )
    .await;
    assert_eq!(s1, StatusCode::OK, "first accept body: {matched}");
    // 응답에 양 당사자 phone 노출됨
    assert!(matched["request"]["author"]["phone"].is_string());
    assert!(matched["offer"]["offerer"]["phone"].is_string());

    // 같은 request의 다른 offer를 accept 시도 → 409 (request가 matched 상태)
    let (s2, _) = call(
        &app,
        Method::POST,
        &format!("/api/v1/offers/{lee_offer_id}/accept"),
        Some(&hong),
        None,
    )
    .await;
    assert_eq!(s2, StatusCode::CONFLICT);

    // request 상태 확인 — matched, lee의 offer는 자동 rejected
    let (_, detail) = call(
        &app,
        Method::GET,
        &format!("/api/v1/requests/{request_id}"),
        Some(&hong),
        None,
    )
    .await;
    assert_eq!(detail["request"]["status"], "matched");
    let lee_offer = detail["offers"]
        .as_array()
        .unwrap()
        .iter()
        .find(|o| o["id"].as_u64() == Some(lee_offer_id))
        .expect("lee's offer in detail");
    assert_eq!(lee_offer["status"], "rejected");
}

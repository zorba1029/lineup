//! Offer 라이프사이클 + accept 트랜잭션 동시성 통합 테스트.
//! 실행: `DATABASE_URL=mysql://root:dev@localhost:3306/linenb cargo test --test offers_flow`
//!
//! 가장 중요한 테스트는 `concurrent_accept_only_one_succeeds` —
//! 동시에 두 accept 요청이 들어와도 SELECT FOR UPDATE 트랜잭션이 직렬화하는지 검증.

mod common;

use axum::http::{Method, StatusCode};
use common::{call, login_default, signup_default, test_app};
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

/// lent=true 필터 — pending offer만 있을 때도(아직 수락 전) 빌려준 글에 표시.
/// 사용자 케이스: "lee가 빌려주겠다고 응답하면, 요청자가 수락 전이라도 lee의
/// '내가 빌려준 글'에 보여야 함".
#[sqlx::test(migrations = "./migrations")]
async fn lent_filter_includes_pending_offers(pool: MySqlPool) {
    let app = test_app(pool);
    let (hong, request_id, _kim_offer, _lee_offer) = create_request_and_offers(&app).await;

    // 아직 hong이 수락 X — kim, lee 둘 다 pending 상태
    let kim = login_default(&app, "kim").await;
    let lee = login_default(&app, "lee").await;

    let (_, kim_list) = call(
        &app,
        Method::GET,
        "/api/v1/requests?lent=true",
        Some(&kim),
        None,
    )
    .await;
    let kim_items = kim_list["items"].as_array().unwrap();
    assert_eq!(kim_items.len(), 1, "kim with pending offer should see request: {kim_list}");
    assert_eq!(kim_items[0]["id"].as_u64(), Some(request_id));

    let (_, lee_list) = call(
        &app,
        Method::GET,
        "/api/v1/requests?lent=true",
        Some(&lee),
        None,
    )
    .await;
    assert_eq!(lee_list["items"].as_array().unwrap().len(), 1, "lee with pending offer should see request: {lee_list}");

    // hong은 작성자라 lent에 안 보임
    let (_, hong_list) = call(
        &app,
        Method::GET,
        "/api/v1/requests?lent=true",
        Some(&hong),
        None,
    )
    .await;
    assert_eq!(hong_list["items"].as_array().unwrap().len(), 0);
}

/// lent=true 필터 — accepted 후의 동작. 거절된 offerer는 빠짐.
/// PLAN.md §1.B "내가 빌려준 글" — 정식 매칭 시나리오.
#[sqlx::test(migrations = "./migrations")]
async fn lent_filter_shows_my_accepted_offers(pool: MySqlPool) {
    let app = test_app(pool);
    let (hong, request_id, kim_offer_id, _lee_offer_id) = create_request_and_offers(&app).await;

    // hong이 kim의 offer 수락 → kim은 accepted offerer
    let (status, _) = call(
        &app,
        Method::POST,
        &format!("/api/v1/offers/{kim_offer_id}/accept"),
        Some(&hong),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    // kim 시점: lent=true 시 hong의 글이 보여야 함
    let kim = login_default(&app, "kim").await;
    let (status, list) = call(
        &app,
        Method::GET,
        "/api/v1/requests?lent=true",
        Some(&kim),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let items = list["items"].as_array().unwrap();
    assert_eq!(items.len(), 1, "kim should see 1 lent request: {list}");
    assert_eq!(items[0]["id"].as_u64(), Some(request_id));

    // lee 시점: rejected (자동) — lent=true 시 빈 리스트
    let lee = login_default(&app, "lee").await;
    let (_, list) = call(
        &app,
        Method::GET,
        "/api/v1/requests?lent=true",
        Some(&lee),
        None,
    )
    .await;
    assert_eq!(list["items"].as_array().unwrap().len(), 0, "lee shouldn't see any lent: {list}");

    // hong 시점 (작성자) — lent=true 시 빈 리스트 (hong은 빌려준 게 아님)
    let (_, list) = call(
        &app,
        Method::GET,
        "/api/v1/requests?lent=true",
        Some(&hong),
        None,
    )
    .await;
    assert_eq!(list["items"].as_array().unwrap().len(), 0);
}

/// pending_offer_count가 list / detail 양쪽에 일관되게 노출되는지.
/// 작성자(요청자)가 메인 페이지에서 "N명 응답" 칩을 볼 수 있는 핵심 보장.
#[sqlx::test(migrations = "./migrations")]
async fn pending_offer_count_visible_in_list_and_detail(pool: MySqlPool) {
    let app = test_app(pool);
    let (hong, request_id, _kim_offer, _lee_offer) = create_request_and_offers(&app).await;

    // detail: hong (작성자) 시점 — count 2
    let (status, detail) = call(
        &app,
        Method::GET,
        &format!("/api/v1/requests/{request_id}"),
        Some(&hong),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(detail["request"]["pending_offer_count"], 2);

    // list: hong 본인 글에 응답 2건이 표시돼야 함
    let (status, list) = call(
        &app,
        Method::GET,
        "/api/v1/requests?mine=true",
        Some(&hong),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let item = list["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|i| i["id"].as_u64() == Some(request_id))
        .expect("hong's request in list");
    assert_eq!(item["pending_offer_count"], 2);
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

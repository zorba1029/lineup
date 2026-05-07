//! Request CRUD + (dong, line_no) 격리 통합 테스트.
//! 실행: `DATABASE_URL=mysql://root:dev@localhost:3306/linenb cargo test --test requests_flow`

mod common;

use axum::http::{Method, StatusCode};
use common::{call, signup_default, signup_other_line, test_app};
use serde_json::json;
use sqlx::MySqlPool;

#[sqlx::test(migrations = "./migrations")]
async fn same_line_neighbor_sees_request(pool: MySqlPool) {
    let app = test_app(pool);

    // hong (101동 101호) 글 작성
    let hong = signup_default(&app, "hong", "101호").await;
    let (status, created) = call(
        &app,
        Method::POST,
        "/api/v1/requests",
        Some(&hong),
        Some(&json!({
            "name": "드릴",
            "category": "공구",
            "description": "벽에 선반 달려고요",
            "urgent": true,
        })),
    )
    .await;
    assert_eq!(status, StatusCode::CREATED, "create body: {created}");
    let request_id = created["id"].as_u64().unwrap();
    assert_eq!(created["status"], "open");

    // kim (101동 201호) 같은 라인이라 글이 보임
    let kim = signup_default(&app, "kim", "201호").await;
    let (status, list) = call(&app, Method::GET, "/api/v1/requests", Some(&kim), None).await;
    assert_eq!(status, StatusCode::OK);
    let items = list["items"].as_array().unwrap();
    assert_eq!(items.len(), 1, "kim should see 1 request: {list}");
    assert_eq!(items[0]["id"], request_id);

    // 상세도 접근 가능
    let (status, detail) = call(
        &app,
        Method::GET,
        &format!("/api/v1/requests/{request_id}"),
        Some(&kim),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(detail["request"]["name"], "드릴");
    // 이웃은 phone을 보지 않음 (matched 아님)
    assert!(detail["request"]["author"]["phone"].is_null());
}

#[sqlx::test(migrations = "./migrations")]
async fn different_line_does_not_see_request(pool: MySqlPool) {
    let app = test_app(pool);

    let hong = signup_default(&app, "hong", "101호").await;
    let (_, created) = call(
        &app,
        Method::POST,
        "/api/v1/requests",
        Some(&hong),
        Some(&json!({
            "name": "사다리",
            "category": "공구",
            "description": "잠깐만",
            "urgent": false,
        })),
    )
    .await;
    let request_id = created["id"].as_u64().unwrap();

    // 다른 라인 (102호 = line_no "02") 사용자
    let stranger = signup_other_line(&app, "stranger", "101동", "102호").await;
    let (status, list) = call(&app, Method::GET, "/api/v1/requests", Some(&stranger), None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(list["items"].as_array().unwrap().len(), 0);

    // 상세 직접 접근도 404
    let (status, _) = call(
        &app,
        Method::GET,
        &format!("/api/v1/requests/{request_id}"),
        Some(&stranger),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[sqlx::test(migrations = "./migrations")]
async fn neighbor_cannot_patch_or_delete(pool: MySqlPool) {
    let app = test_app(pool);

    let hong = signup_default(&app, "hong", "101호").await;
    let (_, created) = call(
        &app,
        Method::POST,
        "/api/v1/requests",
        Some(&hong),
        Some(&json!({
            "name": "망치",
            "category": "공구",
            "description": "못 박을게요",
            "urgent": false,
        })),
    )
    .await;
    let request_id = created["id"].as_u64().unwrap();

    let kim = signup_default(&app, "kim", "201호").await;

    // PATCH 시도 → 403
    let (status, _) = call(
        &app,
        Method::PATCH,
        &format!("/api/v1/requests/{request_id}"),
        Some(&kim),
        Some(&json!({"description": "해킹"})),
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);

    // DELETE 시도 → 403
    let (status, _) = call(
        &app,
        Method::DELETE,
        &format!("/api/v1/requests/{request_id}"),
        Some(&kim),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);

    // 작성자(hong)는 PATCH 가능
    let (status, _) = call(
        &app,
        Method::PATCH,
        &format!("/api/v1/requests/{request_id}"),
        Some(&hong),
        Some(&json!({"urgent": true})),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
}

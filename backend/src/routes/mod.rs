//! `/api/v1` 라우터 조립.

use axum::Router;

use crate::AppState;

pub mod auth;
pub mod offers;
pub mod requests;

pub fn api_router() -> Router<AppState> {
    let requests_router = requests::router().merge(offers::requests_scoped_router());
    Router::new()
        .nest("/auth", auth::router())
        .nest("/requests", requests_router)
        .nest("/offers", offers::top_router())
}

//! User DB row + API 응답 모델.

use serde::Serialize;
use sqlx::FromRow;

/// DB의 `users` 테이블 한 row. `password_hash` 포함하므로 절대 직렬화하지 말 것.
#[derive(Debug, Clone, FromRow)]
pub struct UserRow {
    pub id: u64,
    pub username: String,
    pub password_hash: String,
    pub name: String,
    pub dong: String,
    pub unit: String,
    pub line_no: String,
    pub phone: String,
}

/// 클라이언트에 노출하는 사용자 정보.
#[derive(Debug, Clone, Serialize)]
pub struct UserPublic {
    pub id: u64,
    pub username: String,
    pub name: String,
    pub dong: String,
    pub unit: String,
    pub line_no: String,
    pub phone: String,
}

impl From<UserRow> for UserPublic {
    fn from(r: UserRow) -> Self {
        Self {
            id: r.id,
            username: r.username,
            name: r.name,
            dong: r.dong,
            unit: r.unit,
            line_no: r.line_no,
            phone: r.phone,
        }
    }
}

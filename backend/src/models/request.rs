//! Request DB row + API DTOs.

use chrono::{DateTime, NaiveDateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use validator::Validate;

/// `requests JOIN users` 결과를 한 row에 평탄화. 작성자 정보 컬럼은 SQL에서 alias.
#[derive(Debug, Clone, FromRow)]
pub struct RequestWithAuthorRow {
    pub id: u64,
    pub user_id: u64,
    pub name: String,
    pub category: String,
    pub description: String,
    pub urgent: bool,
    pub status: String,
    pub start_time: NaiveDateTime,
    pub expires_at: NaiveDateTime,
    pub created_at: NaiveDateTime,
    pub author_name: String,
    pub author_dong: String,
    pub author_unit: String,
    pub author_line_no: String,
    pub author_phone: String,
}

#[derive(Debug, Serialize)]
pub struct AuthorInfo {
    pub id: u64,
    pub name: String,
    pub dong: String,
    pub unit: String,
    pub line_no: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phone: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct RequestPublic {
    pub id: u64,
    pub name: String,
    pub category: String,
    pub description: String,
    pub urgent: bool,
    pub status: String,
    pub start_time: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub author: AuthorInfo,
}

impl RequestWithAuthorRow {
    /// `include_phone=true`는 거래 성사 후(matched)에만. PLAN.md §10.
    pub fn into_public(self, include_phone: bool) -> RequestPublic {
        RequestPublic {
            id: self.id,
            name: self.name,
            category: self.category,
            description: self.description,
            urgent: self.urgent,
            status: self.status,
            start_time: DateTime::<Utc>::from_naive_utc_and_offset(self.start_time, Utc),
            expires_at: DateTime::<Utc>::from_naive_utc_and_offset(self.expires_at, Utc),
            created_at: DateTime::<Utc>::from_naive_utc_and_offset(self.created_at, Utc),
            author: AuthorInfo {
                id: self.user_id,
                name: self.author_name,
                dong: self.author_dong,
                unit: self.author_unit,
                line_no: self.author_line_no,
                phone: if include_phone { Some(self.author_phone) } else { None },
            },
        }
    }
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateRequestBody {
    #[validate(length(min = 1, max = 80))]
    pub name: String,
    #[validate(length(min = 1, max = 20))]
    pub category: String,
    #[validate(length(min = 1, max = 200))]
    pub description: String,
    pub urgent: bool,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateRequestBody {
    #[validate(length(min = 1, max = 200))]
    pub description: Option<String>,
    pub urgent: Option<bool>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_row() -> RequestWithAuthorRow {
        RequestWithAuthorRow {
            id: 1,
            user_id: 7,
            name: "드릴".into(),
            category: "공구".into(),
            description: "선반 달려고요".into(),
            urgent: true,
            status: "open".into(),
            start_time: NaiveDateTime::default(),
            expires_at: NaiveDateTime::default(),
            created_at: NaiveDateTime::default(),
            author_name: "홍길동".into(),
            author_dong: "101동".into(),
            author_unit: "101호".into(),
            author_line_no: "01".into(),
            author_phone: "010-1234-5678".into(),
        }
    }

    #[test]
    fn hides_phone_by_default() {
        let p = sample_row().into_public(false);
        assert!(p.author.phone.is_none());
    }

    #[test]
    fn includes_phone_when_requested() {
        let p = sample_row().into_public(true);
        assert_eq!(p.author.phone.as_deref(), Some("010-1234-5678"));
    }
}

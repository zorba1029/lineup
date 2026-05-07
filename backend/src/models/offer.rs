//! Offer DB row + API DTOs.

use chrono::{DateTime, NaiveDateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use validator::Validate;

/// `offers JOIN users` 결과를 평탄화. 빌려주는 사람(offerer) 정보 컬럼은 SQL alias.
#[derive(Debug, Clone, FromRow)]
pub struct OfferWithOffererRow {
    pub id: u64,
    pub request_id: u64,
    pub user_id: u64,
    pub rental_time: String,
    pub return_time: String,
    pub rental_place: String,
    pub return_place: String,
    pub status: String,
    pub created_at: NaiveDateTime,
    pub offerer_name: String,
    pub offerer_dong: String,
    pub offerer_unit: String,
    pub offerer_line_no: String,
    pub offerer_phone: String,
}

#[derive(Debug, Serialize)]
pub struct OffererInfo {
    pub id: u64,
    pub name: String,
    pub dong: String,
    pub unit: String,
    pub line_no: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phone: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct OfferPublic {
    pub id: u64,
    pub request_id: u64,
    pub rental_time: String,
    pub return_time: String,
    pub rental_place: String,
    pub return_place: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub offerer: OffererInfo,
}

impl OfferWithOffererRow {
    /// `include_phone=true`는 거래 성사 후 양 당사자에게만. PLAN.md §10.
    pub fn into_public(self, include_phone: bool) -> OfferPublic {
        OfferPublic {
            id: self.id,
            request_id: self.request_id,
            rental_time: self.rental_time,
            return_time: self.return_time,
            rental_place: self.rental_place,
            return_place: self.return_place,
            status: self.status,
            created_at: DateTime::<Utc>::from_naive_utc_and_offset(self.created_at, Utc),
            offerer: OffererInfo {
                id: self.user_id,
                name: self.offerer_name,
                dong: self.offerer_dong,
                unit: self.offerer_unit,
                line_no: self.offerer_line_no,
                phone: if include_phone {
                    Some(self.offerer_phone)
                } else {
                    None
                },
            },
        }
    }
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateOfferBody {
    #[validate(length(min = 1, max = 20))]
    pub rental_time: String,
    #[validate(length(min = 1, max = 20))]
    pub return_time: String,
    #[validate(length(min = 1, max = 60))]
    pub rental_place: String,
    #[validate(length(min = 1, max = 60))]
    pub return_place: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateOfferBody {
    #[validate(length(min = 1, max = 20))]
    pub rental_time: Option<String>,
    #[validate(length(min = 1, max = 20))]
    pub return_time: Option<String>,
    #[validate(length(min = 1, max = 60))]
    pub rental_place: Option<String>,
    #[validate(length(min = 1, max = 60))]
    pub return_place: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_row() -> OfferWithOffererRow {
        OfferWithOffererRow {
            id: 1,
            request_id: 10,
            user_id: 7,
            rental_time: "5분 후".into(),
            return_time: "1시간 후".into(),
            rental_place: "101동 1층 로비".into(),
            return_place: "101동 1층 로비".into(),
            status: "pending".into(),
            created_at: NaiveDateTime::default(),
            offerer_name: "김길동".into(),
            offerer_dong: "101동".into(),
            offerer_unit: "201호".into(),
            offerer_line_no: "01".into(),
            offerer_phone: "010-9876-5432".into(),
        }
    }

    #[test]
    fn hides_phone_by_default() {
        let p = sample_row().into_public(false);
        assert!(p.offerer.phone.is_none());
    }

    #[test]
    fn includes_phone_when_requested() {
        let p = sample_row().into_public(true);
        assert_eq!(p.offerer.phone.as_deref(), Some("010-9876-5432"));
    }
}

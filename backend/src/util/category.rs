//! 게시글 카테고리 validator. PLAN.md §10 — DB·FE·BE 모두 한글 문자열 그대로 사용.

use crate::error::AppError;

pub const CATEGORIES: &[&str] = &["공구", "주방", "오락", "전자기기", "가전", "기타"];

pub fn validate_category(s: &str) -> Result<(), AppError> {
    if CATEGORIES.contains(&s) {
        Ok(())
    } else {
        Err(AppError::BadRequest(format!(
            "유효하지 않은 카테고리: {s}"
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_all_listed_categories() {
        for c in CATEGORIES {
            assert!(validate_category(c).is_ok(), "should accept {c}");
        }
    }

    #[test]
    fn rejects_empty() {
        assert!(matches!(validate_category(""), Err(AppError::BadRequest(_))));
    }

    #[test]
    fn rejects_unknown_korean() {
        assert!(matches!(validate_category("의류"), Err(AppError::BadRequest(_))));
    }

    #[test]
    fn rejects_english() {
        assert!(matches!(validate_category("tool"), Err(AppError::BadRequest(_))));
    }

    #[test]
    fn rejects_partial_match() {
        // "공구류"는 "공구"로 시작하지만 정확히 일치하지 않으므로 거부.
        assert!(matches!(validate_category("공구류"), Err(AppError::BadRequest(_))));
    }
}

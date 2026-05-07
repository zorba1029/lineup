//! 호수 → 라인 번호 추출. "101호" → "01", "1502호" → "02".
//!
//! 같은 라인 = 호수 끝 두 자리가 같은 이웃. PLAN.md §6.1 규약.

use crate::error::AppError;

pub fn extract_line_no(unit: &str) -> Result<String, AppError> {
    let digits = unit
        .strip_suffix('호')
        .ok_or_else(|| AppError::BadRequest("호수는 '호'로 끝나야 합니다".into()))?;
    let chars: Vec<char> = digits.chars().collect();
    if chars.len() < 2 || !chars[chars.len() - 2..].iter().all(|c| c.is_ascii_digit()) {
        return Err(AppError::BadRequest(
            "호수에서 라인 번호를 추출할 수 없습니다".into(),
        ));
    }
    Ok(chars[chars.len() - 2..].iter().collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_two_digit_unit() {
        assert_eq!(extract_line_no("101호").unwrap(), "01");
        assert_eq!(extract_line_no("203호").unwrap(), "03");
    }

    #[test]
    fn extracts_from_high_floor_unit() {
        assert_eq!(extract_line_no("1502호").unwrap(), "02");
        assert_eq!(extract_line_no("999912호").unwrap(), "12");
    }

    #[test]
    fn rejects_unit_without_suffix() {
        assert!(matches!(extract_line_no("101"), Err(AppError::BadRequest(_))));
    }

    #[test]
    fn rejects_unit_too_short() {
        assert!(matches!(extract_line_no("1호"), Err(AppError::BadRequest(_))));
        assert!(matches!(extract_line_no("호"), Err(AppError::BadRequest(_))));
    }

    #[test]
    fn rejects_non_digit_tail() {
        assert!(matches!(extract_line_no("1ab호"), Err(AppError::BadRequest(_))));
    }

    #[test]
    fn rejects_empty() {
        assert!(matches!(extract_line_no(""), Err(AppError::BadRequest(_))));
    }
}

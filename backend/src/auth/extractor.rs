//! Bearer 토큰 → `AuthUser` axum extractor.
//! 핸들러에서 `auth: AuthUser` 한 줄로 인증된 사용자 컨텍스트 획득.

use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{header::AUTHORIZATION, request::Parts, HeaderMap},
};

use crate::auth::jwt::{self, TokenKind};
use crate::error::AppError;
use crate::AppState;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AuthUser {
    pub user_id: u64,
    pub dong: String,
    pub line_no: String,
}

/// 헤더 + 시크릿으로부터 `AuthUser`를 추출. 핵심 로직 분리(테스트용).
fn extract(headers: &HeaderMap, secret: &[u8]) -> Result<AuthUser, AppError> {
    let raw = headers
        .get(AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .ok_or(AppError::Unauthorized)?;
    let token = raw.strip_prefix("Bearer ").ok_or(AppError::Unauthorized)?;
    let claims = jwt::decode(secret, token).map_err(|_| AppError::Unauthorized)?;
    if claims.kind != TokenKind::Access {
        return Err(AppError::Unauthorized);
    }
    Ok(AuthUser {
        user_id: claims.user_id,
        dong: claims.dong,
        line_no: claims.line_no,
    })
}

#[async_trait]
impl FromRequestParts<AppState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        extract(&parts.headers, state.jwt_secret.as_ref())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::auth::jwt::{encode, exp_in, Claims};

    const SECRET: &[u8] = b"top-secret-key-of-at-least-32bytes!";

    fn token(kind: TokenKind, ttl: i64) -> String {
        encode(
            SECRET,
            &Claims {
                user_id: 7,
                dong: "101동".into(),
                line_no: "01".into(),
                kind,
                exp: exp_in(ttl),
            },
        )
        .unwrap()
    }

    fn headers_with(value: &str) -> HeaderMap {
        let mut h = HeaderMap::new();
        h.insert(AUTHORIZATION, value.parse().unwrap());
        h
    }

    #[test]
    fn valid_access_bearer_extracts_user() {
        let h = headers_with(&format!("Bearer {}", token(TokenKind::Access, 60)));
        let user = extract(&h, SECRET).unwrap();
        assert_eq!(user.user_id, 7);
        assert_eq!(user.dong, "101동");
        assert_eq!(user.line_no, "01");
    }

    #[test]
    fn missing_header_rejected() {
        let h = HeaderMap::new();
        assert!(matches!(extract(&h, SECRET), Err(AppError::Unauthorized)));
    }

    #[test]
    fn missing_bearer_prefix_rejected() {
        let h = headers_with(&format!("Token {}", token(TokenKind::Access, 60)));
        assert!(matches!(extract(&h, SECRET), Err(AppError::Unauthorized)));
    }

    #[test]
    fn invalid_jwt_rejected() {
        let h = headers_with("Bearer not.a.jwt");
        assert!(matches!(extract(&h, SECRET), Err(AppError::Unauthorized)));
    }

    #[test]
    fn wrong_secret_rejected() {
        let h = headers_with(&format!("Bearer {}", token(TokenKind::Access, 60)));
        assert!(matches!(extract(&h, b"different-secret"), Err(AppError::Unauthorized)));
    }

    #[test]
    fn refresh_token_rejected_as_access() {
        let h = headers_with(&format!("Bearer {}", token(TokenKind::Refresh, 60)));
        assert!(matches!(extract(&h, SECRET), Err(AppError::Unauthorized)));
    }

    #[test]
    fn expired_token_rejected() {
        let h = headers_with(&format!("Bearer {}", token(TokenKind::Access, -120)));
        assert!(matches!(extract(&h, SECRET), Err(AppError::Unauthorized)));
    }
}

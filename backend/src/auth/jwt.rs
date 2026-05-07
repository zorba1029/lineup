//! JWT encode/decode. Access/Refresh 토큰 분리는 `TokenKind`로 표현.

use chrono::Utc;
use jsonwebtoken::{decode as jwt_decode, encode as jwt_encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TokenKind {
    Access,
    Refresh,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Claims {
    pub user_id: u64,
    pub dong: String,
    pub line_no: String,
    pub kind: TokenKind,
    pub exp: i64,
}

pub fn encode(secret: &[u8], claims: &Claims) -> Result<String, jsonwebtoken::errors::Error> {
    jwt_encode(&Header::default(), claims, &EncodingKey::from_secret(secret))
}

pub fn decode(secret: &[u8], token: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
    let mut validation = Validation::default();
    validation.leeway = 0;
    let data = jwt_decode::<Claims>(token, &DecodingKey::from_secret(secret), &validation)?;
    Ok(data.claims)
}

/// 현재 시각 + ttl_sec 의 unix timestamp.
pub fn exp_in(ttl_sec: i64) -> i64 {
    Utc::now().timestamp() + ttl_sec
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample(kind: TokenKind, exp: i64) -> Claims {
        Claims {
            user_id: 42,
            dong: "101동".into(),
            line_no: "01".into(),
            kind,
            exp,
        }
    }

    #[test]
    fn access_roundtrip() {
        let secret = b"top-secret-key-of-at-least-32bytes!";
        let claims = sample(TokenKind::Access, exp_in(60));
        let token = encode(secret, &claims).unwrap();
        let decoded = decode(secret, &token).unwrap();
        assert_eq!(decoded, claims);
    }

    #[test]
    fn refresh_roundtrip() {
        let secret = b"top-secret-key-of-at-least-32bytes!";
        let claims = sample(TokenKind::Refresh, exp_in(3600));
        let token = encode(secret, &claims).unwrap();
        let decoded = decode(secret, &token).unwrap();
        assert_eq!(decoded.kind, TokenKind::Refresh);
        assert_eq!(decoded, claims);
    }

    #[test]
    fn wrong_secret_rejected() {
        let secret = b"top-secret-key-of-at-least-32bytes!";
        let other = b"different-secret-key-32-bytes-long!!";
        let token = encode(secret, &sample(TokenKind::Access, exp_in(60))).unwrap();
        assert!(decode(other, &token).is_err());
    }

    #[test]
    fn expired_token_rejected() {
        let secret = b"top-secret-key-of-at-least-32bytes!";
        let token = encode(secret, &sample(TokenKind::Access, exp_in(-1))).unwrap();
        assert!(decode(secret, &token).is_err());
    }

    #[test]
    fn tampered_token_rejected() {
        let secret = b"top-secret-key-of-at-least-32bytes!";
        let token = encode(secret, &sample(TokenKind::Access, exp_in(60))).unwrap();
        let mut bytes: Vec<u8> = token.into_bytes();
        // payload(중간 segment) 의 첫 바이트를 다른 base64 문자로 교체
        let dot1 = bytes.iter().position(|&c| c == b'.').unwrap();
        bytes[dot1 + 1] = if bytes[dot1 + 1] == b'A' { b'B' } else { b'A' };
        let tampered = String::from_utf8(bytes).unwrap();
        assert!(decode(secret, &tampered).is_err());
    }
}

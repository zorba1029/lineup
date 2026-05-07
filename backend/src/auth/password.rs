//! argon2id 비밀번호 해시·검증.

use argon2::{
    password_hash::{rand_core::OsRng, Error, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};

pub fn hash(password: &str) -> Result<String, Error> {
    let salt = SaltString::generate(&mut OsRng);
    let phc = Argon2::default()
        .hash_password(password.as_bytes(), &salt)?
        .to_string();
    Ok(phc)
}

pub fn verify(password: &str, hash: &str) -> Result<bool, Error> {
    let parsed = PasswordHash::new(hash)?;
    match Argon2::default().verify_password(password.as_bytes(), &parsed) {
        Ok(()) => Ok(true),
        Err(Error::Password) => Ok(false),
        Err(e) => Err(e),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hash_then_verify_succeeds() {
        let h = hash("hunter2").unwrap();
        assert!(verify("hunter2", &h).unwrap());
    }

    #[test]
    fn verify_wrong_password_fails() {
        let h = hash("hunter2").unwrap();
        assert!(!verify("not-it", &h).unwrap());
    }

    #[test]
    fn same_password_yields_different_hashes() {
        let a = hash("same").unwrap();
        let b = hash("same").unwrap();
        assert_ne!(a, b, "argon2 salt should make hashes differ");
    }
}

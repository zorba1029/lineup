//! 데모용 시드 데이터.
//!
//! 사용법:
//!   cargo run --bin seed              # hong이 이미 있으면 스킵
//!   cargo run --bin seed -- --reset   # 모두 지우고 재시드 (FK CASCADE로 requests/offers 같이 삭제)
//!
//! 시드되는 것:
//!   - 사용자 4명 (101동 01라인): hong / kim / lee / park, 비밀번호 1234
//!   - 요청 5건 (카테고리 분포)
//!   - hong의 드릴 글에 kim·lee가 등록한 pending offer 2건
//!     → 로그인 후 즉시 accept 데모 가능

use anyhow::Context;
use argon2::password_hash::{rand_core::OsRng, PasswordHasher, SaltString};
use argon2::Argon2;
use sqlx::MySqlPool;
use std::collections::HashMap;

fn hash_password(p: &str) -> anyhow::Result<String> {
    let salt = SaltString::generate(&mut OsRng);
    Ok(Argon2::default()
        .hash_password(p.as_bytes(), &salt)
        .map_err(|e| anyhow::anyhow!("argon2 hash failed: {e}"))?
        .to_string())
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    let reset = std::env::args().any(|a| a == "--reset");
    let url = std::env::var("DATABASE_URL").context("DATABASE_URL not set")?;
    let pool = MySqlPool::connect(&url).await?;

    let already: Option<(u64,)> =
        sqlx::query_as("SELECT id FROM users WHERE username = 'hong' LIMIT 1")
            .fetch_optional(&pool)
            .await?;

    if already.is_some() {
        if reset {
            println!("--reset: 기존 데이터 삭제 (FK CASCADE)");
            sqlx::query("DELETE FROM users").execute(&pool).await?;
        } else {
            println!("seed: 이미 적용됨 (hong 존재). --reset 으로 재시드 가능.");
            return Ok(());
        }
    }

    // ── 1. 사용자 ──
    let pw_hash = hash_password("1234")?;
    let users: [(&str, &str, &str, &str); 4] = [
        ("hong", "홍길동", "101호", "010-1111-1111"),
        ("kim", "김민수", "201호", "010-2222-2222"),
        ("lee", "이지영", "301호", "010-3333-3333"),
        ("park", "박서준", "401호", "010-4444-4444"),
    ];
    let mut user_ids: HashMap<&str, u64> = HashMap::new();
    for (username, name, unit, phone) in users {
        let res = sqlx::query(
            "INSERT INTO users (username, password_hash, name, dong, unit, line_no, phone) \
             VALUES (?, ?, ?, '101동', ?, '01', ?)",
        )
        .bind(username)
        .bind(&pw_hash)
        .bind(name)
        .bind(unit)
        .bind(phone)
        .execute(&pool)
        .await?;
        user_ids.insert(username, res.last_insert_id());
    }

    // ── 2. 요청 (start_time = NOW, expires_at = NOW + 72h) ──
    let requests: [(&str, &str, &str, &str, bool); 5] = [
        ("hong", "전동 드릴", "공구", "벽에 선반 달려고 30분만 빌리고 싶어요", true),
        ("kim", "케이크 틀", "주방", "아이 생일 케이크 만들려고요", false),
        ("lee", "보드게임", "오락", "주말에 가족이랑 같이 놀려고요", false),
        ("park", "보조배터리", "전자기기", "오늘 외출에 필요한데 깜빡했어요", true),
        ("hong", "청소 스팀기", "가전", "주말 대청소에 한 시간만 빌리고 싶어요", false),
    ];
    let mut request_ids: Vec<u64> = Vec::with_capacity(requests.len());
    for (author, name, cat, desc, urgent) in requests {
        let user_id = user_ids[author];
        let res = sqlx::query(
            "INSERT INTO requests (user_id, name, category, description, urgent, expires_at) \
             VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 72 HOUR))",
        )
        .bind(user_id)
        .bind(name)
        .bind(cat)
        .bind(desc)
        .bind(urgent)
        .execute(&pool)
        .await?;
        request_ids.push(res.last_insert_id());
    }

    // ── 3. hong의 드릴 글에 kim·lee가 pending offer 등록 ──
    let drill_id = request_ids[0];
    let offers: [(&str, &str, &str, &str, &str); 2] = [
        ("kim", "10분 후", "1시간 후", "101동 1층 로비", "101동 1층 로비"),
        (
            "lee",
            "30분 후",
            "2시간 후",
            "101동 엘리베이터 앞",
            "101동 엘리베이터 앞",
        ),
    ];
    for (offerer, rt, rt2, rp, rp2) in offers {
        let user_id = user_ids[offerer];
        sqlx::query(
            "INSERT INTO offers (request_id, user_id, rental_time, return_time, rental_place, return_place) \
             VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(drill_id)
        .bind(user_id)
        .bind(rt)
        .bind(rt2)
        .bind(rp)
        .bind(rp2)
        .execute(&pool)
        .await?;
    }

    println!(
        "seed: 사용자 {}명 / 요청 {}건 / offer 2건 입력 완료.",
        users.len(),
        requests.len()
    );
    println!("비밀번호: 1234 (모든 계정 공통)");
    println!("계정: hong / kim / lee / park (모두 101동 01라인)");
    Ok(())
}

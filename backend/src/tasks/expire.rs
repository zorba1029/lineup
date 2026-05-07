//! 72h이 지난 open request를 expired로 마킹. PLAN.md §10.

use std::time::Duration;

use sqlx::MySqlPool;

const TICK: Duration = Duration::from_secs(60);

pub fn spawn(db: MySqlPool) {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(TICK);
        // 첫 tick은 즉시 발생 → 시작 직후 한 번 청소.
        loop {
            interval.tick().await;
            match sqlx::query(
                "UPDATE requests SET status = 'expired' \
                 WHERE status = 'open' AND expires_at <= NOW()",
            )
            .execute(&db)
            .await
            {
                Ok(res) if res.rows_affected() > 0 => {
                    tracing::info!(rows = res.rows_affected(), "expired stale requests");
                }
                Ok(_) => {}
                Err(e) => {
                    tracing::error!(error = %e, "expire task: query failed");
                }
            }
        }
    });
}

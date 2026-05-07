-- 0001_init.sql — 라인이웃 초기 스키마
-- PLAN.md §4 의 DDL과 동일.

CREATE TABLE users (
  id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  username        VARCHAR(40)  NOT NULL UNIQUE,
  email           VARCHAR(120) NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  name            VARCHAR(40)  NOT NULL,
  dong            VARCHAR(10)  NOT NULL,           -- "101동"
  unit            VARCHAR(10)  NOT NULL,           -- "101호"
  line_no         VARCHAR(4)   NOT NULL,           -- "01"  (unit 끝 두 자리)
  phone           VARCHAR(20)  NOT NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_line (dong, line_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE requests (
  id            BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  name          VARCHAR(80)  NOT NULL,
  category      VARCHAR(20)  NOT NULL,             -- 공구|주방|오락|전자기기|가전|기타
  description   VARCHAR(200) NOT NULL,
  urgent        TINYINT(1)   NOT NULL DEFAULT 0,
  status        VARCHAR(20)  NOT NULL DEFAULT 'open',  -- open|matched|expired|cancelled
  start_time    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at    DATETIME     NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_req_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_req_status (status, expires_at),
  INDEX idx_req_user (user_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE offers (
  id            BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  request_id    BIGINT UNSIGNED NOT NULL,
  user_id       BIGINT UNSIGNED NOT NULL,
  rental_time   VARCHAR(20)  NOT NULL,
  return_time   VARCHAR(20)  NOT NULL,
  rental_place  VARCHAR(60)  NOT NULL,
  return_place  VARCHAR(60)  NOT NULL,
  status        VARCHAR(20)  NOT NULL DEFAULT 'pending',  -- pending|accepted|rejected|cancelled
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_off_req  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_off_user FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  INDEX idx_off_req_status (request_id, status),
  INDEX idx_off_user (user_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

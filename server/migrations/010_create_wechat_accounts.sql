-- MySQL 8. Run after 009_add_actual_training_results.sql.
CREATE TABLE wechat_accounts (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  app_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  open_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  union_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_wechat_accounts_app_open (app_id, open_id),
  UNIQUE KEY uq_wechat_accounts_user_app (user_id, app_id),
  KEY idx_wechat_accounts_union (union_id),
  CONSTRAINT fk_wechat_accounts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

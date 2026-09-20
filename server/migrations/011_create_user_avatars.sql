-- MySQL 8. Run after 010_create_wechat_accounts.sql.
CREATE TABLE user_avatars (
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  mime_type VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  image_data MEDIUMBLOB NOT NULL,
  byte_size INT UNSIGNED NOT NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id),
  CONSTRAINT fk_user_avatars_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_user_avatars_size CHECK (byte_size BETWEEN 1 AND 2097152),
  CONSTRAINT chk_user_avatars_mime CHECK (mime_type IN ('image/jpeg','image/png','image/webp'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

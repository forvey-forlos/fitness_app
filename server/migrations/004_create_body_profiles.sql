-- Current body values only. Run after 001-003 on MySQL 8.
SET time_zone = '+00:00';

CREATE TABLE body_profiles (
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  height DECIMAL(6,2) NULL COMMENT 'cm',
  weight DECIMAL(6,2) NULL COMMENT 'kg',
  waist DECIMAL(6,2) NULL COMMENT 'cm',
  chest DECIMAL(6,2) NULL COMMENT 'cm',
  hip DECIMAL(6,2) NULL COMMENT 'cm',
  shoulder_width DECIMAL(6,2) NULL COMMENT 'cm',
  thigh DECIMAL(6,2) NULL COMMENT 'cm',
  upper_arm DECIMAL(6,2) NULL COMMENT 'cm',
  calf DECIMAL(6,2) NULL COMMENT 'cm',
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id),
  CONSTRAINT fk_body_profiles_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_body_profiles_version CHECK (version >= 1)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

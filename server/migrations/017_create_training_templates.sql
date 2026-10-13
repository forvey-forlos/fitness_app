-- MySQL 8. Run once after 016_normalize_exercise_catalog.sql.
-- Private templates and public posts own independent JSON snapshots.
SET time_zone = '+00:00';

CREATE TABLE training_templates (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  name VARCHAR(100) NOT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL,
  content JSON NOT NULL,
  source_publication_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_training_templates_user (user_id, deleted_at, updated_at DESC),
  CONSTRAINT fk_training_templates_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_training_templates_duration CHECK (duration_minutes BETWEEN 1 AND 1440)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE template_publications (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  author_user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  title VARCHAR(100) NOT NULL,
  description VARCHAR(400) NOT NULL DEFAULT '',
  tags JSON NOT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL,
  content JSON NOT NULL,
  download_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_template_publications_new (created_at DESC, id DESC),
  KEY idx_template_publications_author (author_user_id, created_at DESC),
  CONSTRAINT fk_template_publications_author FOREIGN KEY (author_user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_template_publications_duration CHECK (duration_minutes BETWEEN 1 AND 1440)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE template_publication_reactions (
  publication_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  kind VARCHAR(12) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (publication_id, user_id, kind),
  KEY idx_template_reactions_user (user_id, kind, created_at DESC),
  CONSTRAINT fk_template_reactions_publication FOREIGN KEY (publication_id) REFERENCES template_publications (id) ON DELETE CASCADE,
  CONSTRAINT fk_template_reactions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_template_reactions_kind CHECK (kind IN ('like', 'favorite'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

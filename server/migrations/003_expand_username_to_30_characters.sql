-- MySQL 8. Apply after 001 and 002. This changes the existing 15-byte limit.
-- VARCHAR(64) already accommodates 30 permitted Unicode characters.
ALTER TABLE users
  DROP CHECK chk_users_username_bytes,
  ADD CONSTRAINT chk_users_username_chars
    CHECK (CHAR_LENGTH(username) BETWEEN 1 AND 30);

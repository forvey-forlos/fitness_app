-- MySQL 8. Run after 011_create_user_avatars.sql.
-- Keep legacy username columns as internal compatibility identifiers; account_code is the login identity.
ALTER TABLE users
  ADD COLUMN display_name VARCHAR(64) NULL AFTER id,
  ADD COLUMN account_code CHAR(8) CHARACTER SET ascii COLLATE ascii_bin NULL AFTER display_name,
  MODIFY COLUMN password_hash VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NULL;

UPDATE users
SET display_name = username
WHERE display_name IS NULL;

SET @fit_note_account_code = 9999999;
UPDATE users
SET account_code = LPAD((@fit_note_account_code := @fit_note_account_code + 1), 8, '0')
WHERE account_code IS NULL
ORDER BY created_at, id;

ALTER TABLE users
  MODIFY COLUMN display_name VARCHAR(64) NOT NULL,
  MODIFY COLUMN account_code CHAR(8) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  ADD UNIQUE KEY uq_users_account_code (account_code);

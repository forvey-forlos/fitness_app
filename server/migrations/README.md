# Authentication schema migrations

These three files target MySQL 8. Run them **once**, in numeric order, against the
intended database. The first two create `users` and `refresh_tokens`; the third
replaces the original username length constraint. No accounts,
tokens, or API endpoints are created. MySQL DDL commits implicitly, so take a
database backup and test on a non-production instance before applying to production.

The application must generate UUID strings for both `id` columns, use Argon2id
or bcrypt for `password_hash`, and store only the raw 32-byte SHA-256 digest of
each opaque, high-entropy refresh token in `token_hash`. Never store or log the
plaintext password or token. Normalize usernames (lowercase ASCII letters,
preserve Chinese characters) before writing `username_normalized`; the unique
index performs case-insensitive lookup through that normalized value. The
database checks the 1–30 character username limit after migration 003, while
the full character and password rules from `docs/backend-api-spec.md` are
enforced by application validators.

For rotation, lock the old token row, reject expired/revoked/previously rotated
tokens, set its `rotated_at`, and insert a new row with
`rotated_from_token_id = old.id` in the same transaction. The unique index allows
only one successor per token. `revoked_at` handles logout or replay revocation;
neither timestamp deletes audit history. All `DATETIME(3)` values are UTC:
application connections must use a UTC session time zone when writing or reading
them. Each migration sets its own session to UTC for default timestamps.

In Sealos DevBox, first select the correct MySQL database and ensure the MySQL
client is available. Run from the repository root; the `-p` option prompts for
the password rather than exposing it in shell history:

```bash
mysql -h "$DB_HOST" -P "${DB_PORT:-3306}" -u "$DB_USER" -p "$DB_NAME" < server/migrations/001_create_users.sql
mysql -h "$DB_HOST" -P "${DB_PORT:-3306}" -u "$DB_USER" -p "$DB_NAME" < server/migrations/002_create_refresh_tokens.sql
mysql -h "$DB_HOST" -P "${DB_PORT:-3306}" -u "$DB_USER" -p "$DB_NAME" < server/migrations/003_expand_username_to_30_characters.sql
```

If the DevBox has no `mysql` client, run each SQL file in order in the Sealos
MySQL SQL console, after selecting the target database. Do not paste secrets
into the SQL editor. These files do not use `IF NOT EXISTS`: a table-already-
exists error means stop and inspect the existing schema rather than silently
claiming the migration succeeded.

Verify with metadata-only commands (no password hashes or token hashes shown):

```sql
SHOW CREATE TABLE users;
SHOW CREATE TABLE refresh_tokens;
SHOW INDEX FROM users;
SHOW INDEX FROM refresh_tokens;
SELECT TABLE_NAME, TABLE_ROWS
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('users', 'refresh_tokens');
```

Check that both tables exist, both `id` columns are `CHAR(36)` primary keys,
`username_normalized` and `token_hash` are unique, and `refresh_tokens.user_id`
references `users.id`. Check that `users` has `chk_users_username_chars`
instead of `chk_users_username_bytes`. Existing installations should run only
the new 003 migration, not replay 001/002. `TABLE_ROWS` is approximate for InnoDB; it is only a
non-sensitive sanity check, not an exact count.

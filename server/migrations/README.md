# Authentication schema migrations

These twelve files target MySQL 8. Run them **once**, in numeric order, against the
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
the migrations not yet applied, without replaying prior files. `TABLE_ROWS` is approximate for InnoDB; it is only a
non-sensitive sanity check, not an exact count.

## Current body profile (004)

Migration 004 creates body_profiles after 001-003. An existing installation
that already ran 001-003 must run only 004, not replay earlier migrations.
From the repository root in the Sealos DevBox, with database connection
variables configured, run:

    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" < server/migrations/004_create_body_profiles.sql

The password is prompted; do not put it on the command line. If no MySQL
client exists, run the SQL in the Sealos MySQL console after selecting the
intended database. Verify with SHOW CREATE TABLE body_profiles and SHOW INDEX
FROM body_profiles. The user_id primary key also indexes the user foreign
key. Measurements are nullable DECIMAL(6,2), in cm except weight in kg.
Version starts at 1 and is checked on each update. Body profile timestamps
are UTC. The body profile API handles only current values in this phase;
historical measurements and trends are not part of this migration.

## Measurement history (005)

Migration 005 creates body_measurements after 004. An existing installation
that already ran 001-004 must run only 005:

    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" < server/migrations/005_create_body_measurements.sql

Verify using SHOW CREATE TABLE body_measurements and SHOW INDEX FROM
body_measurements. Each row has a UUID primary key, a users foreign key,
nullable DECIMAL(6,2) values, a UTC measurement timestamp, a version and a
soft-delete timestamp. The user/time index supports history and trend reads.
The optional per-user idempotency key prevents retries from creating an extra
record, while different keys (or no key) permit separate records at the same
timestamp. This migration does not rewrite body_profiles.

## Exercise catalog and custom exercises (006)

Migration 006 creates a shared exercises table. Apply it after 005, then run
the repeatable seed from the repository root:

    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" < server/migrations/006_create_exercises.sql
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" < server/seeds/001_system_exercises.sql

The seed contains 32 system exercises across chest, back, shoulder, biceps,
triceps, legs, glutes and core. It can be rerun without changing existing
system exercises. Verify with SHOW CREATE TABLE exercises, SHOW INDEX FROM
exercises, and a count of active system rows. The table combines system rows
(null owner) with user-owned custom rows, as required by this phase's API.
The generated owner_scope and active_key columns enforce uniqueness of active
normalized names within an owner and category while allowing reuse after a
soft delete. They are internal index helpers, not API fields.

## Training plans (007)

Migration 007 creates training_plans and training_plan_exercises after 006.
Before running it, inspect whether an older training_plans table already
exists in the target database. Do not overwrite or drop an existing table;
an older incompatible schema needs a separately planned data migration.

    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" < server/migrations/007_create_training_plans.sql

Verify both tables with SHOW CREATE TABLE and SHOW INDEX. The unique active
date key permits one non-deleted plan per user and date, while allowing a
replacement after soft deletion. Plan and child rows use UUID strings.
The application creates and replaces them in a transaction. Status allows
draft and completed; this phase creates only draft plans. The former public
test-list route is retained at /api/training-plans with its old success shape
but now requires JWT and returns only the caller's plans.

## Training completion and history (008)

Run 008 only after 007 and inspect the existing schema first. It adds
training_plans.completed_at and creates training_sessions and
training_session_exercises. MySQL DDL commits implicitly, so back up the
database and test on a non-production instance before applying it. If the
ALTER succeeds but a later CREATE fails, inspect the three objects before
retrying; do not blindly rerun the migration.

    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" < server/migrations/008_create_training_sessions.sql

Verify with SHOW CREATE TABLE training_sessions, SHOW CREATE TABLE
training_session_exercises, SHOW COLUMNS FROM training_plans LIKE
'completed_at', and SHOW INDEX FROM training_sessions. No table data or
secret values need to be displayed. A unique source-plan key and a unique
user/idempotency-key pair prevent duplicate completion history. A completion
must include Idempotency-Key and the current plan version. The completion
transaction locks the plan, copies snapshot fields, inserts the history
and child rows, and updates the plan status/version/completed_at. History
timestamps are UTC; list date filters and weekly aggregation use the user's
saved timezone. The current completion API freezes planned exercise parameters;
`009_add_actual_training_results.sql` separates completed actual sets/reps/weight
from the immutable plan target snapshot stored in training history.

## WeChat identity, avatars, and account/display-name split (010–012)

Run 010, 011, and 012 after 009. Migration 010 creates the WeChat OpenID binding
table, 011 stores user-uploaded avatar bytes, and 012 adds the immutable unique
eight-digit `account_code` plus the non-unique editable `display_name`. Migration
012 backfills existing users in deterministic creation order, and makes
`password_hash` nullable so WeChat-only accounts do not need a fabricated password.
The legacy `username` columns remain as internal compatibility identifiers.

    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" < server/migrations/010_create_wechat_accounts.sql
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" < server/migrations/011_create_user_avatars.sql
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" < server/migrations/012_decouple_account_code_and_display_name.sql

Verify with `SHOW CREATE TABLE users`, `SHOW CREATE TABLE wechat_accounts`, and
`SHOW CREATE TABLE user_avatars`. Do not rerun 012 after it succeeds.

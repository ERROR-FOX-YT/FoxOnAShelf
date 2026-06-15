-- =====================================================================
-- BookShelf™ - Migración 002: refresh_tokens + deleted_at en banned_users
-- Ejecutar contra bases existentes (creadas con 001_create_tables.sql
-- sin refresh_tokens ni columna deleted_at)
-- =====================================================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token           text UNIQUE NOT NULL,
    expires_at      timestamptz NOT NULL,
    used_at         timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE banned_users ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens (token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user  ON refresh_tokens (user_id);

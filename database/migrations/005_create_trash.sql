-- =====================================================================
-- BookShelf™ - Migración 005: tabla de papelera (trash)
-- Almacena snapshots de usuarios eliminados para posible recuperación
-- dentro de la ventana de 30 días.
-- =====================================================================

CREATE TABLE IF NOT EXISTS trash (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email      text NOT NULL,
    entry           jsonb NOT NULL,
    trashed_at      timestamptz NOT NULL DEFAULT now(),
    expires_at      timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
    trashed_by      text NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trash_expires ON trash (expires_at);
CREATE INDEX IF NOT EXISTS idx_trash_email ON trash (user_email);

-- =====================================================================
-- BookShelf™ - Migración 004: tabla de imágenes de usuario (media library)
-- Almacena imágenes subidas por el usuario, disponibles para cualquier libro.
-- =====================================================================

CREATE TABLE IF NOT EXISTS user_images (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    storage_path    text NOT NULL,
    custom_name     text NOT NULL,
    sort_order      integer NOT NULL DEFAULT 0,
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, custom_name)
);

CREATE INDEX IF NOT EXISTS idx_user_images_user ON user_images (user_id);

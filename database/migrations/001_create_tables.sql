-- =====================================================================
-- BookShelf™ - Plataforma de lectura digital
-- Migración 001: creación de tablas, índices y RLS de ejemplo
-- Compatible con Postgres 13+ / Supabase
-- =====================================================================

-- Extensión para uuid_generate_v4 (Supabase ya la tiene; en Postgres local: CREATE EXTENSION)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------
-- USERS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email           text UNIQUE NOT NULL,
    password_hash   text NOT NULL,
    display_name    text,
    avatar_url      text,
    role            text NOT NULL DEFAULT 'user'
                    CHECK (role IN ('ghost','user','creator','moderator','admin','system')),
    contact_info    text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- BOOKS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS books (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title           text NOT NULL,
    subtitle        text,
    description     text,
    author_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','published','deleted')),
    is_free         boolean NOT NULL DEFAULT true,
    price_cents     integer NOT NULL DEFAULT 0,
    category        text,
    age_group       text CHECK (age_group IN ('infantil','adolescente','adulto')),
    cover_url       text,
    original_file   text,           -- ruta al archivo original subido (si lo hubo)
    original_public boolean NOT NULL DEFAULT false, -- ¿se permite descargarlo?
    favorite_count  integer NOT NULL DEFAULT 0,
    views           integer NOT NULL DEFAULT 0,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- CHAPTERS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chapters (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id             uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    title               text,
    content             text,
    "order"             integer NOT NULL DEFAULT 1,
    is_early_access     boolean NOT NULL DEFAULT false,
    created_at          timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- IMAGES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS images (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        uuid REFERENCES users(id) ON DELETE SET NULL,
    book_id         uuid REFERENCES books(id) ON DELETE CASCADE,
    chapter_id      uuid REFERENCES chapters(id) ON DELETE CASCADE,
    storage_path    text NOT NULL,
    alt_text        text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- FAVORITES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS favorites (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id     uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, book_id)
);

-- ---------------------------------------------------------------------
-- RATINGS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ratings (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id     uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    rating      smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, book_id)
);

-- ---------------------------------------------------------------------
-- COMMENTS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comments (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id             uuid REFERENCES books(id) ON DELETE CASCADE,
    chapter_id          uuid REFERENCES chapters(id) ON DELETE CASCADE,
    parent_comment_id   uuid REFERENCES comments(id) ON DELETE CASCADE,
    content             text NOT NULL,
    created_at          timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- COLLECTIONS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS collections (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           text NOT NULL,
    description     text,
    is_public       boolean NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collection_books (
    collection_id   uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    book_id         uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    PRIMARY KEY (collection_id, book_id)
);

-- ---------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        text NOT NULL,
    payload     jsonb,
    is_read     boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- ANNOUNCEMENTS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS announcements (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id            uuid REFERENCES users(id) ON DELETE SET NULL,
    title               text NOT NULL,
    content             text NOT NULL,
    image_path          text,
    visible             boolean NOT NULL DEFAULT true,
    featured            boolean NOT NULL DEFAULT false,
    created_by_name     text,
    created_by_role     text DEFAULT 'admin',
    published_by        text,
    created_at          timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- BOOK VIEWS (para evitar conteos duplicados por usuario)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS book_views (
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id     uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, book_id)
);

-- ---------------------------------------------------------------------
-- METRICS (derivables; sólo cache opcional)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS metrics (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key         text UNIQUE NOT NULL,
    value       numeric NOT NULL DEFAULT 0,
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- BANNED USERS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS banned_users (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email               text UNIQUE NOT NULL,
    reason              text NOT NULL,
    appeal              text,
    appeal_submitted    boolean NOT NULL DEFAULT false,
    banned_at           timestamptz NOT NULL DEFAULT now(),
    unbanned_at         timestamptz,
    deleted_at          timestamptz       -- administratively deleted
);

-- ---------------------------------------------------------------------
-- REFRESH TOKENS (rotación JWT)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token           text UNIQUE NOT NULL,
    expires_at      timestamptz NOT NULL,
    used_at         timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- TOKEN BLACKLIST (invalidación de JWTs al banear)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS token_blacklist (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token           text UNIQUE NOT NULL,
    user_email      text NOT NULL,
    blacklisted_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- MODERATION LOGS (auditoría mínima)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS moderation_logs (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_email     text NOT NULL,
    action          text NOT NULL,
    target          text,
    ip              text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- ÍNDICES
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_books_title       ON books (title);
CREATE INDEX IF NOT EXISTS idx_books_category    ON books (category);
CREATE INDEX IF NOT EXISTS idx_books_age_group   ON books (age_group);
CREATE INDEX IF NOT EXISTS idx_users_email       ON users (email);
CREATE INDEX IF NOT EXISTS idx_chapters_book     ON chapters (book_id);
CREATE INDEX IF NOT EXISTS idx_favorites_book    ON favorites (book_id);
CREATE INDEX IF NOT EXISTS idx_ratings_book      ON ratings (book_id);

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY (ejemplos para Supabase / Postgres con JWT)
-- ---------------------------------------------------------------------
-- Estas políticas son ejemplos; en backend Express usamos un middleware
-- de roles que cumple el mismo objetivo cuando RLS no está habilitado.
--
-- Para activar en Supabase: ALTER TABLE ... ENABLE ROW LEVEL SECURITY;
--
-- Ejemplo: el autor sólo puede modificar sus propios libros.
--   CREATE POLICY books_owner_update ON books
--     FOR UPDATE USING (author_id::text = auth.uid()::text);
--
-- Ejemplo: moderadores pueden borrar libros gratuitos.
--   CREATE POLICY books_mod_delete ON books
--     FOR DELETE USING (
--        is_free = true
--        AND EXISTS (
--          SELECT 1 FROM users u
--          WHERE u.id::text = auth.uid()::text
--            AND u.role IN ('moderator','admin')
--        )
--     );
--
-- Ejemplo: admin puede todo.
--   CREATE POLICY books_admin_all ON books FOR ALL USING (
--     EXISTS (SELECT 1 FROM users u
--             WHERE u.id::text = auth.uid()::text AND u.role = 'admin')
--   );

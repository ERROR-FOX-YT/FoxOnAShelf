-- =====================================================================
-- BookShelf™ - Migración 003: tabla de marcadores (bookmarks)
-- Almacena la posición de lectura de cada usuario por libro.
-- =====================================================================

CREATE TABLE IF NOT EXISTS bookmarks (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id         uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    chapter_id      uuid REFERENCES chapters(id) ON DELETE SET NULL,
    chapter_index   integer NOT NULL DEFAULT 0,
    scroll_position integer NOT NULL DEFAULT 0,
    finished        boolean NOT NULL DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, book_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks (user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_book ON bookmarks (book_id);

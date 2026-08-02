-- =====================================================================
-- FoxOnAShelf™ - Migración 007: Sistema de foros
-- Crea las tablas del foro: categorías, hilos, respuestas y reacciones.
-- Incluye índices para consultas frecuentes y categorías por defecto.
--
-- Ejecutar DENTRO de una transacción; ante cualquier error se revierte.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) CATEGORÍAS DEL FORO
-- ---------------------------------------------------------------------
CREATE TABLE foro_categorias (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    icono       TEXT DEFAULT '💬',
    color       TEXT DEFAULT '#8B6914',
    orden       INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 2) HILOS (TEMAS/THREADS)
-- ---------------------------------------------------------------------
CREATE TABLE foro_hilos (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria_id      UUID NOT NULL REFERENCES foro_categorias(id) ON DELETE CASCADE,
    autor_id          UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    titulo            TEXT NOT NULL,
    contenido         TEXT NOT NULL,
    fijado            BOOLEAN DEFAULT false,
    cerrado           BOOLEAN DEFAULT false,
    vistas            INTEGER DEFAULT 0,
    conteo_respuestas INTEGER DEFAULT 0,
    created_at        TIMESTAMPTZ DEFAULT now(),
    updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 3) RESPUESTAS
-- ---------------------------------------------------------------------
CREATE TABLE foro_respuestas (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hilo_id    UUID NOT NULL REFERENCES foro_hilos(id) ON DELETE CASCADE,
    autor_id   UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    contenido  TEXT NOT NULL,
    editado    BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 4) REACCIONES DEL FORO
-- ---------------------------------------------------------------------
CREATE TABLE foro_reacciones (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id   UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    hilo_id      UUID REFERENCES foro_hilos(id) ON DELETE CASCADE,
    respuesta_id UUID REFERENCES foro_respuestas(id) ON DELETE CASCADE,
    emoji        TEXT NOT NULL DEFAULT '👍',
    created_at   TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT foro_reacciones_usuario_hilo_key UNIQUE (usuario_id, hilo_id),
    CONSTRAINT foro_reacciones_usuario_respuesta_key UNIQUE (usuario_id, respuesta_id)
);

-- ---------------------------------------------------------------------
-- 5) ÍNDICES
-- ---------------------------------------------------------------------
CREATE INDEX idx_hilos_categoria_id      ON foro_hilos (categoria_id);
CREATE INDEX idx_hilos_created_at        ON foro_hilos (created_at);
CREATE INDEX idx_respuestas_hilo_id      ON foro_respuestas (hilo_id);
CREATE INDEX idx_reacciones_foro_hilo    ON foro_reacciones (hilo_id);
CREATE INDEX idx_reacciones_foro_respuesta ON foro_reacciones (respuesta_id);

-- ---------------------------------------------------------------------
-- 6) CATEGORÍAS POR DEFECTO
-- ---------------------------------------------------------------------
INSERT INTO foro_categorias (nombre, descripcion, icono, color, orden) VALUES
    ('General',                'Hilos generales y conversación libre',          '💬', '#8B6914', 0),
    ('Discusión de Libros',   'Habla sobre libros que estás leyendo o leíste', '📚', '#2E7D32', 1),
    ('Recomendaciones',       'Comparte y descubre recomendaciones de lectura', '⭐', '#F57C00', 2),
    ('Escritura y Creatividad', 'Consejos, técnicas y ejercicios de escritura', '✍️', '#7B1FA2', 3),
    ('Ayuda y Soporte',       'Resuelve dudas sobre el uso de FoxOnAShelf',      '❓', '#1565C0', 4),
    ('Off-Topic',             'Todo lo que no encaja en las otras categorías',  '🎯', '#546E7A', 5);

COMMIT;

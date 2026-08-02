-- =====================================================================
-- FoxOnAShelf™ - Migración 008: Sistema de destacados y notas
-- Crea la tabla para highlights y notas personales de lectura.
-- Incluye índices para consultas frecuentes por usuario, libro y capítulo.
--
-- Ejecutar DENTRO de una transacción; ante cualquier error se revierte.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) DESTACADOS (HIGHLIGHTS / NOTES)
-- ---------------------------------------------------------------------
CREATE TABLE destacados (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id          UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    libro_id            UUID NOT NULL REFERENCES libros(id) ON DELETE CASCADE,
    capitulo_id         UUID NOT NULL REFERENCES capitulos(id) ON DELETE CASCADE,
    texto_seleccionado  TEXT NOT NULL,
    nota                TEXT,
    color               TEXT DEFAULT '#FBBF24',
    posicion_inicio     INTEGER,
    posicion_fin        INTEGER,
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 2) ÍNDICES
-- ---------------------------------------------------------------------
CREATE INDEX idx_destacados_usuario_libro  ON destacados (usuario_id, libro_id);
CREATE INDEX idx_destacados_capitulo       ON destacados (capitulo_id);
CREATE INDEX idx_destacados_libro          ON destacados (libro_id);

COMMIT;

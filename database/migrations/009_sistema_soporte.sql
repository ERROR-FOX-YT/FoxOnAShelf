-- =====================================================================
-- FoxOnAShelf™ - Migración 009: Sistema de Soporte
-- Rediseña el foro: solo categoría Soporte, solución colaborativa,
-- votación útil/no útil, historial de ediciones de solución.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) Limpiar categorías anteriores y crear solo "Soporte"
-- ---------------------------------------------------------------------
DELETE FROM foro_reacciones;
DELETE FROM foro_respuestas;
DELETE FROM foro_hilos;
DELETE FROM foro_categorias;

INSERT INTO foro_categorias (nombre, descripcion, icono, color, orden) VALUES
    ('Soporte', 'Obtén ayuda con FoxOnAShelf', '🛠️', '#1565C0', 0);

-- ---------------------------------------------------------------------
-- 2) Añadir columna resuelto a foro_hilos
-- ---------------------------------------------------------------------
ALTER TABLE foro_hilos ADD COLUMN resuelto BOOLEAN DEFAULT false;

-- ---------------------------------------------------------------------
-- 3) Añadir columna es_solucion a foro_respuestas
-- ---------------------------------------------------------------------
ALTER TABLE foro_respuestas ADD COLUMN es_solucion BOOLEAN DEFAULT false;

-- ---------------------------------------------------------------------
-- 4) Tabla de votos (útil / no útil)
-- ---------------------------------------------------------------------
CREATE TABLE foro_votos (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    respuesta_id UUID NOT NULL REFERENCES foro_respuestas(id) ON DELETE CASCADE,
    usuario_id   UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo         TEXT NOT NULL CHECK (tipo IN ('util', 'no_util')),
    created_at   TIMESTAMPTZ DEFAULT now(),
    UNIQUE(respuesta_id, usuario_id)
);

-- ---------------------------------------------------------------------
-- 5) Tabla de historial de ediciones de solución
-- ---------------------------------------------------------------------
CREATE TABLE foro_historial_solucion (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    respuesta_id        UUID NOT NULL REFERENCES foro_respuestas(id) ON DELETE CASCADE,
    usuario_id          UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    contenido_anterior  TEXT,
    contenido_nuevo     TEXT,
    created_at          TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 6) Índices
-- ---------------------------------------------------------------------
CREATE INDEX idx_votos_respuesta     ON foro_votos (respuesta_id);
CREATE INDEX idx_votos_usuario       ON foro_votos (usuario_id);
CREATE INDEX idx_historial_respuesta ON foro_historial_solucion (respuesta_id);
CREATE INDEX idx_hilos_resuelto      ON foro_hilos (resuelto);

COMMIT;

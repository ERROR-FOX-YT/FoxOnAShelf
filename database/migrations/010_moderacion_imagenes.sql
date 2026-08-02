-- 010_moderacion_imagenes.sql
-- Añade campos de moderación a imagenes_usuario

ALTER TABLE imagenes_usuario
  ADD COLUMN IF NOT EXISTS moderada      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS moderada_por  uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderada_en   timestamptz;

CREATE INDEX IF NOT EXISTS idx_imagenes_usuario_moderada ON imagenes_usuario (moderada) WHERE moderada = true;

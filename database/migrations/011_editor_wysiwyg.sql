-- 011_editor_wysiwyg.sql
-- Editor WYSIWYG: tipo de libro, permisos del lector, modo de lectura, colecciones extras

-- ---------------------------------------------------------------------
-- LIBROS — columnas nuevas para editor WYSIWYG
-- ---------------------------------------------------------------------
ALTER TABLE libros
  ADD COLUMN IF NOT EXISTS tipo_libro      text NOT NULL DEFAULT 'novela'
    CHECK (tipo_libro IN ('novela','comic')),
  ADD COLUMN IF NOT EXISTS color_fondo     text DEFAULT '#FFFFFF',
  ADD COLUMN IF NOT EXISTS modo_lectura    text NOT NULL DEFAULT 'vertical'
    CHECK (modo_lectura IN ('vertical','lateral','paneles')),
  ADD COLUMN IF NOT EXISTS permisos_lector jsonb DEFAULT '{
    "permitir_cambiar_fondo": true,
    "permitir_cambiar_tipografia": true,
    "permitir_cambiar_tamano": true,
    "permitir_cambiar_interlineado": true,
    "permitir_cambiar_ancho": true,
    "permitir_cambiar_color_hoja": true,
    "imagen_fondo_prestablecida": null,
    "tipografia_por_defecto": "serif",
    "tamano_por_defecto": 18,
    "fondo_por_defecto": "parchment",
    "nota_comic": "Este libro es ilustrado. La tipografía no aplica al contenido visual."
  }'::jsonb;

-- ---------------------------------------------------------------------
-- COLECCIONES — columnas extras (tablas ya existen desde 001)
-- ---------------------------------------------------------------------
ALTER TABLE colecciones
  ADD COLUMN IF NOT EXISTS url_portada text,
  ADD COLUMN IF NOT EXISTS color text DEFAULT '#7B4B27';

-- ---------------------------------------------------------------------
-- ÍNDICES
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_libros_tipo ON libros (tipo_libro);
CREATE INDEX IF NOT EXISTS idx_libros_modo_lectura ON libros (modo_lectura);

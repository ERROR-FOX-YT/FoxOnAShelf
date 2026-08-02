-- =====================================================================
-- FoxOnAShelf™ - Script 001: Reiniciar vistas y historial de lectura
-- Resetea contadores de vistas de libros y limpia el historial de
-- sesiones de lectura, sin eliminar datos de negocio importantes.
--
-- SEGURO PARA EJECUTAR MÚLTIPLES VECES (idempotente).
-- Se ejecuta dentro de una transacción; ante error se revierte.
--
-- Tablas preservadas (NO se eliminan datos):
--   libros, usuarios, capitulos, comentarios, favoritos,
--   calificaciones, marcadores, imagenes_usuario, anuncios,
--   destacados, mensajes_chat, hilos, respuestas, reacciones_foro,
--   lista_negra_tokens, tokens_refresco, usuarios_baneados,
--   config_sitio (excepto contadores de vistas)
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) RESETEAR CONTADOR DE VISTAS EN LIBROS
--    Pone a 0 la columna 'vistas' de todos los libros.
--    Idempotente: si ya es 0, no cambia nada.
-- ---------------------------------------------------------------------
UPDATE libros SET vistas = 0;

-- ---------------------------------------------------------------------
-- 2) VACIAR TABLA DE VISTAS POR USUARIO (vistas_libro)
--    Elimina el registro de qué usuario vio qué libro.
--    Idempotente: si la tabla está vacía o no existe, no falla.
-- ---------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vistas_libro') THEN
    DELETE FROM vistas_libro;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 3) RESETEAR MÉTRICAS RELACIONADAS CON VISTAS
--    Limpia contadores de vistas almacenados en la tabla metricas.
--    Idempotente: si la tabla o las claves no existen, no hay efecto.
-- ---------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'metricas') THEN
    DELETE FROM metricas WHERE key LIKE '%vistas%' OR key LIKE '%views%';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 4) RESETEAR CLAVES DE VISTAS EN CONFIG_SITIO
--    Restablece a '0' las claves de conteo de vistas en config_sitio.
--    Solo modifica claves específicas de vistas, NO toda la tabla.
--    Idempotente: si la tabla o las claves no existen, no cambia nada.
-- ---------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'config_sitio') THEN
    UPDATE config_sitio SET value = '0'
      WHERE key IN (
        'vistas_historial',
        'total_vistas',
        'vistas_totales',
        'vistas_sitio'
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 5) RESETEAR VISTAS DE HILOS DEL FORO (opcional)
--    Si se desea limpiar también las vistas de hilos del foro.
--    Descomentar si es necesario:
-- ---------------------------------------------------------------------
-- UPDATE hilos SET vistas = 0;

-- ---------------------------------------------------------------------
-- 6) RESUMEN DE OPERACIONES REALIZADAS
--    Muestra cuántas filas se afectaron en cada operación.
-- ---------------------------------------------------------------------
SELECT 'Libros con vistas reseteadas' AS operacion,
       (SELECT COUNT(*) FROM libros) AS total_libros_afectados;

SELECT 'Registros de vistas_libro eliminados' AS operacion,
       (SELECT COUNT(*) FROM vistas_libro) AS registros_restantes;

SELECT 'Claves de vistas en config_sitio reseteadas' AS operacion,
       (SELECT COUNT(*) FROM config_sitio
        WHERE key IN ('vistas_historial','total_vistas','vistas_totales','vistas_sitio')
          AND value = '0') AS claves_en_cero;

SELECT 'Metricas de vistas eliminadas' AS operacion,
       (SELECT COUNT(*) FROM metricas
        WHERE key LIKE '%vistas%' OR key LIKE '%views%') AS metricas_restantes;

-- =====================================================================
-- FIN DEL SCRIPT
-- =====================================================================
COMMIT;

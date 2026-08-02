-- =====================================================================
-- FoxOnAShelf™ - Migración 006: traducción global del esquema a español
-- Renombra tablas, columnas, constraints e índices a español.
-- Traduce los valores de estado de libros (draft/published/deleted ->
-- borrador/publicado/eliminado) y las claves de site_config.
--
-- Ejecutar DENTRO de una transacción; ante cualquier error se revierte.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) RENOMBRE DE TABLAS
-- ---------------------------------------------------------------------
ALTER TABLE users             RENAME TO usuarios;
ALTER TABLE books             RENAME TO libros;
ALTER TABLE chapters          RENAME TO capitulos;
ALTER TABLE comments          RENAME TO comentarios;
ALTER TABLE favorites         RENAME TO favoritos;
ALTER TABLE ratings           RENAME TO calificaciones;
ALTER TABLE categories        RENAME TO categorias;
ALTER TABLE bookmarks         RENAME TO marcadores;
ALTER TABLE user_images       RENAME TO imagenes_usuario;
ALTER TABLE book_views        RENAME TO vistas_libro;
ALTER TABLE refresh_tokens    RENAME TO tokens_refresco;
ALTER TABLE token_blacklist   RENAME TO lista_negra_tokens;
ALTER TABLE moderation_logs   RENAME TO registros_moderacion;
ALTER TABLE collections       RENAME TO colecciones;
ALTER TABLE collection_books  RENAME TO libros_coleccion;
ALTER TABLE notifications     RENAME TO notificaciones;
ALTER TABLE banned_users      RENAME TO usuarios_baneados;
ALTER TABLE trash             RENAME TO papelera;
ALTER TABLE changelogs        RENAME TO historiales;
ALTER TABLE metrics           RENAME TO metricas;
ALTER TABLE site_config       RENAME TO config_sitio;
ALTER TABLE announcements     RENAME TO anuncios;
ALTER TABLE images            RENAME TO imagenes;
ALTER TABLE chat_messages     RENAME TO mensajes_chat;

-- ---------------------------------------------------------------------
-- 2) RENOMBRE DE COLUMNAS
-- ---------------------------------------------------------------------

-- usuarios
ALTER TABLE usuarios RENAME COLUMN password_hash TO hash_contrasena;
ALTER TABLE usuarios RENAME COLUMN display_name   TO nombre_mostrado;
ALTER TABLE usuarios RENAME COLUMN avatar_url     TO url_avatar;
ALTER TABLE usuarios RENAME COLUMN contact_info   TO informacion_contacto;

-- libros
ALTER TABLE libros RENAME COLUMN title            TO titulo;
ALTER TABLE libros RENAME COLUMN subtitle         TO subtitulo;
ALTER TABLE libros RENAME COLUMN description      TO descripcion;
ALTER TABLE libros RENAME COLUMN author_id        TO autor_id;
ALTER TABLE libros RENAME COLUMN status           TO estado;
ALTER TABLE libros RENAME COLUMN is_free          TO es_gratis;
ALTER TABLE libros RENAME COLUMN price_cents      TO precio_centavos;
ALTER TABLE libros RENAME COLUMN category         TO categoria;
ALTER TABLE libros RENAME COLUMN age_group        TO grupo_edad;
ALTER TABLE libros RENAME COLUMN cover_url        TO url_portada;
ALTER TABLE libros RENAME COLUMN original_file    TO archivo_original;
ALTER TABLE libros RENAME COLUMN original_public  TO original_publico;
ALTER TABLE libros RENAME COLUMN favorite_count   TO conteo_favoritos;
ALTER TABLE libros RENAME COLUMN views            TO vistas;

-- capitulos
ALTER TABLE capitulos RENAME COLUMN book_id         TO libro_id;
ALTER TABLE capitulos RENAME COLUMN title           TO titulo;
ALTER TABLE capitulos RENAME COLUMN content         TO contenido;
ALTER TABLE capitulos RENAME COLUMN "order"         TO orden;
ALTER TABLE capitulos RENAME COLUMN is_early_access TO es_acceso_anticipado;

-- comentarios
ALTER TABLE comentarios RENAME COLUMN user_id            TO usuario_id;
ALTER TABLE comentarios RENAME COLUMN book_id            TO libro_id;
ALTER TABLE comentarios RENAME COLUMN chapter_id         TO capitulo_id;
ALTER TABLE comentarios RENAME COLUMN parent_comment_id  TO comentario_padre_id;
ALTER TABLE comentarios RENAME COLUMN content            TO contenido;

-- favoritos
ALTER TABLE favoritos RENAME COLUMN user_id TO usuario_id;
ALTER TABLE favoritos RENAME COLUMN book_id TO libro_id;

-- calificaciones
ALTER TABLE calificaciones RENAME COLUMN user_id TO usuario_id;
ALTER TABLE calificaciones RENAME COLUMN book_id TO libro_id;
ALTER TABLE calificaciones RENAME COLUMN rating  TO puntuacion;

-- categorias
ALTER TABLE categorias RENAME COLUMN name TO nombre;

-- marcadores
ALTER TABLE marcadores RENAME COLUMN user_id          TO usuario_id;
ALTER TABLE marcadores RENAME COLUMN book_id          TO libro_id;
ALTER TABLE marcadores RENAME COLUMN chapter_id       TO capitulo_id;
ALTER TABLE marcadores RENAME COLUMN chapter_index    TO indice_capitulo;
ALTER TABLE marcadores RENAME COLUMN scroll_position  TO posicion_desplazamiento;
ALTER TABLE marcadores RENAME COLUMN finished         TO terminado;

-- imagenes_usuario
ALTER TABLE imagenes_usuario RENAME COLUMN user_id       TO usuario_id;
ALTER TABLE imagenes_usuario RENAME COLUMN storage_path  TO ruta_almacenamiento;
ALTER TABLE imagenes_usuario RENAME COLUMN custom_name   TO nombre_personalizado;
ALTER TABLE imagenes_usuario RENAME COLUMN sort_order    TO orden_ordenamiento;

-- vistas_libro
ALTER TABLE vistas_libro RENAME COLUMN user_id TO usuario_id;
ALTER TABLE vistas_libro RENAME COLUMN book_id TO libro_id;

-- tokens_refresco
ALTER TABLE tokens_refresco RENAME COLUMN user_id TO usuario_id;

-- lista_negra_tokens
ALTER TABLE lista_negra_tokens RENAME COLUMN user_email TO email_usuario;

-- registros_moderacion
ALTER TABLE registros_moderacion RENAME COLUMN actor_email TO email_actor;
ALTER TABLE registros_moderacion RENAME COLUMN action      TO accion;
ALTER TABLE registros_moderacion RENAME COLUMN target      TO objetivo;

-- colecciones
ALTER TABLE colecciones RENAME COLUMN owner_id TO propietario_id;
ALTER TABLE colecciones RENAME COLUMN title    TO titulo;
ALTER TABLE colecciones RENAME COLUMN description TO descripcion;
ALTER TABLE colecciones RENAME COLUMN is_public TO es_publica;

-- libros_coleccion
ALTER TABLE libros_coleccion RENAME COLUMN collection_id TO coleccion_id;
ALTER TABLE libros_coleccion RENAME COLUMN book_id       TO libro_id;

-- notificaciones
ALTER TABLE notificaciones RENAME COLUMN user_id TO usuario_id;
ALTER TABLE notificaciones RENAME COLUMN type    TO tipo;
ALTER TABLE notificaciones RENAME COLUMN payload TO contenido;
ALTER TABLE notificaciones RENAME COLUMN is_read TO es_leida;

-- usuarios_baneados
ALTER TABLE usuarios_baneados RENAME COLUMN reason            TO razon;
ALTER TABLE usuarios_baneados RENAME COLUMN appeal            TO apelacion;
ALTER TABLE usuarios_baneados RENAME COLUMN appeal_submitted  TO apelacion_enviada;

-- papelera
ALTER TABLE papelera RENAME COLUMN user_email TO email_usuario;
ALTER TABLE papelera RENAME COLUMN entry      TO entrada;
ALTER TABLE papelera RENAME COLUMN trashed_at TO eliminado_en;
ALTER TABLE papelera RENAME COLUMN expires_at TO expira_en;
ALTER TABLE papelera RENAME COLUMN trashed_by TO eliminado_por;

-- historiales
ALTER TABLE historiales RENAME COLUMN title   TO titulo;
ALTER TABLE historiales RENAME COLUMN entries TO entradas;

-- imagenes
ALTER TABLE imagenes RENAME COLUMN owner_id     TO propietario_id;
ALTER TABLE imagenes RENAME COLUMN book_id      TO libro_id;
ALTER TABLE imagenes RENAME COLUMN chapter_id   TO capitulo_id;
ALTER TABLE imagenes RENAME COLUMN storage_path TO ruta_almacenamiento;
ALTER TABLE imagenes RENAME COLUMN alt_text     TO texto_alternativo;

-- mensajes_chat
ALTER TABLE mensajes_chat RENAME COLUMN user_id      TO usuario_id;
ALTER TABLE mensajes_chat RENAME COLUMN display_name TO nombre_mostrado;
ALTER TABLE mensajes_chat RENAME COLUMN content      TO contenido;

-- ---------------------------------------------------------------------
-- 3) RENOMBRE DE CONSTRAINTS
-- ---------------------------------------------------------------------
ALTER TABLE usuarios           RENAME CONSTRAINT users_email_key            TO usuarios_email_key;
ALTER TABLE usuarios           RENAME CONSTRAINT users_pkey                TO usuarios_pkey;
ALTER TABLE usuarios           RENAME CONSTRAINT users_role_check          TO usuarios_rol_check;
ALTER TABLE libros             RENAME CONSTRAINT books_pkey                TO libros_pkey;
ALTER TABLE libros             RENAME CONSTRAINT books_author_id_fkey      TO libros_autor_id_fkey;
ALTER TABLE libros             RENAME CONSTRAINT books_status_check        TO libros_estado_check;
ALTER TABLE libros             RENAME CONSTRAINT books_age_group_check     TO libros_grupo_edad_check;
ALTER TABLE capitulos          RENAME CONSTRAINT chapters_pkey             TO capitulos_pkey;
ALTER TABLE capitulos          RENAME CONSTRAINT chapters_book_id_fkey     TO capitulos_libro_id_fkey;
ALTER TABLE comentarios        RENAME CONSTRAINT comments_pkey             TO comentarios_pkey;
ALTER TABLE comentarios        RENAME CONSTRAINT comments_user_id_fkey     TO comentarios_usuario_id_fkey;
ALTER TABLE comentarios        RENAME CONSTRAINT comments_book_id_fkey     TO comentarios_libro_id_fkey;
ALTER TABLE comentarios        RENAME CONSTRAINT comments_chapter_id_fkey  TO comentarios_capitulo_id_fkey;
ALTER TABLE comentarios        RENAME CONSTRAINT comments_parent_comment_id_fkey TO comentarios_comentario_padre_id_fkey;
ALTER TABLE favoritos          RENAME CONSTRAINT favorites_pkey            TO favoritos_pkey;
ALTER TABLE favoritos          RENAME CONSTRAINT favorites_user_id_book_id_key TO favoritos_usuario_id_libro_id_key;
ALTER TABLE favoritos          RENAME CONSTRAINT favorites_user_id_fkey    TO favoritos_usuario_id_fkey;
ALTER TABLE favoritos          RENAME CONSTRAINT favorites_book_id_fkey    TO favoritos_libro_id_fkey;
ALTER TABLE calificaciones     RENAME CONSTRAINT ratings_pkey              TO calificaciones_pkey;
ALTER TABLE calificaciones     RENAME CONSTRAINT ratings_user_id_book_id_key TO calificaciones_usuario_id_libro_id_key;
ALTER TABLE calificaciones     RENAME CONSTRAINT ratings_rating_check      TO calificaciones_puntuacion_check;
ALTER TABLE calificaciones     RENAME CONSTRAINT ratings_user_id_fkey      TO calificaciones_usuario_id_fkey;
ALTER TABLE calificaciones     RENAME CONSTRAINT ratings_book_id_fkey      TO calificaciones_libro_id_fkey;
ALTER TABLE categorias         RENAME CONSTRAINT categories_pkey           TO categorias_pkey;
ALTER TABLE marcadores         RENAME CONSTRAINT bookmarks_pkey            TO marcadores_pkey;
ALTER TABLE marcadores         RENAME CONSTRAINT bookmarks_user_id_book_id_key TO marcadores_usuario_id_libro_id_key;
ALTER TABLE marcadores         RENAME CONSTRAINT bookmarks_user_id_fkey    TO marcadores_usuario_id_fkey;
ALTER TABLE marcadores         RENAME CONSTRAINT bookmarks_book_id_fkey    TO marcadores_libro_id_fkey;
ALTER TABLE marcadores         RENAME CONSTRAINT bookmarks_chapter_id_fkey TO marcadores_capitulo_id_fkey;
ALTER TABLE imagenes_usuario   RENAME CONSTRAINT user_images_pkey          TO imagenes_usuario_pkey;
ALTER TABLE imagenes_usuario   RENAME CONSTRAINT user_images_user_id_custom_name_key TO imagenes_usuario_usuario_id_nombre_personalizado_key;
ALTER TABLE imagenes_usuario   RENAME CONSTRAINT user_images_user_id_fkey  TO imagenes_usuario_usuario_id_fkey;
ALTER TABLE vistas_libro       RENAME CONSTRAINT book_views_pkey           TO vistas_libro_pkey;
ALTER TABLE vistas_libro       RENAME CONSTRAINT book_views_user_id_fkey   TO vistas_libro_usuario_id_fkey;
ALTER TABLE vistas_libro       RENAME CONSTRAINT book_views_book_id_fkey   TO vistas_libro_libro_id_fkey;
ALTER TABLE tokens_refresco    RENAME CONSTRAINT refresh_tokens_pkey       TO tokens_refresco_pkey;
ALTER TABLE tokens_refresco    RENAME CONSTRAINT refresh_tokens_token_key  TO tokens_refresco_token_key;
ALTER TABLE tokens_refresco    RENAME CONSTRAINT refresh_tokens_user_id_fkey TO tokens_refresco_usuario_id_fkey;
ALTER TABLE lista_negra_tokens RENAME CONSTRAINT token_blacklist_pkey      TO lista_negra_tokens_pkey;
ALTER TABLE lista_negra_tokens RENAME CONSTRAINT token_blacklist_token_key TO lista_negra_tokens_token_key;
ALTER TABLE registros_moderacion RENAME CONSTRAINT moderation_logs_pkey    TO registros_moderacion_pkey;
ALTER TABLE colecciones        RENAME CONSTRAINT collections_pkey          TO colecciones_pkey;
ALTER TABLE colecciones        RENAME CONSTRAINT collections_owner_id_fkey TO colecciones_propietario_id_fkey;
ALTER TABLE libros_coleccion   RENAME CONSTRAINT collection_books_pkey     TO libros_coleccion_pkey;
ALTER TABLE libros_coleccion   RENAME CONSTRAINT collection_books_collection_id_fkey TO libros_coleccion_coleccion_id_fkey;
ALTER TABLE libros_coleccion   RENAME CONSTRAINT collection_books_book_id_fkey TO libros_coleccion_libro_id_fkey;
ALTER TABLE notificaciones     RENAME CONSTRAINT notifications_pkey        TO notificaciones_pkey;
ALTER TABLE notificaciones     RENAME CONSTRAINT notifications_user_id_fkey TO notificaciones_usuario_id_fkey;
ALTER TABLE usuarios_baneados  RENAME CONSTRAINT banned_users_pkey         TO usuarios_baneados_pkey;
ALTER TABLE usuarios_baneados  RENAME CONSTRAINT banned_users_email_key    TO usuarios_baneados_email_key;
ALTER TABLE papelera           RENAME CONSTRAINT trash_pkey                TO papelera_pkey;
ALTER TABLE historiales        RENAME CONSTRAINT changelogs_pkey           TO historiales_pkey;
ALTER TABLE metricas           RENAME CONSTRAINT metrics_pkey              TO metricas_pkey;
ALTER TABLE metricas           RENAME CONSTRAINT metrics_key_key           TO metricas_key_key;
ALTER TABLE config_sitio       RENAME CONSTRAINT site_config_pkey          TO config_sitio_pkey;
ALTER TABLE anuncios           RENAME CONSTRAINT announcements_pkey        TO anuncios_pkey;
ALTER TABLE anuncios           RENAME CONSTRAINT announcements_admin_id_fkey TO anuncios_admin_id_fkey;
ALTER TABLE imagenes           RENAME CONSTRAINT images_pkey               TO imagenes_pkey;
ALTER TABLE imagenes           RENAME CONSTRAINT images_owner_id_fkey      TO imagenes_propietario_id_fkey;
ALTER TABLE imagenes           RENAME CONSTRAINT images_book_id_fkey       TO imagenes_libro_id_fkey;
ALTER TABLE imagenes           RENAME CONSTRAINT images_chapter_id_fkey    TO imagenes_capitulo_id_fkey;
ALTER TABLE mensajes_chat      RENAME CONSTRAINT chat_messages_pkey        TO mensajes_chat_pkey;

-- ---------------------------------------------------------------------
-- 4) RENOMBRE DE ÍNDICES
-- ---------------------------------------------------------------------
ALTER INDEX idx_books_title       RENAME TO idx_libros_titulo;
ALTER INDEX idx_books_category    RENAME TO idx_libros_categoria;
ALTER INDEX idx_books_age_group   RENAME TO idx_libros_grupo_edad;
ALTER INDEX idx_users_email       RENAME TO idx_usuarios_email;
ALTER INDEX idx_chapters_book     RENAME TO idx_capitulos_libro;
ALTER INDEX idx_favorites_book    RENAME TO idx_favoritos_libro;
ALTER INDEX idx_ratings_book      RENAME TO idx_calificaciones_libro;
ALTER INDEX idx_refresh_tokens_token RENAME TO idx_tokens_refresco_token;
ALTER INDEX idx_refresh_tokens_user  RENAME TO idx_tokens_refresco_usuario;
ALTER INDEX idx_trash_expires     RENAME TO idx_papelera_expira;
ALTER INDEX idx_trash_email       RENAME TO idx_papelera_email_usuario;
ALTER INDEX idx_bookmarks_user    RENAME TO idx_marcadores_usuario;
ALTER INDEX idx_bookmarks_book    RENAME TO idx_marcadores_libro;
ALTER INDEX idx_user_images_user  RENAME TO idx_imagenes_usuario_usuario;

-- ---------------------------------------------------------------------
-- 5) ESTADOS DE LIBROS: traducción de valores y check constraint
-- La constraint vieja se elimina ANTES de actualizar los valores,
-- de lo contrario los UPDATE violan el CHECK con valores en inglés.
-- ---------------------------------------------------------------------
ALTER TABLE libros DROP CONSTRAINT libros_estado_check;

UPDATE libros SET estado='borrador'  WHERE estado='draft';
UPDATE libros SET estado='publicado' WHERE estado='published';
UPDATE libros SET estado='eliminado' WHERE estado='deleted';

ALTER TABLE libros ADD CONSTRAINT libros_estado_check
    CHECK (estado IN ('borrador','publicado','eliminado'));

-- ---------------------------------------------------------------------
-- 6) CONFIG_SITIO: claves JSONB traducidas + marca de migración
-- ---------------------------------------------------------------------
UPDATE config_sitio SET key='enlace_historial' WHERE key='changelog_link';
UPDATE config_sitio SET key='historiales'      WHERE key='changelogs';
UPDATE config_sitio SET key='version_actual'   WHERE key='current_version';
UPDATE config_sitio SET key='huevos_pascua'    WHERE key='easter_eggs';

INSERT INTO config_sitio (key, value)
VALUES ('config_meta', jsonb_build_object(
    'esquema_traducido', true,
    'fecha', to_jsonb(now())
))
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value;

COMMIT;

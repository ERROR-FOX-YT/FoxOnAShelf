-- =====================================================================
-- FoxOnAShelf™ - Seeds honestos
-- =====================================================================
-- Reglas:
--   * Sólo 3 cuentas: usuarioTest (creator), admin (admin+mod), adminFox (admin+mod).
--   * usuarioTest es autor de TODOS los libros de ejemplo.
--   * Sin favoritos falsos. favorite_count = 0. views = 0.
--   * banned_users INICIA VACÍO.
--   * Idempotente: usa ON CONFLICT.
-- =====================================================================

-- ---------------------------------------------------------------------
-- USUARIOS DE PRUEBA
-- password = admin123  -> bcrypt hash (cost 10)
-- $2b$10$KIXkLDk5WXxJ8b0OQk7M6.AmDqK5N0J5/wA9d3aWVxYXJqJq3pHQ.
-- (este hash se genera dinámicamente por seed.js, aquí va sólo de respaldo)
-- ---------------------------------------------------------------------
INSERT INTO users (id, email, password_hash, display_name, role)
VALUES
  ('11111111-1111-1111-1111-111111111111',
   'usuarioTest@foxonashelf.app',
   '$2b$10$KIXkLDk5WXxJ8b0OQk7M6.AmDqK5N0J5/wA9d3aWVxYXJqJq3pHQ.',
   'Usuario Test', 'creator'),
  ('22222222-2222-2222-2222-222222222222',
   'admin@foxonashelf.app',
   '$2b$10$KIXkLDk5WXxJ8b0OQk7M6.AmDqK5N0J5/wA9d3aWVxYXJqJq3pHQ.',
   'Administrador', 'admin'),
  ('33333333-3333-3333-3333-333333333333',
   'adminFox@foxonashelf.app',
   '$2b$10$KIXkLDk5WXxJ8b0OQk7M6.AmDqK5N0J5/wA9d3aWVxYXJqJq3pHQ.',
   'Admin Fox', 'admin')
ON CONFLICT (email) DO UPDATE
SET display_name = EXCLUDED.display_name,
    role         = EXCLUDED.role;

-- ---------------------------------------------------------------------
-- INFORMACIÓN Y CONTACTOS (editable desde panel admin)
-- ---------------------------------------------------------------------
UPDATE users SET contact_info =
  'Discord oficial: https://discord.gg/j543pdNhae | contacto@foxonashelf.example'
WHERE email = 'admin@foxonashelf.app';

-- ---------------------------------------------------------------------
-- LIBROS DE EJEMPLO (autor = usuarioTest)
--   * 2 por grupo de edad (infantil, adolescente, adulto)
--   * 1 por categoría (fantasia, poesia, narrativa, educativa)
--   * Todos status = published, favorite_count = 0, views = 0
-- ---------------------------------------------------------------------
INSERT INTO books (id, title, subtitle, description, author_id, status,
                   is_free, category, age_group, favorite_count, views)
VALUES
  ('aaaaaaaa-0001-0000-0000-000000000001',
   'El Bosque de las Letras',
   'Cuento ilustrado para soñar',
   'Un cuento corto para niños sobre un bosque donde las palabras cobran vida.',
   '11111111-1111-1111-1111-111111111111',
   'published', true, 'fantasia', 'infantil', 0, 0),

  ('aaaaaaaa-0001-0000-0000-000000000002',
   'La Maestra Lupa',
   'Aprender jugando',
   'Historia educativa sobre la curiosidad y los números.',
   '11111111-1111-1111-1111-111111111111',
   'published', true, 'educativa', 'infantil', 0, 0),

  ('aaaaaaaa-0002-0000-0000-000000000001',
   'Brújula Rota',
   'Aventura adolescente',
   'Una novela corta sobre crecer y encontrar dirección.',
   '11111111-1111-1111-1111-111111111111',
   'published', true, 'narrativa', 'adolescente', 0, 0),

  ('aaaaaaaa-0002-0000-0000-000000000002',
   'Versos del Recreo',
   'Poemario adolescente',
   'Poemas sobre amistad, escuela y descubrir el mundo.',
   '11111111-1111-1111-1111-111111111111',
   'published', true, 'poesia', 'adolescente', 0, 0),

   ('aaaaaaaa-0003-0000-0000-000000000001',
    'Cenizas del Ayer',
    'Novela adulto contemporánea',
    'Una reflexión sobre pérdida, memoria y segundas oportunidades.',
    '11111111-1111-1111-1111-111111111111',
    'published', true, 'narrativa', 'adulto', 0, 0),

   ('aaaaaaaa-0003-0000-0000-000000000002',
    'El Último Vagón',
    'Relato adulto contemporáneo',
    'Dos desconocidos conversan en un tren y cambian sus vidas.',
    '11111111-1111-1111-1111-111111111111',
    'published', true, 'narrativa', 'adulto', 0, 0)
ON CONFLICT (id) DO UPDATE
SET title        = EXCLUDED.title,
    subtitle     = EXCLUDED.subtitle,
    description  = EXCLUDED.description,
    category     = EXCLUDED.category,
    age_group    = EXCLUDED.age_group,
    status       = EXCLUDED.status;

-- ---------------------------------------------------------------------
-- CAPÍTULOS DE EJEMPLO (1 por libro)
-- ---------------------------------------------------------------------
INSERT INTO chapters (id, book_id, title, content, "order")
VALUES
   ('bbbbbbbb-0001-0000-0000-000000000001',
    'aaaaaaaa-0001-0000-0000-000000000001',
    'Capítulo 1 — La hoja despierta',
    E'Era una mañana tibia cuando las letras del bosque empezaron a moverse...\n\nLa pequeña Luna escuchó un susurro entre las hojas. Las palabras brillaban con luz propia y danzaban alrededor de los árboles.\n\n—Ven —dijo una letra dorada—, te llevaré al corazón del bosque.\n\nY así comenzó la aventura más maravillosa que Luna jamás había imaginado.', 1),

   ('bbbbbbbb-0001-0000-0000-000000000002',
    'aaaaaaaa-0001-0000-0000-000000000002',
    'Capítulo 1 — Cuenta conmigo',
    E'La maestra Lupa enseñaba que cada número tenía un secreto. El 1 era el inicio de todo, el 2 la compañía, el 3 la magia.\n\n—Hoy descubriremos por qué el 7 es el número más curioso —dijo Lupa, ajustando sus gafas redondas.\n\nLos niños se sentaron en círculo, listos para aprender jugando.', 1),

   ('bbbbbbbb-0002-0000-0000-000000000001',
    'aaaaaaaa-0002-0000-0000-000000000001',
    'Capítulo 1 — El norte perdido',
    E'Cuando Camila abrió la mochila, su brújula ya no señalaba ningún lado. La aguja giraba sin rumbo, como si hubiera olvidado su propósito.\n\n—Esto no me gusta —murmuró.\n\nA su alrededor, el bosque se extendía denso y desconocido.\n\n—Tranquila —dijo una voz detrás de ella—. Tal vez la brújula no esté rota. Tal vez el norte se haya movido.', 1),

   ('bbbbbbbb-0002-0000-0000-000000000002',
    'aaaaaaaa-0002-0000-0000-000000000002',
    'Poemas del Recreo',
    E'A veces el recreo / es la única estrofa / donde caben todos.\n\nEl timbre suena / y estallan las risas / como versos libres.\n\nEn la cancha / las voces se mezclan / formando un coro / que nadie dirige.\n\nEl cielo azul / es el techo / de esta clase sin paredes.\n\nY cuando vuelve el silencio / cada quien guarda / un poema en el bolsillo.', 1),

   ('bbbbbbbb-0003-0000-0000-000000000001',
    'aaaaaaaa-0003-0000-0000-000000000001',
    'Capítulo 1 — El eco del ayer',
    E'Las cenizas aún flotaban en el aire cuando Elena comprendió que no habría vuelta atrás. La casa de su abuela ya no existía, pero los recuerdos seguían ahí, incólumes.\n\nRecogió una fotografía carbonizada en una esquina.\n\n—Tenía razón —susurró.\n\nY entre los escombros, empezó a reconstruir lo que el tiempo había desgastado.', 1),

   ('bbbbbbbb-0003-0000-0000-000000000002',
    'aaaaaaaa-0003-0000-0000-000000000002',
    'Capítulo 1 — El encuentro',
    E'El vagón estaba prácticamente vacío. Solo un hombre de mirada cansada ocupaba el asiento del fondo, junto a la ventana. Carla dudó un segundo antes de sentarse frente a él.\n\n—Buenas noches —dijo ella, rompiendo el silencio.\n\nEl hombre levantó la vista. Tenía los ojos color miel y una sonrisa que parecía guardar más preguntas que respuestas.\n\n—¿Cree en las segundas oportunidades? —preguntó él, sin preámbulos.\n\nCarla no supo qué responder. Pero intuyó que esa conversación cambiaría algo en ella.', 1)
ON CONFLICT (id) DO UPDATE
SET title   = EXCLUDED.title,
    content = EXCLUDED.content;

-- ---------------------------------------------------------------------
-- ANUNCIO DE EJEMPLO (visible en Home)
-- ---------------------------------------------------------------------
INSERT INTO announcements (id, admin_id, title, content, visible)
VALUES
  ('cccccccc-0000-0000-0000-000000000001',
   '22222222-2222-2222-2222-222222222222',
   'Bienvenido a FoxOnAShelf',
   'Plataforma de lectura digital abierta y justa. Comienza explorando libros gratuitos.',
   true)
ON CONFLICT (id) DO UPDATE
SET title   = EXCLUDED.title,
    content = EXCLUDED.content;

-- ---------------------------------------------------------------------
-- MÉTRICAS (claves persistidas - los valores se recalculan al consultar)
-- ---------------------------------------------------------------------
INSERT INTO metrics (key, value) VALUES
  ('books_total', 0),
  ('authors_total', 0),
  ('views_total', 0)
ON CONFLICT (key) DO NOTHING;

-- banned_users INICIA VACÍO - no insertamos nada.

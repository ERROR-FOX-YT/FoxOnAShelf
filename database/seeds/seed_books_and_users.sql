-- =====================================================================
-- Booked™ - Seeds honestos
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
INSERT INTO users (id, email, password_hash, display_name, role, is_admin_fox)
VALUES
  ('11111111-1111-1111-1111-111111111111',
   'usuarioTest@booked.com',
   '$2b$10$KIXkLDk5WXxJ8b0OQk7M6.AmDqK5N0J5/wA9d3aWVxYXJqJq3pHQ.',
   'Usuario Test', 'creator', false),
  ('22222222-2222-2222-2222-222222222222',
   'admin@booked.com',
   '$2b$10$KIXkLDk5WXxJ8b0OQk7M6.AmDqK5N0J5/wA9d3aWVxYXJqJq3pHQ.',
   'Administrador', 'admin', false),
  ('33333333-3333-3333-3333-333333333333',
   'adminFox@booked.com',
   '$2b$10$KIXkLDk5WXxJ8b0OQk7M6.AmDqK5N0J5/wA9d3aWVxYXJqJq3pHQ.',
   'Admin Fox', 'admin', true)
ON CONFLICT (email) DO UPDATE
SET display_name = EXCLUDED.display_name,
    role         = EXCLUDED.role,
    is_admin_fox = EXCLUDED.is_admin_fox;

-- ---------------------------------------------------------------------
-- INFORMACIÓN Y CONTACTOS (editable desde panel admin)
-- ---------------------------------------------------------------------
UPDATE users SET contact_info =
  'Discord oficial: https://discord.gg/j543pdNhae | contacto@booked.example'
WHERE email = 'admin@booked.com';

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
   'Café de las 5:00',
   'Relatos cortos',
   'Colección de cuentos breves sobre vida adulta en Colombia.',
   '11111111-1111-1111-1111-111111111111',
   'published', true, 'narrativa', 'adulto', 0, 0),

  ('aaaaaaaa-0003-0000-0000-000000000002',
   'La última pluma',
   'Novela de fantasía adulta',
   'Una historia de fantasía sobre el último escriba de un imperio en ruinas.',
   '11111111-1111-1111-1111-111111111111',
   'published', true, 'fantasia', 'adulto', 0, 0)
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
   E'Era una mañana tibia cuando las letras del bosque empezaron a moverse...\n\nLa pequeña Luna escuchó un susurro entre las hojas.', 1),

  ('bbbbbbbb-0001-0000-0000-000000000002',
   'aaaaaaaa-0001-0000-0000-000000000002',
   'Capítulo 1 — Cuenta conmigo',
   E'La maestra Lupa enseñaba que cada número tenía un secreto...', 1),

  ('bbbbbbbb-0002-0000-0000-000000000001',
   'aaaaaaaa-0002-0000-0000-000000000001',
   'Capítulo 1 — El norte perdido',
   E'Cuando Camila abrió la mochila, su brújula ya no señalaba ningún lado.', 1),

  ('bbbbbbbb-0002-0000-0000-000000000002',
   'aaaaaaaa-0002-0000-0000-000000000002',
   'Poemas',
   E'A veces el recreo / es la única estrofa / donde caben todos.', 1),

  ('bbbbbbbb-0003-0000-0000-000000000001',
   'aaaaaaaa-0003-0000-0000-000000000001',
   'Café de las 5:00',
   E'La taza humeaba sobre la mesa, y el día apenas comenzaba a aclararse...', 1),

  ('bbbbbbbb-0003-0000-0000-000000000002',
   'aaaaaaaa-0003-0000-0000-000000000002',
   'Capítulo 1 — El último escriba',
   E'En las ruinas del imperio sólo quedaba una mano dispuesta a escribir.', 1)
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
   'Bienvenido a Booked',
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

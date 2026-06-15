# BookShelf™ — Base de datos

Base de datos relacional sobre **Postgres 13+** (o **Supabase**, que es Postgres
gestionado). Para la demo local se incluye además un **modo JSON** (sin instalar
Postgres) — útil para probar la plataforma en cinco minutos.

## Estructura

```
database/
├─ migrations/
│  ├─ 001_create_tables.sql      # Tablas, índices y ejemplos de RLS
│  ├─ 002_add_refresh_tokens_deleted_at.sql  # refresh_tokens + deleted_at en banned_users
│  ├─ 003_create_bookmarks.sql   # Tabla bookmarks para progreso de lectura
│  └─ 004_create_user_images.sql # Tabla user_images para imágenes reutilizables (@img:nombre)
├─ seeds/
│  ├─ seed_books_and_users.sql   # SQL idempotente con datos honestos
│  └─ seed.js                    # Runner Node: Postgres o JSON
└─ README.database.md
```

## Modo Postgres local

1. Crea la base:
   ```sql
   CREATE DATABASE bookshelf_db;
   ```
2. Define en `BookShelf/.env` (raíz):
   ```
   DATABASE_URL=postgres://usuario:password@localhost:5432/bookshelf_db
   DB_MODE=postgres
   ```
3. Ejecuta migración + seeds:
   ```bash
   cd backend
   npm install
   node ../database/seeds/seed.js
   ```

## Modo Supabase

1. Crea un proyecto vacío en Supabase y copia la cadena de conexión Postgres en
   `DATABASE_URL`.
2. Sube `migrations/001_create_tables.sql` desde el editor SQL del panel.
3. Sube `seeds/seed_books_and_users.sql` (también desde el editor SQL) **o**
   ejecuta `node database/seeds/seed.js`.
4. Para activar RLS:
   ```sql
   ALTER TABLE books ENABLE ROW LEVEL SECURITY;
   -- Reproduce las políticas que están comentadas al final de 001_create_tables.sql
   ```

## Modo JSON (demo sin Postgres)

1. En `BookShelf/.env`:
   ```
   DB_MODE=json
   ```
2. `node database/seeds/seed.js` generará `backend/storage/db.json`.
3. El backend detecta `DB_MODE=json` y usa ese archivo como almacenamiento.

Los seeds son **idempotentes**: se pueden re-ejecutar sin duplicar registros
(usan `ON CONFLICT` en Postgres y upsert manual en JSON).

> **Migración 002**: si tu base ya fue creada con la migración 001, ejecuta
> `002_add_refresh_tokens_deleted_at.sql` para agregar la columna `deleted_at`
> y la tabla `refresh_tokens`.

> **Migración 003**: `003_create_bookmarks.sql` agrega la tabla `bookmarks` para
> persistir el progreso de lectura (capítulo, scroll, finished) por usuario/libro.

> **Migración 004**: `004_create_user_images.sql` agrega la tabla `user_images`
> para imágenes reutilizables con nombre custom (`@img:nombre`). Relacionada con
> el endpoint `/api/user-images` y la página `/library`.

## Datos sembrados (honestos)

| Concepto              | Valor                                                |
|-----------------------|------------------------------------------------------|
| Usuarios reales       | 3 (usuarioTest, admin, adminFox)                     |
| Autores registrados   | 1 (sólo usuarioTest tiene rol creator)               |
| Libros publicados     | 6 (2 por grupo de edad, ≥1 por categoría)            |
| Categorías            | 4 (fantasía, poesía, narrativa, educativa)           |
| favorite_count        | 0 en todos                                           |
| views                 | 0 en todos (se cuentan tras 10s en la página)        |
| Ratings / favoritos   | Vacío (no se siembran datos falsos)                  |
| banned_users          | Vacío (columnas: id, email, reason, appeal, appeal_submitted, banned_at, unbanned_at, deleted_at) |

## Credenciales (sólo demo)

| Email                    | Contraseña | Rol                 |
|--------------------------|------------|---------------------|
| usuarioTest@bookshelf.app   | admin123   | creator             |
| admin@bookshelf.app         | admin123   | admin + moderator   |
| adminFox@bookshelf.app      | admin123   | admin + moderator |

## RLS — cómo activar

El archivo `001_create_tables.sql` deja comentadas las políticas. Para
activarlas en Supabase basta con `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
y luego pegar las `CREATE POLICY ...` del bloque comentado al final del archivo.

En Postgres local sin RLS, el backend Express ejerce el control de acceso por
middleware (`backend/src/middlewares/auth.js`).

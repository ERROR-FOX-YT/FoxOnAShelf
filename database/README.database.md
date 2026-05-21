# Booked™ — Base de datos

Base de datos relacional sobre **Postgres 13+** (o **Supabase**, que es Postgres
gestionado). Para la demo local se incluye además un **modo JSON** (sin instalar
Postgres) — útil para probar la plataforma en cinco minutos.

## Estructura

```
database/
├─ migrations/
│  └─ 001_create_tables.sql      # Tablas, índices y ejemplos de RLS
├─ seeds/
│  ├─ seed_books_and_users.sql   # SQL idempotente con datos honestos
│  └─ seed.js                    # Runner Node: Postgres o JSON
└─ README.database.md
```

## Modo Postgres local

1. Crea la base:
   ```sql
   CREATE DATABASE booked_db;
   ```
2. Define en `Booked/.env` (raíz):
   ```
   DATABASE_URL=postgres://usuario:password@localhost:5432/booked_db
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

1. En `Booked/.env`:
   ```
   DB_MODE=json
   ```
2. `node database/seeds/seed.js` generará `backend/storage/db.json`.
3. El backend detecta `DB_MODE=json` y usa ese archivo como almacenamiento.

Los seeds son **idempotentes**: se pueden re-ejecutar sin duplicar registros
(usan `ON CONFLICT` en Postgres y upsert manual en JSON).

## Datos sembrados (honestos)

| Concepto              | Valor                                                |
|-----------------------|------------------------------------------------------|
| Usuarios reales       | 3 (usuarioTest, admin, adminFox)                     |
| Autores registrados   | 1 (sólo usuarioTest tiene rol creator)               |
| Libros publicados     | 6 (2 por grupo de edad, ≥1 por categoría)            |
| favorite_count        | 0 en todos                                           |
| views                 | 0 en todos                                           |
| Ratings / favoritos   | Vacío (no se siembran datos falsos)                  |
| banned_users          | Vacío                                                |

## Credenciales (sólo demo)

| Email                    | Contraseña | Rol                 |
|--------------------------|------------|---------------------|
| usuarioTest@booked.com   | admin123   | creator             |
| admin@booked.com         | admin123   | admin + moderator   |
| adminFox@booked.com      | admin123   | admin + moderator (adminFox) |

## RLS — cómo activar

El archivo `001_create_tables.sql` deja comentadas las políticas. Para
activarlas en Supabase basta con `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
y luego pegar las `CREATE POLICY ...` del bloque comentado al final del archivo.

En Postgres local sin RLS, el backend Express ejerce el control de acceso por
middleware (`backend/src/middlewares/auth.js`).

# Booked™ — Backend

Node.js + Express. Soporta dos backends de datos intercambiables:

- **postgres** (`DATABASE_URL` definido o `DB_MODE=postgres`).
- **json**: archivo `backend/storage/db.json` para demo sin instalar Postgres.

## Ejecutar

```bash
cd backend
npm install
npm run seed     # crea/actualiza datos (modo según .env)
npm start
```

Por defecto: `http://localhost:4000`.

## Endpoints (resumen)

| Método | Ruta                             | Rol         |
|--------|----------------------------------|-------------|
| POST   | /api/auth/register               | público     |
| POST   | /api/auth/login                  | público     |
| POST   | /api/auth/appeal                 | público (1× por baneado) |
| GET    | /api/users/:id                   | público     |
| PUT    | /api/users/:id                   | dueño/admin |
| GET    | /api/books                       | público     |
| POST   | /api/books                       | creator/admin |
| PUT    | /api/books/:id                   | autor/mod/admin |
| DELETE | /api/books/:id                   | autor/mod/admin |
| GET    | /api/books/:id                   | público     |
| POST   | /api/books/:id/chapters          | autor/mod/admin |
| POST   | /api/books/:id/favorite          | autenticado |
| POST   | /api/books/:id/rate              | autenticado |
| POST   | /api/books/:id/comment           | autenticado |
| POST   | /api/books/:id/import-file       | autor/mod/admin |
| GET    | /api/search?q=…                  | público     |
| GET    | /api/announcements               | público     |
| POST   | /api/announcements               | admin       |
| GET    | /api/metrics                     | público     |
| POST   | /api/upload                      | autenticado |
| GET    | /api/moderation/banned           | admin       |
| POST   | /api/moderation/ban              | admin       |
| POST   | /api/moderation/unban            | admin       |
| GET    | /api/moderation/moderators       | admin       |
| POST   | /api/moderation/export-banned    | admin       |
| PUT    | /api/moderation/contact-info     | admin       |
| GET    | /api/health                      | público     |

Ver `docs/api.md` para ejemplos curl.

## Seguridad mínima

- Contraseñas con `bcryptjs` (10 rondas).
- JWT firmado con `JWT_SECRET` (HS256). Expira en `JWT_EXPIRES_IN`.
- Middleware `auth.js` valida token + checa blacklist + checa ban activo.
- Banear invalida sesiones (`blacklistAllUserTokens`).
- Inputs validados con `express-validator`.
- Queries parametrizadas con `pg`.

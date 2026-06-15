# BookShelf™ — Backend

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

## Endpoints

| Método | Ruta                                    | Rol / Auth                |
|--------|-----------------------------------------|---------------------------|
| POST   | /api/auth/register                      | público (+ refresh token) |
| POST   | /api/auth/login                         | público (+ refresh token) |
| POST   | /api/auth/refresh                       | público (refresh token)   |
| POST   | /api/auth/logout                        | autenticado               |
| POST   | /api/auth/appeal                        | público (múltiple, sobrescribe) |
| GET    | /api/users/:id                          | público                   |
| GET    | /api/users/find/:email                  | admin                     |
| PUT    | /api/users/:id                          | dueño/admin               |
| DELETE | /api/users/:id                          | admin                     |
| GET    | /api/books[?category&age_group&q&author_id&status] | público       |
| POST   | /api/books                              | creator/admin             |
| PUT    | /api/books/:id                          | autor/mod/admin           |
| DELETE | /api/books/:id                          | autor/mod/admin           |
| GET    | /api/books/:id                          | público (optionalAuth)    |
| POST   | /api/books/:id/view                     | público (optionalAuth)    |
| POST   | /api/books/:id/reset-views              | admin                     |
| POST   | /api/books/:id/chapters                 | autor/mod/admin           |
| PUT    | /api/books/:id/chapters/:chapterId      | autor/mod/admin           |
| POST   | /api/books/:id/favorite                 | autenticado               |
| POST   | /api/books/:id/rate                     | autenticado               |
| POST   | /api/books/:id/comment                  | autenticado               |
| DELETE | /api/books/:id/comments/:commentId      | autor/moderador/admin     |
| GET    | /api/books/:id/comments                 | público                   |
| POST   | /api/books/:id/import-file              | autor/mod/admin           |
| GET    | /api/search?q=…                         | público                   |
| GET    | /api/search/authors?q=…                 | público                   |
| GET    | /api/categories                         | público                   |
| POST   | /api/categories                         | admin                     |
| DELETE | /api/categories/:name                   | admin                     |
| GET    | /api/announcements                      | público                   |
| POST   | /api/announcements                      | moderator/admin           |
| PUT    | /api/announcements/:id/feature          | admin                     |
| PUT    | /api/announcements/:id/published-by     | admin                     |
| DELETE | /api/announcements/:id                  | admin                     |
| GET    | /api/metrics                            | público                   |
| GET    | /api/metrics/featured                   | público                   |
| POST   | /api/upload                             | autenticado               |
| DELETE | /api/upload/:fileName                   | autenticado               |
| GET    | /api/user-images                        | autenticado               |
| POST   | /api/user-images                        | autenticado (multipart)   |
| PUT    | /api/user-images/:id                    | autenticado (dueño)       |
| DELETE | /api/user-images/:id                    | autenticado (dueño)       |
| GET    | /api/user-images/resolve/:authorId/:name | público                  |
| GET    | /api/changelogs                         | público                   |
| GET    | /api/changelogs/config                  | público                   |
| POST   | /api/changelogs                         | admin                     |
| PUT    | /api/changelogs/:id                     | admin                     |
| DELETE | /api/changelogs/:id                     | admin                     |
| PUT    | /api/changelogs/config                  | admin                     |
| GET    | /api/moderation/banned                  | moderator/admin           |
| POST   | /api/moderation/ban                     | moderator/admin           |
| POST   | /api/moderation/unban                   | moderator/admin           |
| DELETE | /api/moderation/banned/:email           | admin                     |
| GET    | /api/moderation/users[?q&role]          | moderator/admin           |
| GET    | /api/moderation/deleted-accounts        | moderator/admin           |
| POST   | /api/moderation/appeal                  | autenticado               |
| GET    | /api/moderation/moderators              | moderator/admin           |
| POST   | /api/moderation/set-moderator           | admin                     |
| POST   | /api/moderation/remove-moderator        | admin                     |
| POST   | /api/moderation/export-banned           | admin                     |
| PUT    | /api/moderation/contact-info            | admin                     |
| GET    | /api/health                             | público                   |

Ver `docs/api.md` para ejemplos curl.

## Seguridad mínima

- Contraseñas con `bcryptjs` (10 rondas).
- JWT firmado con `JWT_SECRET` (HS256). Expira en `JWT_EXPIRES_IN`.
- Refresh token UUID (30 días, rotation): cada refresh invalida el token anterior.
- Logout server-side: blacklist access token + revoca todos los refresh tokens.
- Middleware `auth.js` valida token + checa blacklist + checa ban activo.
- Middleware `optionalAuth` — valida token (firma, blacklist, cutoff, ban) si existe, pero nunca rechaza la petición.
- Banear invalida sesiones (`blacklistAllUserTokens`).
- **Rate limiting**: 5 registros/minuto, 10 login attempts/minuto por IP (in-memory sliding window).
- Inputs validados con `express-validator`.
- Queries parametrizadas con `pg`.
- Protección contra path traversal en subida de archivos.
- Escape de inyección LIKE en búsquedas (`%`, `_` escapados con `ESCAPE`).

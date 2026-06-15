# API — BookShelf™

Base URL local: `http://localhost:4000`. Todas las rutas devuelven JSON.

Para rutas autenticadas: `Authorization: Bearer <JWT>`.

## Auth

### Registro
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"nuevo@bookshelf.app","password":"secret123","display_name":"Nuevo"}'
```
Respuesta: `{ token, refreshToken, user }`.

> **Easter egg**: si `display_name` coincide con `error_fox` o `error fox` (variantes
> de espacios, guiones, guiones bajos y mayúsculas/minúsculas), responde
> `418 { error: "ERROR 418: &quot;nombre del secreto&quot;", easter_egg: true }`.

> **Rate limiting**: 5 peticiones/minuto por IP (429 si se excede).

### Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@bookshelf.app","password":"admin123"}'
```
Respuesta: `{ token, refreshToken, user }`.

> **Rate limiting**: 10 peticiones/minuto por IP (429 si se excede).

Si el correo está baneado: `403 { error, banned:true, can_appeal, reason }`. El campo `can_appeal` depende de si el usuario ya envió una apelación previamente (`banned.appeal_submitted`).

### Refresh token
```bash
curl -X POST http://localhost:4000/api/auth/refresh \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"<uuid>"}'
```
Respuesta: `{ token, refreshToken, user }`. El refresh token anterior queda invalidado (rotation).

### Logout (server-side)
```bash
curl -X POST http://localhost:4000/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```
Blacklistea el access token y revoca todos los refresh tokens del usuario.

### Apelación (múltiple)
```bash
curl -X POST http://localhost:4000/api/auth/appeal \
  -H 'Content-Type: application/json' \
  -d '{"email":"baneado@bookshelf.app","appeal":"Quisiera explicar..."}'
```
Sin límite de envío: cada apelación sobrescribe la anterior.

## Libros

### Listar
```bash
curl 'http://localhost:4000/api/books?age_group=adolescente&category=poesía'
curl 'http://localhost:4000/api/books?author_id=...'  # filtrar por autor
curl 'http://localhost:4000/api/books?status=all'     # incluir borradores/eliminados (admin)
```

### Detalle
```bash
curl http://localhost:4000/api/books/aaaaaaaa-0001-0000-0000-000000000001
```
> Las vistas NO se incrementan aquí. Usar `POST /api/books/:id/view`.

### Registrar vista (10s timer desde frontend)
```bash
curl -X POST http://localhost:4000/api/books/<id>/view
```
Autenticación opcional. Si el usuario está autenticado, se evita contar vistas
duplicadas (vía `book_views`). Ghosts (no autenticados) siempre cuentan.

### Reiniciar vistas (admin)
```bash
curl -X POST http://localhost:4000/api/books/<id>/reset-views \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
Pone `views=0` y limpia el tracking `book_views`.

### Crear (creator/admin)
```bash
curl -X POST http://localhost:4000/api/books \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Mi libro","description":"...","category":"narrativa","age_group":"adulto"}'
```

### Eliminar (autor/admin/moderador)
```bash
curl -X DELETE http://localhost:4000/api/books/<id> \
  -H "Authorization: Bearer $TOKEN"
```

### Editar
```bash
curl -X PUT http://localhost:4000/api/books/<id> \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Nuevo título","status":"published"}'
```

### Crear capítulo
```bash
curl -X POST http://localhost:4000/api/books/<id>/chapters \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Capítulo 1","content":"...","order":1}'
```

### Favorito (toggle)
```bash
curl -X POST http://localhost:4000/api/books/<id>/favorite \
  -H "Authorization: Bearer $TOKEN"
```

### Calificar
```bash
curl -X POST http://localhost:4000/api/books/<id>/rate \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"rating":5}'
```

### Comentar
```bash
curl -X POST http://localhost:4000/api/books/<id>/comment \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"content":"Buen libro"}'
# Opcional: chapter_id, parent_comment_id para respuestas en cadena
```

### Eliminar comentario (autor/moderador/admin)
```bash
curl -X DELETE http://localhost:4000/api/books/<id>/comments/<commentId> \
  -H "Authorization: Bearer $TOKEN"
```
El autor del comentario, moderadores y admins pueden eliminar cualquier comentario.

### Imágenes usadas en un libro (admin/moderador editando libro ajeno)
```bash
curl http://localhost:4000/api/books/<id>/images \
  -H "Authorization: Bearer $TOKEN"
```
Escanea los capítulos en busca de referencias `@img:<name>` y las resuelve contra el autor del libro.
Respuesta: `{ images: [{ custom_name, url, owner: { id, display_name, email } }], author_id }`.

### Importar archivo a libro
```bash
curl -X POST http://localhost:4000/api/books/<id>/import-file \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@mi-libro.md" \
  -F "original_public=true"
```

## Categorías

```bash
# Listar (público)
curl http://localhost:4000/api/categories

# Crear (admin)
curl -X POST http://localhost:4000/api/categories \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"ciencia ficción"}'

# Eliminar (admin) — libros con esa categoría pasan a "en espera de categorización"
curl -X DELETE http://localhost:4000/api/categories/ciencia%20ficción \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Anuncios

```bash
# Listar (público) — destacados primero, orden descendente por fecha
curl http://localhost:4000/api/announcements

# Crear (admin o moderator)
curl -X POST http://localhost:4000/api/announcements \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Mantenimiento","content":"Mañana a las 10pm."}'

# Destacar/quitar destacado (admin)
curl -X PUT http://localhost:4000/api/announcements/<id>/feature \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Editar "Publicado por" (admin)
curl -X PUT http://localhost:4000/api/announcements/<id>/published-by \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"published_by":"Comunicados oficiales"}'

# Eliminar (admin)
curl -X DELETE http://localhost:4000/api/announcements/<id> \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Búsqueda
```bash
curl 'http://localhost:4000/api/search?q=fantasía'
curl 'http://localhost:4000/api/search/authors?q=autor'
```

Soporta parámetro: `q`.

## Usuarios

```bash
# Obtener usuario por ID (público)
curl http://localhost:4000/api/users/<id>

# Buscar usuario por email (admin)
curl http://localhost:4000/api/users/find/<email> \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Métricas
```bash
curl http://localhost:4000/api/metrics
curl http://localhost:4000/api/metrics/featured
```

## Moderación

```bash
# Listar usuarios con historial de ban (admin o moderator)
curl "http://localhost:4000/api/moderation/users?q=búsqueda&role=user" \
  -H "Authorization: Bearer $TOKEN"
# Respuesta: { users: [{ id, email, display_name, role, avatar_url, created_at, ban_history, is_banned, pre_banned }], total }

# Listar baneados agrupados (admin o moderator)
curl http://localhost:4000/api/moderation/banned -H "Authorization: Bearer $TOKEN"
# Respuesta: { banned: [{ email, bans: [{ id, reason, banned_at, unbanned_at, banned_by, unbanned_by, deleted_at, appeal, appeal_submitted }] }] }

# Banear (admin o moderator) — cada llamada inserta un nuevo registro (historial)
curl -X POST http://localhost:4000/api/moderation/ban -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"email":"spam@x.com","reason":"spam"}'

# Desbanear (admin o moderator)
curl -X POST http://localhost:4000/api/moderation/unban -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"email":"spam@x.com"}'

# Eliminar registro de ban (admin) — elimina todos los registros del email
curl -X DELETE "http://localhost:4000/api/moderation/banned/spam@x.com" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Apelar (autenticado) — actualiza el ban activo (unbanned_at IS NULL)
curl -X POST http://localhost:4000/api/moderation/appeal \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"email":"baneado@x.com","appeal":"Quisiera apelar..."}'

# Cuentas eliminadas (admin o moderator)
curl http://localhost:4000/api/moderation/deleted-accounts \
  -H "Authorization: Bearer $TOKEN"
# Respuesta: { deleted: [{ email, deleted_at, deleted_by, has_new_user, new_user, total_deletions }] }

# Moderadores
curl http://localhost:4000/api/moderation/moderators -H "Authorization: Bearer $TOKEN"

# Exportar CSV (admin)
curl -X POST http://localhost:4000/api/moderation/export-banned \
  -H "Authorization: Bearer $ADMIN_TOKEN" -o banned_users.csv

# Editar información y contactos (admin)
curl -X PUT http://localhost:4000/api/moderation/contact-info \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"contact_info":"Discord oficial: https://discord.gg/j543pdNhae"}'
```

## Upload
```bash
# Subir archivo (autenticado)
curl -X POST http://localhost:4000/api/upload \
  -H "Authorization: Bearer $TOKEN" -F "file=@portada.png"

# Eliminar archivo (autenticado)
curl -X DELETE http://localhost:4000/api/upload/<fileName> \
  -H "Authorization: Bearer $TOKEN"
```

## Imágenes de usuario

```bash
# Listar imágenes propias con info de uso (autenticado)
curl http://localhost:4000/api/user-images \
  -H "Authorization: Bearer $TOKEN"
# Respuesta: { images: [{ id, storage_path, custom_name, url, sort_order, created_at, in_use, used_in }] }

# Subir imagen con nombre personalizado (autenticado)
curl -X POST http://localhost:4000/api/user-images \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@portada.jpg" \
  -F "custom_name=portada_v1"
# Nombre: solo letras, números y -_,.!?¿¡<> (máx 60, sin espacios ni ñ). Único por usuario.

# Renombrar o reordenar imagen (autenticado, dueño)
curl -X PUT http://localhost:4000/api/user-images/<id> \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"custom_name":"nuevo_nombre"}'
curl -X PUT http://localhost:4000/api/user-images/<id> \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"sort_order":5}'

# Eliminar imagen (autenticado, dueño)
curl -X DELETE http://localhost:4000/api/user-images/<id> \
  -H "Authorization: Bearer $TOKEN"
# También borra el archivo físico del storage.

# Resolver imagen por nombre de autor y nombre custom (público)
curl http://localhost:4000/api/user-images/resolve/<authorId>/<name>
# Devuelve el archivo binario de la imagen (sendFile). 404 si no existe.
```

## Changelog

```bash
# Listar versiones (público)
curl http://localhost:4000/api/changelogs
# Respuesta: { changelogs: [{ id, version, title, entries, created_at, updated_at }] }

# Config del link (público)
curl http://localhost:4000/api/changelogs/config
# Respuesta: { link_text, current_version }

# Crear versión (admin)
curl -X POST http://localhost:4000/api/changelogs \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"version":"2.0.0","title":"Grandes cambios","entries":"Lista de novedades..."}'

# Editar versión (admin)
curl -X PUT http://localhost:4000/api/changelogs/<id> \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"version":"2.0.1","title":"Parche","entries":"Correcciones..."}'

# Eliminar versión (admin)
curl -X DELETE http://localhost:4000/api/changelogs/<id> \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Actualizar configuración del link (admin)
curl -X PUT http://localhost:4000/api/changelogs/config \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"link_text":"Ver historial","current_version":"2.0.0"}'
```

## Health
```bash
curl http://localhost:4000/api/health
# { ok:true, service:'BookShelf backend', mode:'json', time:'...' }
```

## Códigos de error

| Código | Significado                | Comportamiento del frontend          |
|--------|----------------------------|--------------------------------------|
| 400    | Solicitud inválida         | toast 1.2s + redirect a /error/400 (en críticas) |
| 401    | No autenticado / expirado  | intenta refresh automático (rotation); si falla, limpia sesión + redirect a /login |
| 403    | Permisos insuficientes / baneo | toast                              |
| 404    | No encontrado              | render /error/404                    |
| 429    | Rate limit excedido        | toast ("Demasiados intentos")        |
| 5xx    | Error servidor             | toast 1.2s + redirect a /error/500   |

> El API client del frontend **nunca lanza excepciones** — siempre devuelve
> `{ __error: true }` en caso de error de red o del servidor.

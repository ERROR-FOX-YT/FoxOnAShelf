# Arquitectura — BookShelf™

```
┌──────────────────────┐      HTTPS/CORS       ┌────────────────────────┐
│  Frontend (Vite)     │ ───────────────────▶ │  Backend Express        │
│  http://:3100        │                       │  http://:4000           │
│  React + Tailwind    │                       │  JWT + bcrypt           │
│  anime.js + router   │                       │  multer + mammoth       │
└──────────┬───────────┘                       │  csv-writer             │
           │                                   └────────────┬────────────┘
           │ /storage proxy                                 │
           ▼                                                ▼
   ┌──────────────────────┐                       ┌─────────────────────┐
   │ backend/storage/     │                       │  PostgreSQL /       │
   │ (uploads + originals)│                       │  Supabase  ó  JSON  │
   └──────────────────────┘                       │  backend/storage    │
                                                  │  /db.json (demo)    │
                                                  └─────────────────────┘
```

## Decisiones tecnológicas

- **React + Vite**: build rápido, sin configuración. Compatible con cualquier
  ejecución local. SPA con `react-router-dom`.
- **TailwindCSS**: utilitario, sin CSS-in-JS. Tema claro/oscuro vía clase
  `dark` en `<html>` y los tokens `parchment` / `nightGray`.
- **anime.js**: animaciones declarativas pequeñas — `cardEntrance`,
  `bannerEntrance`, `buttonPulse`, `loadingDots`. Sin dependencias pesadas.
- **Express**: API REST simple, organizada por rutas + middlewares.
- **JWT + bcryptjs**: estándar para demo. `JWT_SECRET` en `.env`.
- **Postgres / Supabase**: BD relacional. Migraciones idempotentes.
- **Modo JSON**: capa intercambiable en `backend/src/db/index.js` para que la
  demo funcione sin instalar Postgres.
- **multer + mammoth**: subida de archivos y conversión .docx.

## Flujo de autenticación

### Access token + refresh token

1. POST `/api/auth/login` con email + password.
2. Backend valida bcrypt y verifica `banned_users`.
3. Devuelve **access token** (`JWT`, expira según `JWT_EXPIRES_IN`) + **refresh token** (UUID, 30 días).
4. Frontend guarda ambos en `localStorage` (`bookshelf.token`, `bookshelf.refreshToken`).
5. Cada petición agrega `Authorization: Bearer <access_token>`.
6. Middleware `auth.js` valida:
   - firma JWT,
   - que el token no esté en `token_blacklist`,
   - que su `iat` sea mayor que el cutoff por email (`*all-before-...`),
   - que el email no esté baneado.
7. **Auto-refresh** (frontend `client.js`): si una petición recibe 401 y existe refresh token:
   - Llama a `POST /api/auth/refresh` con el refresh token.
   - El backend verifica el refresh token (no usado, no expirado), lo marca como `used_at`, y emite un nuevo par.
   - La petición original se reintenta con el nuevo access token.
   - Si el refresh falla (token inválido/expirado) → limpia sesión y redirige a `/login`.
   - Usa un flag `refreshing` para evitar múltiples llamadas concurrentes.
8. **Logout** (`POST /api/auth/logout`): revoca todos los refresh tokens del usuario y blacklistea el access token.
9. Middleware `optionalAuth` (para endpoints públicos como GET /api/books/:id):
   - igual que `auth` (firma, blacklist, cutoff, ban) pero nunca rechaza la petición — si el token es válido
     establece `req.user`, si no, continúa sin `req.user`.
   - **Nota**: a diferencia de `auth`, `optionalAuth` no responde con error ante token inválido o baneo;
     simplemente trata al visitante como ghost.

### Token rotation + limpieza automática (modo JSON)

Cada vez que se usa un refresh token (refresh exitoso), el backend marca `used_at` en el registro anterior y crea uno nuevo. Esto asegura que:
- Un refresh token robado no puede reutilizarse si el legítimo ya refrescó.
- Si un atacante usa el token robado primero, el legítimo recibe 401 al intentar refrescar (pierde la sesión, pero el atacante no obtiene acceso duradero).
- Todos los refresh tokens se revocan al hacer logout.
- En modo JSON, `validateRefreshToken` poda los refresh tokens expirados (>30 días) al azar.
- `isTokenBlacklisted` elimina entradas de `token_blacklist` mayores a 7 días.

## Rate limiter (seguridad)

- Endpoints sensibles (`/api/auth/*`) tienen rate limit por IP usando un Map en
  memoria con ventana de 15 minutos y máximo de peticiones configurables.
- Cuando el Map supera 10.000 entradas, se limpia el 50% más antiguo para
  evitar memory leak.

## Flujo de eliminación de usuarios (admin)

1. Admin envía `DELETE /api/users/:id`.
2. Se verifica que el target no sea admin ni el propio admin.
3. `deleteUser` elimina todos los datos del usuario (libros, capítulos, comentarios, ratings, favoritos, vistas).
4. Si no es eliminación permanente desde la papelera, se guarda un snapshot en `trash` (recuperación en 30 días).
5. Se crea/actualiza registro en `banned_users` con `deleted_at = now()` y `unbanned_at = now()` (liberando el email para re-registro).
6. Se limpian `refresh_tokens` y `token_blacklist`.
7. El registro persiste en `banned_users` con badge `Anteriormente eliminado` en el panel de moderación.
8. Se registra en `moderation_logs` con acción `delete-user`.
9. La sección "Cuentas eliminadas" (`GET /moderation/deleted-accounts`) lista todos los correos con `deleted_at` e indica si el correo fue reutilizado por un nuevo registro.

## Flujo de baneo (historial múltiple)

1. Admin envía `POST /api/moderation/ban` con `{ email, reason }`.
2. Se **inserta** un nuevo registro en `banned_users` (antes era upsert, ahora cada ban es un evento independiente que preserva el historial).
3. Se inserta entry `*all-before-<ts>` en `token_blacklist` (revoca sesiones).
4. Todas las peticiones siguientes de ese email fallan con 403.
5. Si el usuario intenta iniciar sesión, el login devuelve `{ banned:true, can_appeal }`.
6. El usuario puede enviar apelaciones ilimitadas (`POST /api/auth/appeal`). Cada apelación sobrescribe **el ban activo** (el que tiene `unbanned_at IS NULL`).
7. Admin desbanea: `POST /api/moderation/unban` → `unbanned_at = now()` en el ban activo.
8. Admin elimina usuario (deleteUser): se crea registro en `banned_users` con `deleted_at`, se limpian `refresh_tokens` y `token_blacklist`, y se registra en `moderation_logs` con acción `delete-user`.
9. Admin elimina registro de ban (`DELETE /moderation/banned/:email`): borra **todos** los registros del email (solo si no hay bans activos). El `moderation_logs` conserva el historial.
10. `listBanned()` agrupa por email: `[{ email, bans: [ ... ] }]`. El frontend muestra acordeón con todos los eventos.

## Flujo de anuncios

1. Moderador o admin crea anuncio via `POST /api/announcements`.
2. Se almacena `created_by_role` (congelado en creación) y `created_by_name`.
3. Admin puede **destacar** un anuncio (`PUT /:id/feature`) — cualquier otro
   destacado pierde el estado.
4. Admin puede **editar** "Publicado por" (`PUT /:id/published-by`), incluso
   vacío para ocultarlo.
5. Frontend muestra:
   - **Destacado**: primero, con fondo degradado dorado (si es admin).
   - **Último no destacado**: siempre visible (no colapsado).
   - **Anteriores**: plegados bajo `<details>`.
6. Moderadores pueden eliminar **sus propios** anuncios (check `admin_id`).
   Administradores pueden eliminar cualquier anuncio.

## Flujo de vistas

1. Usuario abre `/book/:id`.
2. Frontend inicia timer de **10 segundos**.
3. Al cumplirse: `POST /api/books/:id/view`.
4. Backend: si hay `user_id`, chequea `book_views` (evita duplicados).
   Ghosts siempre cuentan.
5. Admin puede **reiniciar vistas**: `POST /api/books/:id/reset-views`
   → pone `views=0` + limpia `book_views`.

## Flujo de bookmark (marcador)

1. Usuario autenticado hace clic en bookmark en `/book/:id`.
2. Frontend envía `POST /api/books/:id/favorite`.
3. Backend alterna (toggle): si existe lo elimina, si no lo crea.
4. `listBookmarks` filtra libros con `status='deleted'` para no mostrar
   marcadores huérfanos (aplica tanto en Postgres como JSON).

## Flujo de eliminación de imágenes

1. Usuario autenticado hace clic en ✕ en ImageManager.jsx.
2. Frontend envía `DELETE /api/upload/:fileName` con `Authorization`.
3. Backend verifica que el archivo existe en `storage/uploads/` y lo elimina
   del disco. También elimina el archivo original de `storage/originals/` si
   existe (mantiene consistencia).
4. Si el archivo no existe, responde 404.
5. Cualquier usuario autenticado puede eliminar cualquier imagen (sin
   verificación de propiedad, por simplicidad en demo).

## Flujo de eliminación de comentarios

1. Usuario hace clic en ✕ en Comments.jsx.
2. El botón es visible solo si el usuario es el autor del comentario,
   moderador o admin.
3. Frontend envía `DELETE /api/books/:id/comments/:commentId`.
4. Backend verifica que el comentario existe y que el usuario tiene permiso
   (autor del comentario, moderador o admin).
5. Elimina físicamente el registro de la base de datos.

## Reading mode (modal de lectura)

1. Usuario abre un libro y hace clic en "Iniciar lectura".
2. ReadingMode.jsx se renderiza vía `createPortal` al final de `document.body`.
3. Atajos de teclado activos:
   - `←` / `→`: capítulo anterior / siguiente.
   - `Esc`: cerrar modal (solo si no se está mostrando el panel de preferencias).
   - `P`: abrir/cerrar panel de preferencias.
4. Preferencias (tema, fuente, tamaño, ancho, interlineado, imagen de fondo) se persisten en
   `localStorage` con throttle de 2s.
5. Bookmark manual (star icon): alterna bookmark vía API + toast. Separado del
   auto-save de progreso de lectura.
6. Barra de progreso vertical: `position: sticky; top: 48px` dentro del contenedor
   scrollable. Porcentaje calculado con `scrollTop / (scrollHeight - clientHeight) * 100`.
   Listener `scroll` nativo añadido via `addEventListener` (no synthetic `onScroll`).
   La función de actualización se guarda en un `useRef` para evitar closures stale
   y no reiniciar el listener en cada render.
7. Parseo de `@img:nombre` en el contenido: `PageContent` usa un regex global
   `/(!\[.*?\]\(.*?\)|@img:[a-zA-Z0-9\-_,\.\?!¿¡<>]+)/g` para dividir el texto.
   Las referencias `@img:nombre` se resuelven como
   `src="/api/user-images/resolve/" + authorId + "/" + encodeURIComponent(name)`.
8. Doble protección `Esc`: usa `exitingRef` para evitar que `fullscreenchange`
   y `keydown` disparen `closeReading()` dos veces cuando Esc presiona.
9. La lista de capítulos se pasa como prop para evitar re-renders del padre.

## Flujo de imágenes de usuario (media library)

1. Usuario autenticado navega a `/library` (MediaLibrary) o usa ImageManager desde el Editor.
2. `GET /api/user-images` lista imágenes del usuario con información de uso (escanea capítulos de sus libros buscando `@img:nombre`).
3. **Subir**: POST multipart con `file` + `custom_name`. El backend valida el nombre (regex, unicidad por usuario, máx 60 chars) y asigna `sort_order = max(existing) + 1`.
4. **Renombrar**: PUT `/api/user-images/:id` con `{ custom_name }`. Verifica disponibilidad global por usuario.
5. **Reordenar**: PUT `/api/user-images/:id` con `{ sort_order }`. El frontend hace swap real de `sort_order` entre dos imágenes.
6. **Eliminar**: DELETE `/api/user-images/:id` — borra registro y archivo físico (con validación de path traversal).
7. **Resolver en lectura**: `GET /api/user-images/resolve/:authorId/:name` — público, devuelve el archivo binario. Usado por ReadingMode para renderizar `@img:nombre`.
8. **Insertar desde editor**: ImageManager muestra capítulos del libro actual. Al seleccionar uno, inserta `@img:nombre` en la posición del cursor del textarea.
9. **Estado "en uso"**: calculado on-demand en el GET — verifica si `@img:nombre` aparece en algún capítulo del usuario.

## Flujo de categorías

1. Admin crea/elimina categorías via panel BookShelf (`/admin`).
2. Al eliminar, todos los libros con esa categoría pasan a
   `"en espera de categorización"`.
3. Moderadores y admins asignan categoría a libros sin categorizar
   desde el panel de moderación (`/admin/moderation`).
4. El frontend capitaliza las categorías al mostrarlas (almacenadas
   en minúsculas).

## Modularidad

- Cada ruta vive en `backend/src/routes/<recurso>.js`.
- Lógica de datos centralizada en `backend/src/db/index.js` con API uniforme:
  los handlers no saben si el backend es Postgres o JSON.
- Componentes UI atómicos en `frontend/src/components/`.
- Contextos para Auth, Toast, Theme.
- Para añadir un recurso nuevo (ej. tags): crear migración, función en `db`,
  ruta y página. Cero acoplamiento horizontal.

## Seguridad y sanitización

- **conversion.js**: los mensajes de error de importación (`.docx`, `.txt`)
  sanitizan rutas del sistema de archivos antes de mostrarse al usuario, para
  evitar path disclosure.
- **Rate limiter**: Map en memoria con poda automática.
- **Frontend**: todas las peticiones fetch tienen try/catch. Componentes como
  Admin.jsx, Author.jsx y AdminModeration.jsx manejan errores de API sin
  mostrar "Cargando..." infinito ni romper la UI.

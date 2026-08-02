# CHANGELOG — FoxOnAShelf™

Todas las fechas en formato YYYY-MM-DD.

## [Desarrollo 14 | FoxOnAShelf] — 2026-08-01 — ERROR_FOX

### Modificado
- **Renombrado de BookShelf a FoxOnAShelf**: nombre de servicio en `/api/salud` (`FoxOnAShelf backend`), mensaje de arranque del servidor, comentarios de cabecera y nombres de paquete (`foxonashelf-backend`, `foxonashelf-frontend`).
- Header de changelog exportado por la API (`changelogs.js`) actualizado a `FoxOnAShelf™`.

### Añadido
- **Migración 009 (`sistema_soporte.sql`)**: eliminación de las 6 categorías originales, creación de categoría "Soporte", añadido `resuelto` a `foro_hilos`, `es_solucion` a `foro_respuestas`, tablas nuevas `foro_votos` y `foro_historial_solucion`
- **Reescritura completa de `foros.js`**:
  - `GET /` → retorna solo la categoría Soporte
  - `GET /estado/:estado` → lista de hilos filtrada por pendientes/resueltos (paginada)
  - `GET /anuncios` → anuncios visibles para la columna derecha
  - `POST /:hiloId/solucion` → marcar/desmarcar solución (1 por hilo)
  - `PUT /respuestas/:id/solucion` → editar contenido de solución + registrar historial + reiniciar votos
  - `GET /respuestas/:id/historial` → obtener historial de ediciones de una solución
  - `POST /respuestas/:id/votos` → votar útil/no útil + auto-desmarcación al 80% no-útil con 10+ votos
  - Eliminado `GET /estadisticas`
  - Permisos: creator-only delete thread, mod/admin delete any response

## [Desarrollo 13] — 2026-07-31 — ERROR_FOX

### Notas
- **Traducción global completa**: backend, base de datos, rutas, middlewares, servicios y seed completamente en español.
- **Coordinación backend-front verificada**: 3 revisiones completas encontraron y corrigieron 30+ bugs de coordinación.
- **Seed.js reescrito**: el seed ahora usa el esquema español completo (usuarios, libros, capitulos, anuncios, categorias).
- **Datos de prueba limpiados**: libros de prueba con caracteres corruptos eliminados de la BD.

### Añadido
- **Método `buscarAutores(q)`**: búsqueda de autores por nombre con escape de caracteres especiales.
- **Método `listarCategorias/crearCategoria/eliminarCategoria`**: CRUD completo de categorías.
- **Método `obtenerConfigHistorial`**: lectura de configuración del changelog desde `site_config`.
- **Métodos de imágenes de usuario**: `guardarImagen`, `listarImagenes`, `actualizarNombre`, `eliminarImagen`.
- **Método `limpiarPapeleraExpirada`**: limpieza automática de libros eliminados expirados (>30 días).
- **Sistema de foros completo** (`/api/foros`):
  - Rutas: `foros.js` con 15 endpoints para categorías, hilos, respuestas y reacciones
  - Migración: `007_crear_foros.sql` con tablas `foro_categorias`, `foro_hilos`, `foro_respuestas`, `foro_reacciones`
  - Funciones JSON fallback en `db/index.js` para modo no-PostgreSQL
- **Sistema de highlights/notas** (`/api/destacados`):
  - Rutas: `destacados.js` con 5 endpoints para CRUD de highlights
  - Migración: `008_crear_destacados_notas.sql` con tabla `destacados`
  - Funciones JSON fallback en `db/index.js`
- **Exportación `pgQuery` e `isPg`** de `db/index.js` para uso directo en rutas nuevas
- **Script de reinicio de vistas**: `001_reiniciar_vistas.sql` para resetear contadores sin perder datos

### Cambiados
- **Traducción de todas las rutas**: `books.js` → `libros.js`, `users.js` → `usuarios.js`, `bookmarks.js` → `marcadores.js`, `changelogs.js` → `historiales.js`, `easter-eggs.js` → `huevos-pascua.js`, `metrics.js` → `metricas.js`, `search.js` → `busqueda.js`, `moderation.js` → `moderacion.js`, `user-images.js` → `imagenes-usuario.js`, `upload.js` → `subida.js`
- **Traducción de middlewares**: `requireAuth` → `requiereAutenticacion`, `requireAdmin` → `requiereAdmin`
- **Traducción de db/index.js**: todos los métodos renombrados (`listBooks`→`listarLibros`, `getBook`→`obtenerLibro`, `createBook`→`crearLibro`, `updateBook`→`actualizarLibro`, `deleteBook`→`eliminarLibro`, `banUser`→`banearUsuario`, `unbanUser`→`unbanearUsuario`, `listBanned`→`listarBaneados`, etc.)
- **Traducción de server.js**: montaje de rutas en español (`/api/libros`, `/api/usuarios`, `/api/marcadores`, `/api/historiales`, `/api/huevos-pascua`, `/api/metricas`, `/api/busqueda`, `/api/moderacion`, `/api/imagenes-usuario`, `/api/subida`)
- **Traducción de conversion.js**: `titulo`, `contenido`, `orden`
- **Traducción de chat.js**: `usuario_id` en tabla `mensajes_chat`

### Corregido
- **Bug de `path.dirnombre()`**: crash en modo JSON al iniciar. Corregido a `path.dirname()`.
- **Bug de `limpiarPapeleraExpirada`**: usaba `t.expires_at` en vez de `t.expira_en` en la rama JSON.
- **Bug de `chat.js`**: usaba `user_id` en vez de `usuario_id` para la tabla `mensajes_chat`.
- **Bug de `anuncios.js`**: campos `rutaImagen` y `publicadoPor` en camelCase en vez de snake_case (`ruta_imagen`, `publicado_por`).
- **Bug de `team.js`**: campo `urlFoto` en camelCase en vez de snake_case (`url_foto`).
- **Variable renombrada**: `RECOVERY_WINDOW_MS` → `VENTANA_RECUPERACION_MS`.

### Eliminado
- **Archivos `.tmp.js`**: scripts temporales de testing eliminados.

## [Intermedio 12/13] — 2026-07-30

### Notas
- **BookShelf sale del proyecto media técnica UPB de la IEBS**: el proyecto pasa a ser personal y el desarrollador tiene libertad total sobre el código y los datos.
- El sitio ahora es un proyecto de una sola persona; toda referencia pública a los miembros anteriores fue eliminada.

### Eliminado
- **Cuentas Leyder y Slayer**: borrado permanente (`deleteUser` con `{ permanent: true }`) de `adminLMG@bookshelf.app` y `adminSlayer@bookshelf.app`. Quedaron fuera: libros, imágenes, anuncios, comentarios, favoritos, ratings, marcadores, colecciones, refresh_tokens, book_views (no tenían registros propios relevantes).
- **Perfiles de equipo `jeison-sossa` y `leyder-montoya`**: removidos de `site_config.team_profiles`.
- **Fotos de storage**: eliminados `backend/storage/team/Slayer.jpeg` y `backend/storage/team/Leyder.jpeg`.
- **Anuncio con referencia a Slayer**: `42ffc447-8c1c-4839-b8ae-289684f888f4` marcado como no visible (`visible=false`).

### Modificado
- **Migración de cuenta**: `lopezsanty2008@gmail.com` → `ef.samlq@gmail.com` (`UPDATE users SET email, display_name='zorro correcto'`). Se conservaron rol (moderator), libro "Cepallo", 12 anuncios, refresh tokens y 10 filas de `token_blacklist` migradas (`user_email`).
- **Perfil de equipo renombrado**: `santiago-lopez` → `error-fox`. Nombre público `ERROR_FOX`, contacto `adminFox@bookshelf.app`.
- **`site_config`**: `current_version` → `Intermedio 12/13`, `changelog_link` actualizado.
- **Footer**: copyright a solo `ERROR_FOX` (Frontend `Footer.jsx`).

### Corregido
- **Bug pre-existente en `banned_users`**: `banUser`, `unbanUser` y `deleteUser` insertaban/actualizaban columnas inexistentes (`banned_by`, `unbanned_by`). El esquema real es `(id, email, reason, appeal, appeal_submitted, banned_at, unbanned_at, deleted_at)` con UNIQUE en `email`. Corregido en `backend/src/db/index.js`: `banUser` inserta `(email, reason, banned_at)`, `unbanUser` solo `unbanned_at=now()`, `deleteUser` inserta `(email, reason, banned_at, deleted_at)` con `ON CONFLICT (email) DO UPDATE SET deleted_at=now()`.

### Añadido
- **Aviso "Sin acceso al servidor"**: `ServerStatusContext.jsx` hace polling a `/api/health` cada 10s; si la BD está caída muestra `ServerBanner.jsx` fijo con la hora de la última comprobación. `client.js` suprime toasts de error repetidos mientras el servidor está caído. `/api/health` ahora hace ping real a la BD (`ping()` en `db/index.js`: SELECT 1 en Postgres, loadJson en modo JSON).

### Traducción del código a español
- **Módulo Anuncios**: columnas de `announcements` renombradas en Postgres (31 filas): `title→titulo`, `content→contenido`, `image_path→ruta_imagen`, `featured→destacado`, `created_by_name→autor_nombre`, `created_by_role→autor_rol`, `published_by→publicado_por` (se conservan `id`, `admin_id`, `visible`, `created_at`). El API devuelve claves camelCase: `anuncios`, `titulo`, `contenido`, `rutaImagen`, `destacado`, `publicadoPor`, `autorNombre`, `autorRol`.
- **Backend**: `routes/announcements.js` → `routes/anuncios.js` montado en `/api/anuncios` (`GET /`, `POST /`, `PUT /:id/destacado`, `PUT /:id/publicado-por`, `PUT /:id`, `DELETE /:id`). En `db/index.js`: `listAnnouncements→listarAnuncios`, `createAnnouncement→crearAnuncio`, `getAnnouncement→obtenerAnuncio`, `deleteAnnouncement→eliminarAnuncio`, `setFeaturedAnnouncement→alternarDestacado`, `updateAnnouncement→actualizarAnuncio`, `updatePublishedBy→definirPublicadoPor`. Body de creación/edición con `{titulo, contenido, rutaImagen}`.
- **Esquema y seeds**: `database/migrations/001_create_tables.sql` y `database/seeds/seed.js` con las columnas en español; `backend/migrate_data.js` mapea claves nuevas y antiguas.
- **Frontend**: `pages/Announcements.jsx` → `pages/Anuncios.jsx` (ruta `/anuncios`). Estados y campos en español. `Home.jsx` (banner, sidebar y "anuncios anteriores") y `Admin.jsx` (panel de anuncios) actualizados a la nueva API.
- **Módulo Equipo (registro pendiente del piloto)**: `/api/team` → `/api/equipo`; `users.orden_equipo` (antes `team_sort`); `site_config` con `perfiles_equipo`, `titulo_equipo` y claves jsonb en español (`nombre`, `edad`, `contacto`, `informacion`, `urlFoto`); `pages/Team.jsx` → `pages/Equipo.jsx` (ruta `/equipo`). Se conservan `role`, `mod` y `admin` sin traducir.

## [Desarrollo/Parche 12] — 2026-07-21

### Notas
- Revisión general del código fuente en 3 passes. Se encontraron y corrigieron 25+ problemas de seguridad, bugs, código muerto y malas prácticas.

### Corregido
- **CRITICAL — `db.json` expuesto vía HTTP**: el archivo `db.json` era accesible desde `/storage/db.json` por cualquier usuario. Se añadió middleware en `server.js` que bloquea esa ruta devolviendo 404.
- **CRITICAL — `routes/chat.js` crash al arrancar**: `createClient()` se ejecutaba en load time del módulo. Si faltaban `SUPABASE_URL` o `SUPABASE_SERVICE_KEY`, la app entera crasheaba. Ahora se usa `getSupabase()` lazy con retorno de 503 si no está disponible.
- **`parseJsonb` retornaba valor en vez de fallback**: cuando `JSON.parse` fallaba, la función devolvía el valor crudo en vez del fallback proporcionado.
- **`listAnnouncements` desaparecía al borrar usuario**: usaba `JOIN` en vez de `LEFT JOIN` con la tabla users. Al eliminar un usuario, todos sus anuncios dejaban de mostrarse.
- **Dead variable `cutoff`** eliminada de `cleanupExpiredTrash` — se calculaba pero nunca se usaba.

### Eliminado
- **Archivos muertos**: `pages/Login.jsx`, `pages/Register.jsx`, `api/base.js` — ninguno era importado.
- **Función muerta `resolveImageUrl`** eliminada de `api/userImages.js`.
- **Imports no usados**: `React` en ChatWidget.jsx, `api` en ChatWidget.jsx, `cfg` en routes/books.js y routes/upload.js.
- **`console.log` de debug** eliminado de ReadingMode.jsx.
- **Estado muerto `flipOverlay`** eliminado de ReadingMode.jsx.
- **CSS muerta `.chat-name-prompt`** eliminada de ChatWidget.css.

## [Desarrollo - 12 Parte 2] — 2026-07-21

### Añadido
- **Layout de Home reestructurado**: contenido principal a la izquierda, panel de anuncios compactos a la derecha con espacio reservado para publicidad.
- **Libros destacados como hero principal**: al entrar al dashboard, lo primero que se ve son los libros destacados en un recuadro centrado con el logo BookShelf™ y descripción.
- **Barra "Explorar más libros"**: componente `home-explore-bar` — botón de ancho completo (`width: 100%`) al fondo del recuadro de destacados, con ícono de lupa.
- **Stats en la parte superior**: componente `Stat` simplificado (sin hint), grid `grid-cols-3` en el top del Home.
- **Ordenamiento de anuncios**: sidebar ampliado a 9 anuncios con `sideVisible.slice(0, 9)`. Espacios de publicidad insertados cada 3 anuncios usando `(i + 1) % 3 === 0`.
- **Estilos dorados**: anuncios de admin y destacados tienen borde y fondo dorado tanto en modo claro como oscuro.
- **Preview antes de publicar**: botón "Ver preview" en el formulario de creación de anuncios para previsualizar cómo se verá antes de publicar.
- **Mejoras estéticas en Explorar**: pestañas con iconos, contador de resultados, estados vacíos con iconos, skeleton de carga mejorado.
- **Estilos `.ann-card` y `.ann-badge`**: clases CSS reutilizables para anuncios con variantes doradas para admin/destacados.
- **Pestañas de Explorar re-diseñadas**: estilo limpio con `.explore-tab` y `.explore-tab--active`.
- **Dev Account Switcher**: componente `DevAccountSwitcher.jsx` con botones flotantes (`.dev-switch-fab`) al lado del chat FAB. Cuenta con 3 cuentas de test: adminfox, usuariocomun, lopezsanty2008. Login directo vía `fetch('/api/auth/login')` + `window.location.reload()`. Solo visible con `import.meta.env.DEV`.
- **Tarjetas de libros uniformes**: `min-h-[1.25rem]` en el espacio de descripción de `BookCard.jsx` para uniformidad de altura.
- **Público objetivo en línea separada**: age_group renderizado en su propio `<div>` debajo de autor y categoría en `BookCard.jsx`.

### Corregido
- **Libros no estirados**: `align-self: start` en `.book-card` + `items-start` en `BookList.jsx` para evitar estiramiento vertical en el grid.

## [Desarrollo - 12 Parte 1] — 2026-07-18

### Notas
- BookShelf™ fue presentada en un semi-evento del "Programa Nivelatorio con Aporte de Empleados" de la Universidad de EAFIT.

### Añadido
- **Página DualAuth**: nueva vista `/login` y `/register` con login y registro lado a lado. Efecto visual: la card activa se agranda e ilumina al pasar el mouse; la otra se oscurece y reduce.
- **Estética glassmorphism**: efecto de cristal esmerilado con `backdrop-filter: blur` en las cards de autenticación.
- **Fondo animado**: orbes de gradiente flotantes y partículas ascendentes con CSS puro.
- **Inputs flotantes**: labels que se animan hacia arriba al enfocar el campo, con línea de acento que se expande.
- **Efecto glow**: borde luminoso animado en la card activa usando gradientes de color.
- **Responsive**: diseño adaptado para móvil (cards apiladas verticalmente).
- **Easter eggs personalizables**: sección de administración para gestionar nombres exclusivos, mensajes y emojis. La comparación no distingue mayúsculas y acepta variaciones (0=O, _=-, etc.).

## [Desarrollo - 11] — 2026-06-14

### Añadido
- **API /api/team**: nuevo endpoint GET (público) y PUT /:id (admin-only) para gestionar perfiles del equipo. Funciones `getTeamProfiles`, `updateTeamProfile` en db/index.js. Ruta montada en server.js.
- **Página /team**: tres tarjetas de perfil (foto circular, nombre, edad, contacto, info) con edición inline para admins. Botón "Editar perfil" visible solo para admin.
- **Footer**: el texto "BookShelf™ — Plataforma de lectura digital" ahora es un link a /team.
- **Imágenes reales**: movidas `sam.jpeg`, `Jeichon.jpeg`, `lider.jpeg` a `backend/storage/team/` renombradas como `ERROR_FOX.jpeg`, `Slayer.jpeg`, `Leyder.jpeg`.
- **Campo `role`**: nuevo campo editable en perfiles de equipo, almacenado en `db.json team_profiles[].role`. Validación en `PUT /:id`.
- **Campo `admin_email`**: correo admin por perfil, pre-cargado con los emails reales de cada admin.
- **Título editable**: nuevo endpoint `PUT /api/team/title`, funciones `getTeamTitle`/`setTeamTitle` en db/index.js. Título persistido en `db.json`.
- **Fondo en /team**: la página ahora aplica `has-main-bg` al body.
- **Fotos más grandes**: `w-32` → `w-48` (128px → 192px) con borde dorado `border-amber-500/40`.
- **Crash handlers**: añadidos `process.on('uncaughtException')` y `process.on('unhandledRejection')` en server.js.

### Corregido
- **Migración de cuentas**: `admin@bookshelf.app` eliminado. Sus libros (1), comentarios (8) y marcadores (4) transferidos a `adminFox@bookshelf.app`.
- **Nuevas cuentas admin**: `adminLMG@bookshelf.app` y `adminSlayer@bookshelf.app` creadas con contraseña `admin123`.
- **Ruta PUT /:id duplicada**: el handler de `PUT /:id` tenía copiada la lógica de `reorder` en vez de `updateTeamProfile`. Restaurada la implementación correcta con validación de campos permitidos.

### Notas
- Las fotos de perfil usan placeholder `/storage/team/placeholder.png`. El usuario debe proveer las imágenes reales.

## [Desarrollo/Parche 11.A] — 2026-06-16

### Añadido
- **Supabase Storage**: imágenes, archivos importados y subidas ahora se guardan en Supabase Storage (bucket `bookshelf`) en vez del disco local. Nuevo servicio `services/storage.js`. Middleware `upload.js` cambiado a `memoryStorage`.
- **Chat experimental**: widget flotante en `_chat_test/` con mensajes persistentes en Supabase (tabla `chat_messages`), polling cada 3s, autenticación requerida. Backend route `routes/chat.js`.
- **Soporte multi-origen CORS**: `FRONTEND_URL` acepta múltiples URLs separadas por coma.

### Corregido
- **Login insensible a mayúsculas**: `getUserByEmail`, `isEmailBanned` y `userTokensInvalidatedAfter` usan `LOWER()` en Postgres (y `toLowerCase()` en rama JSON) para que `adminfox` y `adminFox` sean el mismo correo.
- **deleteUser JSON**: comparación de email ahora es case-insensitive en rama JSON (`token_blacklist.filter`, `banned_users.find`).
- **user-images DELETE**: guard `cfg.SUPABASE_URL &&` para evitar que `startsWith('')` coincida con cualquier ruta.
- **backend/.env**: eliminadas claves duplicadas (`DB_MODE=json` sobreescribía `postgres`, `JWT_SECRET` dev placeholder sobreescribía el real).
- **package.json raíz**: eliminado GitHub PAT incrustado en repository URL.
- **Archivos túnel**: eliminados `tunnel.ps1`, `start_tunnel.ps1`, `tunnel.out/err/log`, `deploy.js`.
- **Git tracking**: `server.err` y `start_tunnel.js` removidos del control de versiones. `.gitignore` actualizado.

### Modificado
- **README.md**: actualizado para reflejar que Supabase (Postgres cloud) es obligatorio — modo JSON desactivado. Sección de almacenamiento actualizada a Supabase Storage.

### Eliminado
- **GitHub Pages**: branch `gh-pages` eliminado del remoto, sitio despublicado.
- **Dependencias raíz**: `node_modules` del package.json raíz mantenido solo para el chat experimental.

## [Desarrollo/Parche 10.A] — 2026-06-14

### Añadido
- **Admin — sección Easter eggs**: nuevo bloque en Admin.jsx que lista los easter eggs desde `GET /api/easter-eggs`. Cada egg muestra su descripción y un campo inline editable para el mensaje de error, que se persiste vía `PUT /api/easter-eggs`.
- **Backend — ruta `/api/easter-eggs`**: endpoint GET (lista) y PUT (admin-only) que lee/escribe `easter_eggs` en db.json. Funciones `getEasterEggs`, `getEasterEgg`, `updateEasterEggs` en db/index.js.
- **Easter egg message dinámico**: auth.js ahora lee `egg.message` desde la base de datos para el mensaje `ERROR 418: "<message>"`. El trigger (display_name == `errorfox`) sigue hardcodeado.
- **Front changelogs — sección Notas**: nuevo campo `notas` en el editor de versiones, con textarea de borde azul, preview y generación en markdown.
- **Reorden de versiones**: botones ↑/↓ en cada versión del listado admin. Función `moveVersion(idx, dir)` que intercambia posiciones y persiste vía `PUT /api/changelogs/front`.
- **Nuevas versiones al inicio**: `saveFrontVersion` ahora inserta nuevas versiones al principio del array (`[entry, ...frontVersions]`) en vez de al final.

### Corregido
- **Placeholder desactualizado**: corregido "Ej: Desarrollo - 11" a "Ej: Desarrollo/Parche 10.A" en Admin.jsx.
- **Stale index en reorden**: `moveVersion` ahora resetea `frontOpen` a null después de reordenar para evitar que se expanda la versión incorrecta.
- **Null safety en Changelog.jsx**: añadido optional chaining `v.sections?.map()` para evitar crash si sections es undefined.
- **Prefijo "v" eliminado del footer**: se quitó la `v` antes de `current_version` en Footer.jsx.

## [Desarrollo - 10] — 2026-06-14

### Añadido
- **Editor de changelogs seccionado**: el formulario del panel admin ahora separa las entradas en Añadido, Corregido, Modificado y Eliminado, con textareas individuales con borde de color y placeholders.
- **Toolbar markdown**: botones B (negrita), • (lista), ` (código), H (encabezado) que insertan formato en el textarea activo vía `data-section` / `document.activeElement`.
- **Toggle preview en vivo**: botón que alterna entre edición y vista previa renderizada con bold y bullets.
- **Sistema de changelogs front**: archivo `CHANGELOGfront.md` con versiones redactadas para usuarios finales (sin tecnicismos). Nuevo endpoint `GET /api/changelogs/front` que lo lee y parsea por versiones.
- **CHANGELOG.md renombrado a CHANGELOGback.md**: el histórico técnico se separa del visible al usuario.
- **Edición de anuncios**: nuevo endpoint `PUT /api/announcements/:id`. Moderadores pueden editar sus propios anuncios; admins pueden editar cualquiera. UI inline con campos de título y contenido.
- **Edición de anuncios en Admin.jsx**: botón "Editar" en cada anuncio del panel con formulario inline.

### Modificado
- **Página /changelog**: ahora consume `GET /api/changelogs/front` en lugar del endpoint de back. Muestra las versiones user-friendly con acordeón y secciones renderizadas con bold.
- **db.json**: array `changelogs` vaciado para empezar desde cero.

## [Desarrollo - 9] — 2026-06-08

### Añadido
- **Easter egg registro**: si un usuario intenta registrarse con `display_name` que coincide con `error_fox`/`error fox` (cualquier variante de espacios/guiones/mayúsculas), el backend responde `{ error: 'ERROR 418: "nombre del secreto"', easter_egg: true }`. El frontend bloquea el formulario, borra el nombre carácter por carácter (cada 300ms), y tras vaciarlo oculta el mensaje y desbloquea la interfaz.
- **`useLockedBody` hook**: nuevo hook en `frontend/src/hooks/useLockedBody.js` que añade/remueve clase `egg-locked` al `<body>` para bloquear interacción durante la animación del easter egg.
- **Página `/changelog`**: nueva ruta pública que lista versiones del proyecto con acordeón (una expandida a la vez). Cada versión muestra número, título y entradas editables.
- **Admin — gestión de changelogs**: sección en el panel BookShelf para añadir, editar y eliminar versiones. Configuración del texto-link del footer y versión actual. Solo admins.
- **Footer — link a changelog**: debajo de la información de contacto aparece `v{versión_actual} — {texto_link}` configurable desde el panel admin.
- **API `/api/changelogs`**: endpoints públicos y protegidos (CRUD completo + configuración del link).

### Corregido
- **Crítico (Postgres)**: `.rows.rows` en `setModerator` y `deleteCategory` — TypeError al promover moderador o eliminar categoría. Corregido: `pgQuery` ya devuelve `r.rows` directamente.
- **Crítico (Postgres)**: `cleanupExpiredTrash` reportaba siempre `{ deleted: 0 }` porque `pgQuery` no expone `rowCount`. Corregido usando `pgPool.query` directo.
- **Crítico (Postgres)**: `setFeaturedAnnouncement` crasheaba si el anuncio no existía (destructure de `undefined`). Corregido con guard `if (!rows.length) return`.
- **Crítico (Frontend)**: null crash en `ban_history` (`u.ban_history.some()` con `undefined`). Corregido con `(u.ban_history || []).some(...)`.
- **Crítico (Frontend)**: null crash en `new Date(d.deleted_at)` cuando `deleted_at` es `null`. Corregido con guard ternario.
- **Crítico (Frontend)**: null crash en `d.new_user.role` cuando `new_user` es `null`. Corregido con optional chaining.
- **`restoreFromTrash` (ambas ramas)**: `result.user_email` siempre era `'unknown'` en el log de moderación. Corregido añadiendo `user_email` al valor de retorno.
- **PG restore inserts**: `.catch(() => {})` silenciosos en todos los INSERTs de restauración — ahora registran errores con `console.warn`.
- **`/deleted-accounts`**: asumía `delRecords[0]` como la eliminación más reciente sin ordenar. Corregido: ordena por `deleted_at DESC`.
- **`exportCsv`**: manejaba el token manualmente sin usar el API client centralizado.
- **`Admin.jsx`**: faltaba estilo para rol `creator` en la tabla de usuarios (se mostraba invisible).
- **`Admin.jsx`**: null crash en `new Date(u.created_at)` cuando `created_at` es `null`.

### Modificado
- **`GET /moderation/users`**: `total` ahora siempre refleja `users.length` real (incluye cuentas pre-baneadas, antes subestimaba).
- **`_groupBanRecords`**: ordenamiento por `bans[0].banned_at` reemplazado por `Math.max(...bans.map(...))` para no depender del orden interno.
- **`deleteBanRecord` (JSON)**: ya no retorna `boolean` (consistente con rama PG que retorna `void`).
- **`AdminModeration.jsx`**: consolidadas funciones duplicadas `deleteBanRecord`/`doDeleteBanRecord`. Eliminado import `useCallback` no usado. Dep `isAdmin` removida de `useEffect`.
- **`api/client.js`**: variable `fourHundredTimeout` renombrada a `serverErrorTimeout` (usada para errores 500, no 400).
- **Claves React**: `deletedAccounts.map()` usa `email + deleted_at` en vez de solo `email` para evitar colisiones. `ban.id || idx` reemplazado por `ban.id ?? idx`.

### Eliminado
- **Bloque vacío en `listTrash` (JSON)**: `if (db.trash.length !== before) { // comentario muerto }`.
- **Variable `userBooks` shadoweada**: renombrada a `trashBooks` en snapshot de papelera para claridad.

## [Desarrollo - 8] — 2026-06-08

### Corregido
- **Crítico**: `deleteUser` en Postgres usaba función `bookViewsAdd` no definida — causaba `ReferenceError` al intentar eliminar un usuario con libros. Reemplazado por `trashedBookViews.concat()`.
- **Fondo principal**: eliminado el componente `BookshelfBackground` (antes `MundialitoBackground`) que sobreescribía el fondo con gradientes CSS y ocultaba las imágenes `FondoBookShelfClaro.jpeg`/`FondoBookShelfOscuro.jpeg`. El sistema vuelve a usar `body.has-main-bg` con las 2 imágenes, que responden correctamente al tema claro/oscuro.
- **`deleteCategory`**: ahora retorna `false` si la categoría no existe y la ruta `DELETE /api/categories/:name` responde con 404 en lugar de `{ ok: true }` silencioso.
- **`server.js`**: eliminada constante `DEFAULT_SECRET` no utilizada.
- **`AuthContext.jsx`**: corregido import de `client` sin extensión `.js`.
- **`BookImagesPanel.jsx`**: reemplazada key de array index (`i`) por `img.id` para evitar problemas de re-render.
- **Query duplicada**: eliminada consulta redundante a `book_views` en `deleteUser` Postgres.

### Modificado
- **Renombrado**: todo el sistema `MundialitoBackground` → `BookshelfBackground`: componente, clases CSS (`.mundialito-bg` → `.bookshelf-bg`, `.mundialito-hero` → `.bookshelf-hero`) y documentación asociada.
- **Documentación**: sincronizados todos los archivos markdown con el código actual (puertos, roles, componentes eliminados, rutas faltantes).

### Chore
- Sincronización general de documentación y markdowns con el estado actual del código.

## [Desarrollo - 7] — 2026-06-05

### Añadido
- **Imágenes de usuario reutilizables**: sube imágenes con nombre custom y úsalas en cualquier libro con `@img:nombre`. Las imágenes se guardan por cuenta (`user_id`) y están disponibles globalmente para el autor.
- **Página `/library`** (MediaLibrary): grilla con upload, rename inline, reordenar (swap sort_order), eliminar, badge "en uso/desuso".
- **API `/api/user-images`**: CRUD completo + resolución on-demand + escaneo de uso en capítulos del usuario.
- **Soporte `@img:nombre` en ReadingMode**: `PageContent` parsea `@img:nombre` y `![alt](url)`, resuelve imágenes via `/api/user-images/resolve/:authorId/:name`.
- **Barra de progreso vertical** en modo lectura: `position: sticky` dentro del contenedor scrollable, actualizada por listener `scroll` nativo.
- **ImageManager reescrito**: auto-fetch desde API, upload con nombre personalizado, capítulo picker para insertar `@img:nombre` en el capítulo/cursor exacto.
- **Editor.jsx simplificado**: removido estado `images`, `insertOpen`, y handlers de imágenes locales. Ahora delega todo a `ImageManager`.

### Modificado
- **Gestión de imágenes**: eliminado el ImageManager local que solo mostraba previsualización y subida simple. Ahora es un componente completo con sincronización API, renombrado inline, reorden con swap, capítulo picker y badge de estado de uso.

### Corregido
- **Reorden de imágenes**: ahora hace swap real de `sort_order` entre imagen y su vecino (antes solo incrementaba ±1, causando pérdida de orden).
- **Overflow horizontal en cards**: `min-w-0 overflow-hidden` y `flex-wrap` en filas de botones para evitar desborde en pantallas estrechas.
- **Stale closure en scrollPct**: reemplazado `onScroll={updateScroll}` (React synthetic event) por `addEventListener('scroll', handler)` via `useEffect` con ref estable.
- **File input no se reseteaba**: añadido `useRef` al input de archivo y `value = ''` tras upload exitoso.
- **ImageManager botón "Renombrar"**: `ml-auto` eliminado para evitar desborde con `flex-wrap`.
- **Stale closure scroll**: `updateScroll` movido a ref (`scrollFn.current`) para que el listener siempre use la versión más reciente sin reiniciar el efecto.
- **`sort_order: 0` en nuevas imágenes**: ahora calcula `max(sort_order) + 1` para que aparezcan al final de la lista.
- **`emptyDb()`**: eliminada clave `images` no utilizada que generaba ruido en `db.json`.

## [Desarrollo - 6] — 2026-06-05

### Añadido
- **Fondo de pantalla principal**: imagen `FondoBookShelfClaro.jpeg` (modo claro, 1024×572) e `FondoBookShelfOscuro.jpeg` (modo oscuro, 1024×572) como fondo de página en Home, Explore y Announcements. Se aplica con clase `.has-main-bg` en `<body>` agregada via `useEffect` en cada página (cleanup automático al navegar a admin/mod/perfil). Overlay claro 85% / oscuro 90% para mantener legibilidad.

### Modificado
- **Eliminar anuncios**: moderadores ahora pueden eliminar **sus propios** anuncios (antes solo admins podían eliminar cualquier anuncio). Control de autoría via `admin_id`.

## [Desarrollo - 5] — 2026-06-04

### Añadido
- **Sistema completo de variables CSS**: `--bg-base`, `--bg-surface`, `--text-main`, `--text-muted`, `--border-subtle`, `--accent-main` (turquesa), `--accent-secondary` (coral), `--accent-main-rgb`, `--accent-glow`, `--card-shadow`, etc. con transición `0.3s` entre temas.
- **Paleta turquesa/coral**: acento principal `#008A7F` (claro) / `#00D0C0` (oscuro); acento secundario `#FF6B6B` (claro) / `#FF7A7A` (oscuro) para favoritos/estrellas/nombres.
- **Override de Tailwind `bookshelfBrown`**: selectores CSS de igual especificidad que redirigen `text-bookshelfBrown`, `bg-bookshelfBrown`, `border-bookshelfBrown/*` a `var(--accent-main)`.
- **Clases `rm-*`**: `rm-card`, `rm-btn-primary` (turquesa con glow + scale hover), `rm-btn-secondary` (coral), `rm-tag`/`.badge`, `rm-chapter`, `rm-search`, `rm-fav-active`.
- **CropModal en Reader.jsx**: recorte interactivo de imagen de fondo con arrastre, `apply()` con clamp de coordenadas, vista previa en canvas 200px, presets free/16:9/4:3/1:1/9:16.
- **Apoyo `.light` class**: override explícito para forzar tema claro aunque el sistema esté en oscuro.
- **`text-accent-secondary`** aplicado a FavoritesButton, RatingStars y Comments (nombres de autor).
- **Anuncios unificados**: mismo gradiente (ámbar oscuro con opacidad) en modo claro y oscuro para consistencia visual.

### Corregido
- **toast-info**: reemplazado `@apply bg-bookshelfBrown` por `background-color: var(--accent-main)` — el override CSS no funcionaba con propiedades inline de Tailwind.
- **Reader.jsx**: `border-bookshelfAccent` → `var(--accent-main)`, `bg-bookshelfAccent/30` → `rgba(var(--accent-main-rgb), 0.30)`, `rgba(123,75,39,0.25)` → `var(--border-subtle)`.
- **CropModal**: eliminado `cropAreaRef` div wrapper, usa `cropImgRef.current.getBoundingClientRect()` directo con helper `getImgRect()`.
- **Paletas de color**: `--bg-base` renombrado de `bg-base` → `bg-canvas` → vuelta a `bg-base`; `--accent-glow` unificado.
- **Swatch activo**: `border-color: #C8A26B` → `var(--accent-main)`, `box-shadow: #fff` → `var(--bg-base)`.
- **Chapter scrollbar**: `rgba(123,75,39,0.3)` → `rgba(var(--accent-main-rgb), 0.30)`.
- **Enlaces hover**: `text-bookshelfBrown` → `var(--accent-main)`.

### Eliminado
- **cropAreaRef** de CropModal: reemplazado por `getImgRect()` inline.

## [Desarrollo/Parche 4.B] — 2026-06-01

### Añadido
- **Eliminación de comentarios**: nuevo endpoint `DELETE /api/books/:id/comments/:commentId` accesible por autor del comentario, moderador o admin. Botón ✕ en Comments.jsx.
- **Eliminación de imágenes**: nuevo endpoint `DELETE /api/upload/:fileName` con auth. Botón ✕ en ImageManager.jsx.
- **Búsqueda de usuarios por email**: nuevo endpoint `GET /api/users/find/:email` (admin). Corrige `deleteUserByEmail` en Admin.jsx, que antes solo encontraba usuarios con libros publicados.
- **Limpieza automática de tokens** en modo JSON: `validateRefreshToken` poda refresh tokens expirados, `isTokenBlacklisted` elimina entradas >7 días.
- **Rate limiter con límite de memoria**: cuando el Map supera 10.000 entradas, borra el 50% más antiguo.

### Corregido
- **`deleteUser` Postgres**: `UPDATE comments SET user_id=NULL` cambiado a `DELETE FROM comments` — la columna es `NOT NULL` según migration 001, el código anterior crasheaba en Postgres.
- **`deleteUser` JSON**: `b.deleted_at = undefined` → `null` para que `JSON.stringify` no lo elimine (consistencia con Postgres).
- **`banUser` JSON**: mismo fix que deleteUser.
- **`listBookmarks`**: filtra libros con `status='deleted'` en ambas ramas (Postgres y JSON).
- **`deleteUser`**: ahora limpia `bookmarks` del usuario eliminado en ambas ramas.
- **`seed.js`: `emptyDb()`**: agregados `refresh_tokens`, `categories`, `bookmarks` que faltaban. Agregado `book_views` que también faltaba.
- **ReadingMode**: `exitingRef` previene doble `closeReading()` cuando Esc presiona (fullscreenchange + keydown). Cleanup `useEffect` cambiado de `[onMarkPage]` a `[]` con refs para evitar guardar en cada render.
- **Constantes duplicadas**: extraídas `THEMES`, `FONTS`, `WIDTHS`, etc. a `readerConstants.js` compartido entre Reader.jsx y ReadingMode.jsx.
- **Theme swatch en Reader.jsx**: usaba el objeto completo como `backgroundColor` en vez de `t.bg`.
- **Admin.jsx**: `deleteUserByEmail` usaba `/api/search/authors` que no encuentra usuarios sin libros. `const r` redeclarado con `const res`/`const delR`.
- **Comments.jsx**: `user.sub` cambiado a `user.id` — `sub` no existe en el objeto `user` de AuthContext.
- **Editor.jsx**: timeout sin cleanup (H1), `saveAll()` fallaba silenciosamente (H2), import fallaba sin aviso (M2).
- **AdminModeration.jsx**: `fetch()` sin catch en `exportCsv` — unhandled promise rejection (H3).
- **Login.jsx**: `setBanned(banned)` era no-op — ahora limpia appeal y marca `can_appeal: false`.
- **`can_appeal`**: ahora depende de `banned.appeal_submitted` real del backend, no hardcodeado `true`.
- **conversion.js**: errores ya no filtran rutas del sistema de archivos (path disclosure).
- **Admin.jsx metrics**: error de API renderizaba ceros → filtro `!r.__error`.
- **Author.jsx**: error de API dejaba "Cargando..." infinito → estado `error` con mensaje.
- **search.js**: validadores no usados (`author`, `category`, etc.) eliminados. Ruta `/authors` ahora tiene validación de entrada.
- **book_views**: agregado guard `|| []` en `deleteUser` JSON branch para evitar crash si falta la propiedad.

## [Desarrollo/Parche 4.A] — 2026-05-30
### Corregido
- **Login.jsx**: apelación ya no oculta el formulario tras enviar (`can_appeal: false` eliminado), permitiendo apelaciones múltiples.
- **`banUser` Postgres**: eliminado INSERT duplicado que no reseteaba `deleted_at`/`appeal` (quedó solo el upsert completo).
- **`deleteUser` (ambas ramas)**: ahora limpia `refresh_tokens` del usuario eliminado (antes quedaban huérfanos).
- **`DELETE /users/:id`**: ahora registra en `moderation_logs` con acción `delete-user` (antes sin auditoría).
- **Migration SQL**: `001_create_tables.sql` actualizado con columna `deleted_at` en `banned_users` y tabla `refresh_tokens`. Nueva migración `002_add_refresh_tokens_deleted_at.sql` para bases existentes.
- **DB**: limpieza de registros de prueba huérfanos (`testdelete@bookshelf.app`, `ohno@gmail.com`, refresh tokens expirados). `moderation_logs` preservados.

## [Desarrollo - 4] — 2026-05-29
### Añadido
- **Refresh tokens**: nuevo endpoint `POST /api/auth/refresh` que acepta `{ refreshToken }`, rota el token (UUID), y devuelve un nuevo par access+refresh. El access token sigue expirando según `JWT_EXPIRES_IN`; el refresh token expira a los 30 días.
- **Logout server-side**: `POST /api/auth/logout` blacklistea el access token actual y revoca todos los refresh tokens del usuario.
- **401 auto-refresh** en frontend: `client.js` intercepta 401, intenta refrescar silenciosamente con el refresh token, y si falla recién limpia sesión y redirige a `/login`.
- **Seguridad**: refrescos implementados con rotation (el token anterior se marca `used_at` y no puede reutilizarse). Si un atacante roba un refresh token, el legítimo recibirá 401 al refrescar, y si refresca primero, el robado queda inutilizado.

## [Desarrollo - 3] — 2026-05-29
### Añadido
- **Rate limiting**: 5 registros/minuto, 10 login attempts/minuto por IP (in-memory sliding window).
- **XSS protection**: `safeUrl()` aplicado a todas las imágenes de anuncios y uploads.
- **Column-name validation** en SQL dinámico (`updateBook`/`updateChapter`): allowlist `^[a-z_]+$`.

### Corregido
- **Crítico**: `optionalAuth` usaba variable `JWT_SECRET` sin prefijo `cfg.` — ReferenceError en cada request con token (`middlewares/auth.js:46`).
- **Auth middleware**: todas las respuestas de error ahora incluyen `code` numérico (`middlewares/auth.js`).
- **`POST /auth/appeal`**: faltaba `validationResult()` — datos inválidos pasaban silenciosamente.
- **`PUT /moderation/contact-info`**: faltaba `validationResult()`.
- **`DELETE /moderation/banned/:email`**: faltaba `param('email')` validator.
- **`GET /health`**: handler sin `next` — cualquier error crasheaba el servidor.
- **optionalAuth**: ahora verifica token blacklist, cutoff por email y ban activo (antes omitía estas comprobaciones).
- **Home.jsx**: `a.image_path` sin `safeUrl()` → XSS potencial.
- **Null guards**: `new Date(a.created_at)` sin fallback en Home.jsx, Announcements.jsx, AdminModeration.jsx.
- **Timeouts sin cleanup**: `client.js` y `Editor.jsx` ahora limpian `setTimeout` con `clearTimeout`.
- **useEffect deps faltantes**: Explore.jsx (filter, setParams), Admin.jsx (navigate, isAdmin), AdminModeration.jsx (navigate, isAdmin, isModerator), Profile.jsx (navigate), Login.jsx (email).
- **Localización/UX**: textos traducidos a español (Home.jsx, Profile.jsx, Editor.jsx, Login, Admin, AdminModeration); categorías con acentos (`fantasía`, `poesía`).
- **`cap()` null safety**: 9 componentes ya no crashean con `null`/`undefined`.
- **Editor.jsx**: capítulos sincronizados desde props via `useEffect`, `<option>` con `value` faltante añadido.
- **Reader.jsx**: índice clamp con `Math.max(0, ...)`, `chapters` en deps.
- **RatingStars.jsx/FavoritesButton.jsx**: `useEffect` sincroniza cambios en prop `initial`.
- **ImageManager.jsx**: toast en fallo de upload, `src` sanitizado con `safeUrl`.
- **Explore.jsx**: filtros sincronizados con URL sin bucle infinito.
- **Login.jsx**: email sincronizado desde URL search params.
- **ToastContext.jsx**: timer cleanup via `useRef`.
- **Backend routes**: validadores `param()` añadidos a rutas con `:id` en books, announcements, upload, users.
- **`db/index.js`**: `listModerators` filtra `password_hash` en modo JSON; `searchAuthors` añade `created_at`.
- **`auth.js` catch blocks**: errores DB ya no se confunden con "Token inválido".
- **`upload.js`**: `next` en POST, try/catch en GET download, callback error en `res.download`.
- **`conversion.js`**: try/catch en `readFileSync` para RTF y texto plano.
- **`server.js`**: middleware `notFound` montado globalmente (antes sólo en `/api`).
- **Migration SQL**: tabla `categories` añadida a `001_create_tables.sql`.

## [Desarrollo - 2] — 2026-05-28
### Añadido
- **Sistema de categorías**: CRUD completo (admin crea/elimina, moderadores asignan).
  Al eliminar una categoría los libros pasan a "en espera de categorización".
- **Categorías dinámicas**: FiltersPanel y Editor cargan categorías desde `/api/categories`.
- **Sección de libros sin categoría** en el panel de moderación para asignación rápida.
- **Anuncios destacados**: toggle (admin), fondo degradado dorado para anuncios admin,
  siempre visible en Home y Announcements.
- **Texto "Publicado por" editable**: admin puede personalizarlo (incluido vacío para ocultar).
- **Moderadores pueden crear anuncios**: se almacena su `display_name` como autor.
- **Conteo de vistas con timer de 10s**: el frontend espera 10 segundos antes de enviar
  `POST /api/books/:id/view`. Tracking `book_views` para evitar duplicados por usuario.
- **Reset de vistas**: botón admin "Reiniciar vistas" — pone `views=0` y limpia tracking.
- **API client nunca lanza**: todas las llamadas devuelven `{ __error: true }` en error.
- **Middleware `optionalAuth`**: valida token si existe, pero nunca rechaza la petición.
- **Filtro `?author_id=X`** en `GET /api/books`.
- **Filtro `?status=all`** en `GET /api/books` (incluye borradores/eliminados).
- **Panel "BookShelf"** (antes "Dashboard Admin") con métricas, categorías, anuncios, moderadores.

### Corregido
- **Path traversal** en `upload.js`: sanitización de ruta resuelta contra `STORAGE_PATH`.
- **Object spread injection** en `createBook`: `...book` movido antes de defaults.
- **Stale closure** en Editor.jsx: `setChapters(prev => [...prev, ...])` en "Nuevo capítulo".
- **Columnas faltantes** en Postgres `createUser` INSERT.
- **Reader.jsx**: reset bookmark en cambio de libro, clamp de índice, manejo de capítulos vacíos.
- **RatingStars.jsx**: toast silenciado en respuesta null.
- **Null props** en AuthorCard, BookCard, FiltersPanel (optional chaining / defaults).
- **LIKE wildcard injection** en `searchAuthors` / `listBooks` (escape `%`/`_` + ESCAPE).
- **React StrictMode double-increment** en vistas: `useRef` dedup en Book.jsx.
- **Timer de vistas re-armado** en StrictMode remount (separado del guard `fetched`).
- **Badge className** en Admin.jsx: JSX string dentro de `""` corregido a `{}`.

### Eliminado
- **Splash screen** (nunca se ocultaba).
- **Flag `is_admin_fox`**: completamente removido del código, DB, seeds y docs.
- **`requireRole()`**: middleware muerto removido de `auth.js`.
- **ThemeToggle.jsx**: componente no usado.
- **`fs` import** de `routes/books.js`, **`path` import** de `server.js` (no usados).

## [Desarrollo - 1] — 2026-05-20
### Añadido
- Migración SQL inicial (Postgres / Supabase) con tablas, índices y RLS de ejemplo.
- Seeds honestos: 3 cuentas (usuarioTest, admin, adminFox), 6 libros, 0 likes.
- Backend Express con autenticación JWT, roles, moderación, exportación CSV y
  conversión de archivos .txt / .md / .docx / .rtf a libros.
- Frontend React + Vite + Tailwind con animaciones (anime.js), tema claro/oscuro,
  toasts temporales y mini-redirecciones a /error/400 y /error/500.
- Pestaña exclusiva de moderación con baneo/desbaneo, apelación única,
  exportación CSV y gestión de moderadores con reglas de protección entre admins.
- Documentación: README, arquitectura, API, roles_permissions, deploy_instructions.
- Scripts: healthcheck.js, export_banned_example.sh.

const http = require('http');

const versions = [
  "1.8.0", "1.7.0", "1.6.0", "1.5.0", "1.4.0",
  "1.3.2", "1.3.1", "1.3.0", "1.2.0", "1.1.0", "1.0.0"
];

const titles = {
  "1.8.0": "Correcciones críticas, easter egg y página de changelog",
  "1.7.0": "Renombrado Mundialito → BookShelf y correcciones de fondo",
  "1.6.0": "Imágenes de usuario reutilizables (@img:nombre)",
  "1.5.0": "Fondo de pantalla principal",
  "1.4.0": "Sistema completo de variables CSS turquesa/coral",
  "1.3.2": "Eliminación de comentarios, imágenes y limpieza de tokens",
  "1.3.1": "Correcciones de apelación, bans y migraciones SQL",
  "1.3.0": "Refresh tokens, logout server-side y auto-refresh",
  "1.2.0": "Rate limiting, XSS protection y column-name validation",
  "1.1.0": "Sistema de categorías, anuncios destacados y conteo de vistas",
  "1.0.0": "Versión inicial — Migración SQL, seeds y plataforma base"
};

const entries = {};

entries["1.8.0"] = `### Añadido
- **Easter egg registro**: si un usuario intenta registrarse con \`display_name\` que coincide con \`error_fox\`/\`error fox\` (cualquier variante de espacios/guiones/mayúsculas), el backend responde \`{ error: "Nu uh, eso es mío!", easter_egg: true }\`. El frontend bloquea el formulario, borra el nombre carácter por carácter (cada 300ms), y tras vaciarlo oculta el mensaje y desbloquea la interfaz.
- **\`useLockedBody\` hook**: nuevo hook en \`frontend/src/hooks/useLockedBody.js\` que añade/remueve clase \`egg-locked\` al \`<body>\` para bloquear interacción durante la animación del easter egg.
- **Página \`/changelog\`**: nueva ruta pública que lista versiones del proyecto con acordeón (una expandida a la vez). Cada versión muestra número, título y entradas editables.
- **Admin — gestión de changelogs**: sección en el panel BookShelf para añadir, editar y eliminar versiones. Configuración del texto-link del footer y versión actual. Solo admins.
- **Footer — link a changelog**: debajo de la información de contacto aparece \`v{versión_actual} — {texto_link}\` configurable desde el panel admin.
- **API \`/api/changelogs\`**: endpoints públicos y protegidos (CRUD completo + configuración del link).

### Corregido
- **Crítico (Postgres)**: \`.rows.rows\` en \`setModerator\` y \`deleteCategory\` — TypeError al promover moderador o eliminar categoría. Corregido: \`pgQuery\` ya devuelve \`r.rows\` directamente.
- **Crítico (Postgres)**: \`cleanupExpiredTrash\` reportaba siempre \`{ deleted: 0 }\` porque \`pgQuery\` no expone \`rowCount\`. Corregido usando \`pgPool.query\` directo.
- **Crítico (Postgres)**: \`setFeaturedAnnouncement\` crasheaba si el anuncio no existía (destructure de \`undefined\`). Corregido con guard \`if (!rows.length) return\`.
- **Crítico (Frontend)**: null crash en \`ban_history\` (\`u.ban_history.some()\` con \`undefined\`). Corregido con \`(u.ban_history || []).some(...)\`.
- **Crítico (Frontend)**: null crash en \`new Date(d.deleted_at)\` cuando \`deleted_at\` es \`null\`. Corregido con guard ternario.
- **Crítico (Frontend)**: null crash en \`d.new_user.role\` cuando \`new_user\` es \`null\`. Corregido con optional chaining.
- **\`restoreFromTrash\` (ambas ramas)**: \`result.user_email\` siempre era \`'unknown'\` en el log de moderación. Corregido añadiendo \`user_email\` al valor de retorno.
- **PG restore inserts**: \`.catch(() => {})\` silenciosos en todos los INSERTs de restauración — ahora registran errores con \`console.warn\`.
- **\`/deleted-accounts\`**: asumía \`delRecords[0]\` como la eliminación más reciente sin ordenar. Corregido: ordena por \`deleted_at DESC\`.
- **\`exportCsv\`**: manejaba el token manualmente sin usar el API client centralizado.
- **\`Admin.jsx\`**: faltaba estilo para rol \`creator\` en la tabla de usuarios (se mostraba invisible).
- **\`Admin.jsx\`**: null crash en \`new Date(u.created_at)\` cuando \`created_at\` es \`null\`.

### Modificado
- **\`GET /moderation/users\`**: \`total\` ahora siempre refleja \`users.length\` real (incluye cuentas pre-baneadas, antes subestimaba).
- **\`_groupBanRecords\`**: ordenamiento por \`bans[0].banned_at\` reemplazado por \`Math.max(...bans.map(...))\` para no depender del orden interno.
- **\`deleteBanRecord\` (JSON)**: ya no retorna \`boolean\` (consistente con rama PG que retorna \`void\`).
- **\`AdminModeration.jsx\`**: consolidadas funciones duplicadas \`deleteBanRecord\`/\`doDeleteBanRecord\`. Eliminado import \`useCallback\` no usado. Dep \`isAdmin\` removida de \`useEffect\`.
- **\`api/client.js\`**: variable \`fourHundredTimeout\` renombrada a \`serverErrorTimeout\` (usada para errores 500, no 400).
- **Claves React**: \`deletedAccounts.map()\` usa \`email + deleted_at\` en vez de solo \`email\` para evitar colisiones. \`ban.id || idx\` reemplazado por \`ban.id ?? idx\`.

### Eliminado
- **Bloque vacío en \`listTrash\` (JSON)**: \`if (db.trash.length !== before) { // comentario muerto }\`.
- **Variable \`userBooks\` shadoweada**: renombrada a \`trashBooks\` en snapshot de papelera para claridad.`;

entries["1.7.0"] = `### Corregido
- **Crítico**: \`deleteUser\` en Postgres usaba función \`bookViewsAdd\` no definida — causaba \`ReferenceError\` al intentar eliminar un usuario con libros. Reemplazado por \`trashedBookViews.concat()\`.
- **Fondo principal**: eliminado el componente \`BookshelfBackground\` (antes \`MundialitoBackground\`) que sobreescribía el fondo con gradientes CSS y ocultaba las imágenes \`FondoBookShelfClaro.jpeg\`/\`FondoBookShelfOscuro.jpeg\`. El sistema vuelve a usar \`body.has-main-bg\` con las 2 imágenes, que responden correctamente al tema claro/oscuro.
- **\`deleteCategory\`**: ahora retorna \`false\` si la categoría no existe y la ruta \`DELETE /api/categories/:name\` responde con 404 en lugar de \`{ ok: true }\` silencioso.
- **\`server.js\`**: eliminada constante \`DEFAULT_SECRET\` no utilizada.
- **\`AuthContext.jsx\`**: corregido import de \`client\` sin extensión \`.js\`.
- **\`BookImagesPanel.jsx\`**: reemplazada key de array index (\`i\`) por \`img.id\` para evitar problemas de re-render.
- **Query duplicada**: eliminada consulta redundante a \`book_views\` en \`deleteUser\` Postgres.

### Modificado
- **Renombrado**: todo el sistema \`MundialitoBackground\` → \`BookshelfBackground\`: componente, clases CSS (\`.mundialito-bg\` → \`.bookshelf-bg\`, \`.mundialito-hero\` → \`.bookshelf-hero\`) y documentación asociada.
- **Documentación**: sincronizados todos los archivos markdown con el código actual (puertos, roles, componentes eliminados, rutas faltantes).

### Chore
- Sincronización general de documentación y markdowns con el estado actual del código.`;

entries["1.6.0"] = `### Añadido
- **Imágenes de usuario reutilizables**: sube imágenes con nombre custom y úsalas en cualquier libro con \`@img:nombre\`. Las imágenes se guardan por cuenta (\`user_id\`) y están disponibles globalmente para el autor.
- **Página \`/library\`** (MediaLibrary): grilla con upload, rename inline, reordenar (swap sort_order), eliminar, badge "en uso/desuso".
- **API \`/api/user-images\`**: CRUD completo + resolución on-demand + escaneo de uso en capítulos del usuario.
- **Soporte \`@img:nombre\` en ReadingMode**: \`PageContent\` parsea \`@img:nombre\` y \`![alt](url)\`, resuelve imágenes via \`/api/user-images/resolve/:authorId/:name\`.
- **Barra de progreso vertical** en modo lectura: \`position: sticky\` dentro del contenedor scrollable, actualizada por listener \`scroll\` nativo.
- **ImageManager reescrito**: auto-fetch desde API, upload con nombre personalizado, capítulo picker para insertar \`@img:nombre\` en el capítulo/cursor exacto.
- **Editor.jsx simplificado**: removido estado \`images\`, \`insertOpen\`, y handlers de imágenes locales. Ahora delega todo a \`ImageManager\`.

### Modificado
- **Gestión de imágenes**: eliminado el ImageManager local que solo mostraba previsualización y subida simple. Ahora es un componente completo con sincronización API, renombrado inline, reorden con swap, capítulo picker y badge de estado de uso.

### Corregido
- **Reorden de imágenes**: ahora hace swap real de \`sort_order\` entre imagen y su vecino (antes solo incrementaba ±1, causando pérdida de orden).
- **Overflow horizontal en cards**: \`min-w-0 overflow-hidden\` y \`flex-wrap\` en filas de botones para evitar desborde en pantallas estrechas.
- **Stale closure en scrollPct**: reemplazado \`onScroll={updateScroll}\` (React synthetic event) por \`addEventListener('scroll', handler)\` via \`useEffect\` con ref estable.
- **File input no se reseteaba**: añadido \`useRef\` al input de archivo y \`value = ''\` tras upload exitoso.
- **ImageManager botón "Renombrar"**: \`ml-auto\` eliminado para evitar desborde con \`flex-wrap\`.
- **Stale closure scroll**: \`updateScroll\` movido a ref (\`scrollFn.current\`) para que el listener siempre use la versión más reciente sin reiniciar el efecto.
- **\`sort_order: 0\` en nuevas imágenes**: ahora calcula \`max(sort_order) + 1\` para que aparezcan al final de la lista.
- **\`emptyDb()\`**: eliminada clave \`images\` no utilizada que generaba ruido en \`db.json\`.`;

entries["1.5.0"] = `### Añadido
- **Fondo de pantalla principal**: imagen \`FondoBookShelfClaro.jpeg\` (modo claro, 1024×572) e \`FondoBookShelfOscuro.jpeg\` (modo oscuro, 1024×572) como fondo de página en Home, Explore y Announcements. Se aplica con clase \`.has-main-bg\` en \`<body>\` agregada via \`useEffect\` en cada página (cleanup automático al navegar a admin/mod/perfil). Overlay claro 85% / oscuro 90% para mantener legibilidad.

### Modificado
- **Eliminar anuncios**: moderadores ahora pueden eliminar **sus propios** anuncios (antes solo admins podían eliminar cualquier anuncio). Control de autoría via \`admin_id\`.`;

entries["1.4.0"] = `### Añadido
- **Sistema completo de variables CSS**: \`--bg-base\`, \`--bg-surface\`, \`--text-main\`, \`--text-muted\`, \`--border-subtle\`, \`--accent-main\` (turquesa), \`--accent-secondary\` (coral), \`--accent-main-rgb\`, \`--accent-glow\`, \`--card-shadow\`, etc. con transición \`0.3s\` entre temas.
- **Paleta turquesa/coral**: acento principal \`#008A7F\` (claro) / \`#00D0C0\` (oscuro); acento secundario \`#FF6B6B\` (claro) / \`#FF7A7A\` (oscuro) para favoritos/estrellas/nombres.
- **Override de Tailwind \`bookshelfBrown\`**: selectores CSS de igual especificidad que redirigen \`text-bookshelfBrown\`, \`bg-bookshelfBrown\`, \`border-bookshelfBrown/*\` a \`var(--accent-main)\`.
- **Clases \`rm-*\`**: \`rm-card\`, \`rm-btn-primary\` (turquesa con glow + scale hover), \`rm-btn-secondary\` (coral), \`rm-tag\`/\`.badge\`, \`rm-chapter\`, \`rm-search\`, \`rm-fav-active\`.
- **CropModal en Reader.jsx**: recorte interactivo de imagen de fondo con arrastre, \`apply()\` con clamp de coordenadas, vista previa en canvas 200px, presets free/16:9/4:3/1:1/9:16.
- **Apoyo \`.light\` class**: override explícito para forzar tema claro aunque el sistema esté en oscuro.
- **\`text-accent-secondary\`** aplicado a FavoritesButton, RatingStars y Comments (nombres de autor).
- **Anuncios unificados**: mismo gradiente (ámbar oscuro con opacidad) en modo claro y oscuro para consistencia visual.

### Corregido
- **toast-info**: reemplazado \`@apply bg-bookshelfBrown\` por \`background-color: var(--accent-main)\` — el override CSS no funcionaba con propiedades inline de Tailwind.
- **Reader.jsx**: \`border-bookshelfAccent\` → \`var(--accent-main)\`, \`bg-bookshelfAccent/30\` → \`rgba(var(--accent-main-rgb), 0.30)\`, \`rgba(123,75,39,0.25)\` → \`var(--border-subtle)\`.
- **CropModal**: eliminado \`cropAreaRef\` div wrapper, usa \`cropImgRef.current.getBoundingClientRect()\` directo con helper \`getImgRect()\`.
- **Paletas de color**: \`--bg-base\` renombrado de \`bg-base\` → \`bg-canvas\` → vuelta a \`bg-base\`; \`--accent-glow\` unificado.
- **Swatch activo**: \`border-color: #C8A26B\` → \`var(--accent-main)\`, \`box-shadow: #fff\` → \`var(--bg-base)\`.
- **Chapter scrollbar**: \`rgba(123,75,39,0.3)\` → \`rgba(var(--accent-main-rgb), 0.30)\`.
- **Enlaces hover**: \`text-bookshelfBrown\` → \`var(--accent-main)\`.

### Eliminado
- **cropAreaRef** de CropModal: reemplazado por \`getImgRect()\` inline.`;

entries["1.3.2"] = `### Añadido
- **Eliminación de comentarios**: nuevo endpoint \`DELETE /api/books/:id/comments/:commentId\` accesible por autor del comentario, moderador o admin. Botón ✕ en Comments.jsx.
- **Eliminación de imágenes**: nuevo endpoint \`DELETE /api/upload/:fileName\` con auth. Botón ✕ en ImageManager.jsx.
- **Búsqueda de usuarios por email**: nuevo endpoint \`GET /api/users/find/:email\` (admin). Corrige \`deleteUserByEmail\` en Admin.jsx, que antes solo encontraba usuarios con libros publicados.
- **Limpieza automática de tokens** en modo JSON: \`validateRefreshToken\` poda refresh tokens expirados, \`isTokenBlacklisted\` elimina entradas >7 días.
- **Rate limiter con límite de memoria**: cuando el Map supera 10.000 entradas, borra el 50% más antiguo.

### Corregido
- **\`deleteUser\` Postgres**: \`UPDATE comments SET user_id=NULL\` cambiado a \`DELETE FROM comments\` — la columna es \`NOT NULL\` según migration 001, el código anterior crasheaba en Postgres.
- **\`deleteUser\` JSON**: \`b.deleted_at = undefined\` → \`null\` para que \`JSON.stringify\` no lo elimine (consistencia con Postgres).
- **\`banUser\` JSON**: mismo fix que deleteUser.
- **\`listBookmarks\`**: filtra libros con \`status='deleted'\` en ambas ramas (Postgres y JSON).
- **\`deleteUser\`**: ahora limpia \`bookmarks\` del usuario eliminado en ambas ramas.
- **\`seed.js\`: \`emptyDb()\`**: agregados \`refresh_tokens\`, \`categories\`, \`bookmarks\` que faltaban. Agregado \`book_views\` que también faltaba.
- **ReadingMode**: \`exitingRef\` previene doble \`closeReading()\` cuando Esc presiona (fullscreenchange + keydown). Cleanup \`useEffect\` cambiado de \`[onMarkPage]\` a \`[]\` con refs para evitar guardar en cada render.
- **Constantes duplicadas**: extraídas \`THEMES\`, \`FONTS\`, \`WIDTHS\`, etc. a \`readerConstants.js\` compartido entre Reader.jsx y ReadingMode.jsx.
- **Theme swatch en Reader.jsx**: usaba el objeto completo como \`backgroundColor\` en vez de \`t.bg\`.
- **Admin.jsx**: \`deleteUserByEmail\` usaba \`/api/search/authors\` que no encuentra usuarios sin libros. \`const r\` redeclarado con \`const res\`/\`const delR\`.
- **Comments.jsx**: \`user.sub\` cambiado a \`user.id\` — \`sub\` no existe en el objeto \`user\` de AuthContext.
- **Editor.jsx**: timeout sin cleanup (H1), \`saveAll()\` fallaba silenciosamente (H2), import fallaba sin aviso (M2).
- **AdminModeration.jsx**: \`fetch()\` sin catch en \`exportCsv\` — unhandled promise rejection (H3).
- **Login.jsx**: \`setBanned(banned)\` era no-op — ahora limpia appeal y marca \`can_appeal: false\`.
- **\`can_appeal\`**: ahora depende de \`banned.appeal_submitted\` real del backend, no hardcodeado \`true\`.
- **conversion.js**: errores ya no filtran rutas del sistema de archivos (path disclosure).
- **Admin.jsx metrics**: error de API renderizaba ceros → filtro \`!r.__error\`.
- **Author.jsx**: error de API dejaba "Cargando..." infinito → estado \`error\` con mensaje.
- **search.js**: validadores no usados (\`author\`, \`category\`, etc.) eliminados. Ruta \`/authors\` ahora tiene validación de entrada.
- **book_views**: agregado guard \`|| []\` en \`deleteUser\` JSON branch para evitar crash si falta la propiedad.`;

entries["1.3.1"] = `### Corregido
- **Login.jsx**: apelación ya no oculta el formulario tras enviar (\`can_appeal: false\` eliminado), permitiendo apelaciones múltiples.
- **\`banUser\` Postgres**: eliminado INSERT duplicado que no reseteaba \`deleted_at\`/\`appeal\` (quedó solo el upsert completo).
- **\`deleteUser\` (ambas ramas)**: ahora limpia \`refresh_tokens\` del usuario eliminado (antes quedaban huérfanos).
- **\`DELETE /users/:id\`**: ahora registra en \`moderation_logs\` con acción \`delete-user\` (antes sin auditoría).
- **Migration SQL**: \`001_create_tables.sql\` actualizado con columna \`deleted_at\` en \`banned_users\` y tabla \`refresh_tokens\`. Nueva migración \`002_add_refresh_tokens_deleted_at.sql\` para bases existentes.
- **DB**: limpieza de registros de prueba huérfanos (\`testdelete@bookshelf.app\`, \`ohno@gmail.com\`, refresh tokens expirados). \`moderation_logs\` preservados.`;

entries["1.3.0"] = `### Añadido
- **Refresh tokens**: nuevo endpoint \`POST /api/auth/refresh\` que acepta \`{ refreshToken }\`, rota el token (UUID), y devuelve un nuevo par access+refresh. El access token sigue expirando según \`JWT_EXPIRES_IN\`; el refresh token expira a los 30 días.
- **Logout server-side**: \`POST /api/auth/logout\` blacklistea el access token actual y revoca todos los refresh tokens del usuario.
- **401 auto-refresh** en frontend: \`client.js\` intercepta 401, intenta refrescar silenciosamente con el refresh token, y si falla recién limpia sesión y redirige a \`/login\`.
- **Seguridad**: refrescos implementados con rotation (el token anterior se marca \`used_at\` y no puede reutilizarse). Si un atacante roba un refresh token, el legítimo recibirá 401 al refrescar, y si refresca primero, el robado queda inutilizado.`;

entries["1.2.0"] = `### Añadido
- **Rate limiting**: 5 registros/minuto, 10 login attempts/minuto por IP (in-memory sliding window).
- **XSS protection**: \`safeUrl()\` aplicado a todas las imágenes de anuncios y uploads.
- **Column-name validation** en SQL dinámico (\`updateBook\`/\`updateChapter\`): allowlist \`^[a-z_]+$\`.

### Corregido
- **Crítico**: \`optionalAuth\` usaba variable \`JWT_SECRET\` sin prefijo \`cfg.\` — ReferenceError en cada request con token (\`middlewares/auth.js:46\`).
- **Auth middleware**: todas las respuestas de error ahora incluyen \`code\` numérico (\`middlewares/auth.js\`).
- **\`POST /auth/appeal\`**: faltaba \`validationResult()\` — datos inválidos pasaban silenciosamente.
- **\`PUT /moderation/contact-info\`**: faltaba \`validationResult()\`.
- **\`DELETE /moderation/banned/:email\`**: faltaba \`param('email')\` validator.
- **\`GET /health\`**: handler sin \`next\` — cualquier error crasheaba el servidor.
- **optionalAuth**: ahora verifica token blacklist, cutoff por email y ban activo (antes omitía estas comprobaciones).
- **Home.jsx**: \`a.image_path\` sin \`safeUrl()\` → XSS potencial.
- **Null guards**: \`new Date(a.created_at)\` sin fallback en Home.jsx, Announcements.jsx, AdminModeration.jsx.
- **Timeouts sin cleanup**: \`client.js\` y \`Editor.jsx\` ahora limpian \`setTimeout\` con \`clearTimeout\`.
- **useEffect deps faltantes**: Explore.jsx (filter, setParams), Admin.jsx (navigate, isAdmin), AdminModeration.jsx (navigate, isAdmin, isModerator), Profile.jsx (navigate), Login.jsx (email).
- **Localización/UX**: textos traducidos a español (Home.jsx, Profile.jsx, Editor.jsx, Login, Admin, AdminModeration); categorías con acentos (\`fantasía\`, \`poesía\`).
- **\`cap()\` null safety**: 9 componentes ya no crashean con \`null\`/\`undefined\`.
- **Editor.jsx**: capítulos sincronizados desde props via \`useEffect\`, \`<option>\` con \`value\` faltante añadido.
- **Reader.jsx**: índice clamp con \`Math.max(0, ...)\`, \`chapters\` en deps.
- **RatingStars.jsx/FavoritesButton.jsx**: \`useEffect\` sincroniza cambios en prop \`initial\`.
- **ImageManager.jsx**: toast en fallo de upload, \`src\` sanitizado con \`safeUrl\`.
- **Explore.jsx**: filtros sincronizados con URL sin bucle infinito.
- **Login.jsx**: email sincronizado desde URL search params.
- **ToastContext.jsx**: timer cleanup via \`useRef\`.
- **Backend routes**: validadores \`param()\` añadidos a rutas con \`:id\` en books, announcements, upload, users.
- **\`db/index.js\`**: \`listModerators\` filtra \`password_hash\` en modo JSON; \`searchAuthors\` añade \`created_at\`.
- **\`auth.js\` catch blocks**: errores DB ya no se confunden con "Token inválido".
- **\`upload.js\`**: \`next\` en POST, try/catch en GET download, callback error en \`res.download\`.
- **\`conversion.js\`**: try/catch en \`readFileSync\` para RTF y texto plano.
- **\`server.js\`**: middleware \`notFound\` montado globalmente (antes sólo en \`/api\`).
- **Migration SQL**: tabla \`categories\` añadida a \`001_create_tables.sql\`.`;

entries["1.1.0"] = `### Añadido
- **Sistema de categorías**: CRUD completo (admin crea/elimina, moderadores asignan). Al eliminar una categoría los libros pasan a "en espera de categorización".
- **Categorías dinámicas**: FiltersPanel y Editor cargan categorías desde \`/api/categories\`.
- **Sección de libros sin categoría** en el panel de moderación para asignación rápida.
- **Anuncios destacados**: toggle (admin), fondo degradado dorado para anuncios admin, siempre visible en Home y Announcements.
- **Texto "Publicado por" editable**: admin puede personalizarlo (incluido vacío para ocultar).
- **Moderadores pueden crear anuncios**: se almacena su \`display_name\` como autor.
- **Conteo de vistas con timer de 10s**: el frontend espera 10 segundos antes de enviar \`POST /api/books/:id/view\`. Tracking \`book_views\` para evitar duplicados por usuario.
- **Reset de vistas**: botón admin "Reiniciar vistas" — pone \`views=0\` y limpia tracking.
- **API client nunca lanza**: todas las llamadas devuelven \`{ __error: true }\` en error.
- **Middleware \`optionalAuth\`**: valida token si existe, pero nunca rechaza la petición.
- **Filtro \`?author_id=X\`** en \`GET /api/books\`.
- **Filtro \`?status=all\`** en \`GET /api/books\` (incluye borradores/eliminados).
- **Panel "BookShelf"** (antes "Dashboard Admin") con métricas, categorías, anuncios, moderadores.

### Corregido
- **Path traversal** en \`upload.js\`: sanitización de ruta resuelta contra \`STORAGE_PATH\`.
- **Object spread injection** en \`createBook\`: \`...book\` movido antes de defaults.
- **Stale closure** en Editor.jsx: \`setChapters(prev => [...prev, ...])\` en "Nuevo capítulo".
- **Columnas faltantes** en Postgres \`createUser\` INSERT.
- **Reader.jsx**: reset bookmark en cambio de libro, clamp de índice, manejo de capítulos vacíos.
- **RatingStars.jsx**: toast silenciado en respuesta null.
- **Null props** en AuthorCard, BookCard, FiltersPanel (optional chaining / defaults).
- **LIKE wildcard injection** en \`searchAuthors\` / \`listBooks\` (escape \`%\`/\`_\` + ESCAPE).
- **React StrictMode double-increment** en vistas: \`useRef\` dedup en Book.jsx.
- **Timer de vistas re-armado** en StrictMode remount (separado del guard \`fetched\`).
- **Badge className** en Admin.jsx: JSX string dentro de \`""\` corregido a \`{}\`.

### Eliminado
- **Splash screen** (nunca se ocultaba).
- **Flag \`is_admin_fox\`**: completamente removido del código, DB, seeds y docs.
- **\`requireRole()\`**: middleware muerto removido de \`auth.js\`.
- **ThemeToggle.jsx**: componente no usado.
- **\`fs\` import** de \`routes/books.js\`, **\`path\` import** de \`server.js\` (no usados).`;

entries["1.0.0"] = `### Añadido
- Migración SQL inicial (Postgres / Supabase) con tablas, índices y RLS de ejemplo.
- Seeds honestos: 3 cuentas (usuarioTest, admin, adminFox), 6 libros, 0 likes.
- Backend Express con autenticación JWT, roles, moderación, exportación CSV y conversión de archivos .txt / .md / .docx / .rtf a libros.
- Frontend React + Vite + Tailwind con animaciones (anime.js), tema claro/oscuro, toasts temporales y mini-redirecciones a /error/400 y /error/500.
- Pestaña exclusiva de moderación con baneo/desbaneo, apelación única, exportación CSV y gestión de moderadores con reglas de protección entre admins.
- Documentación: README, arquitectura, API, roles_permissions, deploy_instructions.
- Scripts: healthcheck.js, export_banned_example.sh.`;

// ---- Runner ----

function apiPost(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'localhost', port: 4000, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };
    if (token) opts.headers.Authorization = 'Bearer ' + token;
  const req = http.request(opts, res => { let b = ''; res.on('data', c => b += c); res.on('end', () => resolve(JSON.parse(b))); });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function apiPut(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'localhost', port: 4000, path, method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data),
                 'Authorization': 'Bearer ' + token }
    };
  const req = http.request(opts, res => { let b = ''; res.on('data', c => b += c); res.on('end', () => resolve(JSON.parse(b))); });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function apiDelete(path, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost', port: 4000, path, method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    };
  const req = http.request(opts, res => { let b = ''; res.on('data', c => b += c); res.on('end', () => resolve(JSON.parse(b))); });
    req.on('error', reject);
    req.end();
  });
}

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: 4000, path, method: 'GET' };
  const req = http.request(opts, res => { let b = ''; res.on('data', c => b += c); res.on('end', () => resolve(JSON.parse(b))); });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  // Login
  const login = await apiPost('/api/auth/login', { email: 'admin@bookshelf.app', password: 'admin123' });
  const token = login.token + '';
  console.log('Token obtenido');

  // Clear existing
  const existing = await apiGet('/api/changelogs');
  for (const v of existing.changelogs || []) {
    await apiDelete('/api/changelogs/' + v.id, token);
  }
  console.log('Limpiados existentes');

  // Create versions oldest first so newest sorts correctly
  const sorted = versions.slice().reverse();
  for (const ver of sorted) {
    const body = { version: ver, title: titles[ver], entries: entries[ver] };
    try {
      const r = await apiPost('/api/changelogs', body, token);
      if (r.error) { console.log('ERR', ver, r.error); continue; }
      console.log('OK', ver, r.id ? r.id.substring(0, 8) : '?');
    } catch (e) {
      console.log('ERR', ver, e.message);
    }
  }

  // Update config
  await apiPut('/api/changelogs/config', { link_text: 'Ver historial de versiones', current_version: '1.8.0' }, token);
  console.log('Config actualizada');
  console.log('Hecho.');
}

main().catch(console.error);

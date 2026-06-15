$token = (Invoke-RestMethod -Uri http://localhost:4000/api/auth/login -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"admin@bookshelf.app","password":"admin123"}').token
$headers = @{"Authorization"="Bearer $token";"Content-Type"="application/json"}

# Clear existing changelogs
$existing = (Invoke-RestMethod -Uri http://localhost:4000/api/changelogs -Headers $headers).changelogs
foreach ($v in $existing) { Invoke-RestMethod -Uri "http://localhost:4000/api/changelogs/$($v.id)" -Method DELETE -Headers $headers | Out-Null }

$versions = @(
  @{version="1.8.0"; title="Correcciones críticas, easter egg y página de changelog"}
  @{version="1.7.0"; title="Renombrado Mundialito → BookShelf y correcciones de fondo"}
  @{version="1.6.0"; title="Imágenes de usuario reutilizables (@img:nombre)"}
  @{version="1.5.0"; title="Fondo de pantalla principal"}
  @{version="1.4.0"; title="Sistema completo de variables CSS turquesa/coral"}
  @{version="1.3.2"; title="Eliminación de comentarios, imágenes y limpieza de tokens"}
  @{version="1.3.1"; title="Correcciones de apelación, bans y migraciones SQL"}
  @{version="1.3.0"; title="Refresh tokens, logout server-side y auto-refresh"}
  @{version="1.2.0"; title="Rate limiting, XSS protection y column-name validation"}
  @{version="1.1.0"; title="Sistema de categorías, anuncios destacados y conteo de vistas"}
  @{version="1.0.0"; title="Versión inicial — Migración SQL, seeds y plataforma base"}
)

$entries = @{}
$entries["1.8.0"] = "### Añadido
- Easter egg registro: si un usuario intenta registrarse con display_name que coincide con error_fox/error fox (cualquier variante), el backend responde { error: \"Nu uh, eso es mío!\", easter_egg: true }. El frontend bloquea el formulario, borra el nombre carácter por carácter (cada 300ms), y tras vaciarlo oculta el mensaje y desbloquea la interfaz.
- useLockedBody hook: nuevo hook que añade/remueve clase egg-locked al body para bloquear interacción durante la animación del easter egg.
- Página /changelog: nueva ruta pública que lista versiones del proyecto con acordeón (una expandida a la vez).
- Admin — gestión de changelogs: sección en el panel BookShelf para añadir, editar y eliminar versiones. Configuración del texto-link del footer y versión actual.
- Footer — link a changelog: debajo de la información de contacto aparece v{versión_actual} — {texto_link} configurable desde el panel admin.
- API /api/changelogs: endpoints públicos y protegidos (CRUD completo + configuración del link).

### Corregido
- Crítico (Postgres): .rows.rows en setModerator y deleteCategory — TypeError al promover moderador o eliminar categoría.
- Crítico (Postgres): cleanupExpiredTrash reportaba siempre { deleted: 0 } porque pgQuery no expone rowCount.
- Crítico (Postgres): setFeaturedAnnouncement crasheaba si el anuncio no existía (destructure de undefined).
- Crítico (Frontend): null crash en ban_history (u.ban_history.some() con undefined).
- Crítico (Frontend): null crash en new Date(d.deleted_at) cuando deleted_at es null.
- Crítico (Frontend): null crash en d.new_user.role cuando new_user es null.
- restoreFromTrash (ambas ramas): result.user_email siempre era 'unknown' en el log de moderación.
- PG restore inserts: .catch(() => {}) silenciosos reemplazados por console.warn.
- /deleted-accounts: asumía delRecords[0] como la eliminación más reciente sin ordenar.
- exportCsv: manejaba el token manualmente sin usar el API client centralizado.
- Admin.jsx: faltaba estilo para rol creator en la tabla de usuarios.
- Admin.jsx: null crash en new Date(u.created_at) cuando created_at es null.

### Modificado
- GET /moderation/users: total ahora siempre refleja users.length real (incluye cuentas pre-baneadas).
- _groupBanRecords: ordenamiento por bans[0].banned_at reemplazado por Math.max(...bans.map(...)).
- deleteBanRecord (JSON): ya no retorna boolean (consistente con rama PG).
- AdminModeration.jsx: consolidadas funciones duplicadas deleteBanRecord/doDeleteBanRecord.
- api/client.js: variable fourHundredTimeout renombrada a serverErrorTimeout.
- Claves React: deletedAccounts.map() usa email + deleted_at para evitar colisiones.

### Eliminado
- Bloque vacío en listTrash (JSON): if (db.trash.length !== before) { // comentario muerto }
- Variable userBooks shadoweada: renombrada a trashBooks."

$entries["1.7.0"] = "### Corregido
- Crítico: deleteUser en Postgres usaba función bookViewsAdd no definida — causaba ReferenceError al intentar eliminar un usuario con libros.
- Fondo principal: eliminado el componente BookshelfBackground (antes MundialitoBackground) que sobreescribía el fondo con gradientes CSS.
- deleteCategory: ahora retorna false si la categoría no existe y responde con 404.
- server.js: eliminada constante DEFAULT_SECRET no utilizada.
- AuthContext.jsx: corregido import de client sin extensión .js.
- BookImagesPanel.jsx: reemplazada key de array index (i) por img.id.
- Query duplicada: eliminada consulta redundante a book_views en deleteUser Postgres.

### Modificado
- Renombrado: todo el sistema MundialitoBackground → BookshelfBackground: componente, clases CSS y documentación.
- Documentación: sincronizados todos los archivos markdown con el código actual.

### Chore
- Sincronización general de documentación y markdowns con el estado actual del código."

$entries["1.6.0"] = "### Añadido
- Imágenes de usuario reutilizables: sube imágenes con nombre custom y úsalas en cualquier libro con @img:nombre.
- Página /library (MediaLibrary): grilla con upload, rename inline, reordenar (swap sort_order), eliminar, badge en uso/desuso.
- API /api/user-images: CRUD completo + resolución on-demand + escaneo de uso en capítulos del usuario.
- Soporte @img:nombre en ReadingMode: PageContent parsea @img:nombre y ![alt](url).
- Barra de progreso vertical en modo lectura: position: sticky dentro del contenedor scrollable.
- ImageManager reescrito: auto-fetch desde API, upload con nombre personalizado, capítulo picker.
- Editor.jsx simplificado: removido estado images, insertOpen, y handlers locales.

### Modificado
- Gestión de imágenes: eliminado el ImageManager local que solo mostraba previsualización y subida simple.

### Corregido
- Reorden de imágenes: ahora hace swap real de sort_order entre imagen y su vecino.
- Overflow horizontal en cards: min-w-0 overflow-hidden y flex-wrap.
- Stale closure en scrollPct: reemplazado onScroll por addEventListener con ref estable.
- File input no se reseteaba: añadido useRef al input y value = '' tras upload.
- ImageManager botón Renombrar: ml-auto eliminado para evitar desborde.
- sort_order: 0 en nuevas imágenes: ahora calcula max(sort_order) + 1.
- emptyDb(): eliminada clave images no utilizada."

$entries["1.5.0"] = "### Añadido
- Fondo de pantalla principal: imagen FondoBookShelfClaro.jpeg (modo claro) e FondoBookShelfOscuro.jpeg (modo oscuro) como fondo en Home, Explore y Announcements. Overlay claro 85% / oscuro 90%.

### Modificado
- Eliminar anuncios: moderadores ahora pueden eliminar sus propios anuncios (antes solo admins)."

$entries["1.4.0"] = "### Añadido
- Sistema completo de variables CSS: --bg-base, --text-main, --accent-main (turquesa), --accent-secondary (coral), etc. con transición 0.3s entre temas.
- Paleta turquesa/coral: acento principal #008A7F (claro) / #00D0C0 (oscuro); acento secundario #FF6B6B (claro) / #FF7A7A (oscuro).
- Override de Tailwind bookshelfBrown: selectores CSS redirigen a var(--accent-main).
- Clases rm-*: rm-card, rm-btn-primary (turquesa con glow), rm-btn-secondary (coral).
- CropModal en Reader.jsx: recorte interactivo de imagen de fondo con presets.
- Apoyo .light class: override explícito para forzar tema claro.
- text-accent-secondary aplicado a FavoritesButton, RatingStars y Comments.
- Anuncios unificados: mismo gradiente en modo claro y oscuro.

### Corregido
- toast-info: reemplazado @apply bg-bookshelfBrown por background-color: var(--accent-main).
- Reader.jsx: border-bookshelfAccent → var(--accent-main).
- CropModal: eliminado cropAreaRef div wrapper.
- Paletas de color: --bg-base renombrado varias veces, estandarizado.
- Swatch activo, Chapter scrollbar, Enlaces hover corregidos.

### Eliminado
- cropAreaRef de CropModal: reemplazado por getImgRect() inline."

$entries["1.3.2"] = "### Añadido
- Eliminación de comentarios: nuevo endpoint DELETE /api/books/:id/comments/:commentId.
- Eliminación de imágenes: nuevo endpoint DELETE /api/upload/:fileName.
- Búsqueda de usuarios por email: nuevo endpoint GET /api/users/find/:email (admin).
- Limpieza automática de tokens en modo JSON.
- Rate limiter con límite de memoria: cuando el Map supera 10.000 entradas, borra el 50% más antiguo.

### Corregido
- deleteUser Postgres: UPDATE comments SET user_id=NULL cambiado a DELETE FROM comments.
- deleteUser JSON: b.deleted_at = undefined → null.
- banUser JSON: mismo fix que deleteUser.
- listBookmarks: filtra libros con status='deleted' en ambas ramas.
- deleteUser: ahora limpia bookmarks del usuario eliminado.
- seed.js/emptyDb(): agregados refresh_tokens, categories, bookmarks, book_views.
- ReadingMode: exitingRef previene doble closeReading().
- Constantes duplicadas extraídas a readerConstants.js.
- Múltiples bugs en Admin.jsx, Comments.jsx, Editor.jsx, AdminModeration.jsx, Login.jsx.
- can_appeal ahora depende de banned.appeal_submitted real del backend.
- conversion.js: errores ya no filtran rutas del sistema (path disclosure).
- Múltiples guards null/error handling en Admin.jsx, Author.jsx, search.js, book_views."

$entries["1.3.1"] = "### Corregido
- Login.jsx: apelación ya no oculta el formulario tras enviar, permitiendo apelaciones múltiples.
- banUser Postgres: eliminado INSERT duplicado que no reseteaba deleted_at/appeal.
- deleteUser (ambas ramas): ahora limpia refresh_tokens del usuario eliminado.
- DELETE /users/:id: ahora registra en moderation_logs con acción delete-user.
- Migration SQL: actualizado con columna deleted_at en banned_users y tabla refresh_tokens.
- DB: limpieza de registros de prueba huérfanos."

$entries["1.3.0"] = "### Añadido
- Refresh tokens: nuevo endpoint POST /api/auth/refresh, rota el token (UUID), devuelve nuevo par access+refresh.
- Logout server-side: POST /api/auth/logout blacklistea access token y revoca todos los refresh tokens.
- 401 auto-refresh en frontend: client.js intercepta 401, refresca silenciosamente.
- Seguridad: rotation implementado (token anterior se marca used_at)."

$entries["1.2.0"] = "### Añadido
- Rate limiting: 5 registros/minuto, 10 login attempts/minuto por IP.
- XSS protection: safeUrl() aplicado a imágenes de anuncios y uploads.
- Column-name validation en SQL dinámico (allowlist ^[a-z_]+$).

### Corregido
- Crítico: optionalAuth usaba variable JWT_SECRET sin prefijo cfg. — ReferenceError en cada request con token.
- Auth middleware: todas las respuestas de error ahora incluyen code numérico.
- POST /auth/appeal: faltaba validationResult().
- PUT /moderation/contact-info: faltaba validationResult().
- DELETE /moderation/banned/:email: faltaba param('email') validator.
- GET /health: handler sin next — cualquier error crasheaba el servidor.
- optionalAuth: ahora verifica token blacklist, cutoff por email y ban activo.
- Home.jsx: a.image_path sin safeUrl() → XSS potencial.
- Null guards en múltiples componentes.
- Timeouts sin cleanup en client.js y Editor.jsx.
- useEffect deps faltantes en 7 componentes.
- Localización/UX: textos traducidos a español.
- cap() null safety en 9 componentes.
- Múltiples bugs en Editor, Reader, RatingStars, FavoritesButton, ImageManager, Explore, Login.
- Backend routes: validadores param() añadidos.
- db/index.js y auth.js mejorados.
- upload.js, conversion.js, server.js mejorados."

$entries["1.1.0"] = "### Añadido
- Sistema de categorías: CRUD completo (admin crea/elimina, moderadores asignan). Al eliminar una categoría los libros pasan a en espera de categorización.
- Categorías dinámicas: FiltersPanel y Editor cargan categorías desde /api/categories.
- Sección de libros sin categoría en el panel de moderación.
- Anuncios destacados: toggle (admin), fondo degradado dorado para anuncios admin.
- Texto Publicado por editable: admin puede personalizarlo.
- Moderadores pueden crear anuncios.
- Conteo de vistas con timer de 10s. Tracking book_views para evitar duplicados.
- Reset de vistas: botón admin Reiniciar vistas.
- API client nunca lanza: todas las llamadas devuelven { __error: true }.
- Middleware optionalAuth.
- Filtro ?author_id=X y ?status=all en GET /api/books.
- Panel BookShelf (antes Dashboard Admin).

### Corregido
- Path traversal en upload.js.
- Object spread injection en createBook.
- Stale closure en Editor.jsx.
- Columnas faltantes en Postgres createUser INSERT.
- Reader.jsx: reset bookmark, clamp de índice, capítulos vacíos.
- RatingStars.jsx: toast silenciado en respuesta null.
- Null props en AuthorCard, BookCard, FiltersPanel.
- LIKE wildcard injection en searchAuthors/listBooks.
- React StrictMode double-increment en vistas.
- Badge className en Admin.jsx.

### Eliminado
- Splash screen (nunca se ocultaba).
- Flag is_admin_fox: completamente removido.
- requireRole(): middleware muerto.
- ThemeToggle.jsx: componente no usado.
- fs import de routes/books.js, path import de server.js."

$entries["1.0.0"] = "### Añadido
- Migración SQL inicial (Postgres / Supabase) con tablas, índices y RLS de ejemplo.
- Seeds honestos: 3 cuentas (usuarioTest, admin, adminFox), 6 libros, 0 likes.
- Backend Express con autenticación JWT, roles, moderación, exportación CSV y conversión de archivos .txt / .md / .docx / .rtf a libros.
- Frontend React + Vite + Tailwind con animaciones (anime.js), tema claro/oscuro, toasts temporales y mini-redirecciones a /error/400 y /error/500.
- Pestaña exclusiva de moderación con baneo/desbaneo, apelación única, exportación CSV y gestión de moderadores.
- Documentación: README, arquitectura, API, roles_permissions, deploy_instructions.
- Scripts: healthcheck.js, export_banned_example.sh."

foreach ($v in $versions) {
  $ver = $v.version
  $body = @{version=$ver; title=$v.title; entries=$entries[$ver]} | ConvertTo-Json -Depth 10
  try {
    $r = Invoke-RestMethod -Uri "http://localhost:4000/api/changelogs" -Method POST -Headers $headers -Body $body
    Write-Host "✓ $ver - $($r.id.Substring(0,8))"
  } catch {
    Write-Host "✗ $ver - ERROR: $($_.Exception.Message)"
  }
}

Write-Host "`nHecho. Total: $($versions.Count) versiones."

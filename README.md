# BookShelf™ — Plataforma de lectura digital

> © 2026 **Jeison Sossa**, **Santiago López**, **Leyder Montoya**. Todos los derechos reservados. — MIT License

Plataforma web de lectura digital abierta y justa: incentiva la lectura y la
creatividad narrativa evitando prácticas abusivas. Pensada para iniciar en
Colombia, modular, escalable y fácil de modificar.

> **Importante:** BookShelf es **exclusivamente una página web**, no una aplicación
> nativa. Todo el proyecto corre localmente con Git y las instrucciones de este
> README. No depende de ninguna plataforma de despliegue externa.

---

## Stack

| Capa       | Tecnología                                                |
|------------|-----------------------------------------------------------|
| Frontend   | React 18 + Vite + TailwindCSS + anime.js + react-router-dom + Recharts |
| Backend    | Node.js + Express + JWT + bcryptjs + multer + express-validator |
| Base datos | PostgreSQL 13+ (o Supabase). Fallback demo: JSON local.   |
| Conversión | mammoth (.docx), parser propio (.md/.txt/.rtf)            |
| Export CSV | csv-writer                                                |
| Categorías | CRUD completo desde panel admin + asignación desde moderación |
| Lector     | ReadingMode (fullscreen portal, teclas, scroll progreso, preferencias localStorage) |

---

## Estructura del repo

```
BookShelf/
├─ frontend/    React + Vite + Tailwind + animejs
├─ backend/     Node.js + Express, auth JWT, moderación, conversión
├─ database/    Migraciones SQL y seeds idempotentes
├─ docs/        architecture.md  api.md  roles_permissions.md
├─ scripts/     healthcheck.js  export_banned_example.sh
├─ .env.example .gitignore LICENSE README.md CHANGELOG.md
└─ deploy_instructions.txt
```

---

## Cómo ejecutar localmente

### Requisitos

- **Node.js 18+**
- **Git**
- (Opcional) **PostgreSQL 13+** si quieres usar la BD real. Si no, el proyecto
  arranca en modo JSON con cero instalación adicional.

### Pasos

```bash
# 1) Clona o copia el repo
cd BookShelf

# 2) Variables de entorno
cp .env.example .env       # en Windows PowerShell: Copy-Item .env.example .env
# Edita .env si quieres cambiar PORT, JWT_SECRET o usar Postgres.

# 3) Backend
cd backend
npm install
npm run seed               # genera datos (Postgres o backend/storage/db.json)
npm start                  # http://localhost:4000

# 4) Frontend (en otra terminal)
cd ../frontend
npm install
npm run dev                # http://localhost:3100
```

Abre [http://localhost:3100](http://localhost:3100).

---

## Credenciales de prueba

> Sólo para demo. **No usar en producción.**

| Email                    | Contraseña | Rol                     | Notas |
|--------------------------|------------|-------------------------|-------|
| usuarioTest@bookshelf.app   | admin123   | creator                 | Autor de todos los libros de ejemplo. No es moderador. |
| admin@bookshelf.app         | admin123   | admin + moderator       | Administrador principal. |
| adminFox@bookshelf.app      | admin123   | admin + moderator       | Segundo administrador (privilegios idénticos a admin). |

Los administradores **no pueden eliminarse entre sí ni a sí mismos**.

Para entrar al panel de moderación: inicia sesión con cualquiera de los dos y
navega a `/admin/moderation`.

**Cuenta moderadora** (puede crear anuncios, moderar libros y asignar categorías):
| Email                    | Contraseña | Rol       | Notas |
|--------------------------|------------|-----------|-------|
| lopezsanty2008@gmail.com    | admin123   | moderator | Creada manualmente para pruebas de moderación. |

> Los moderadores pueden crear anuncios y asignar categorías a libros sin categorizar.
> Sólo los administradores pueden crear/eliminar categorías, gestionar moderadores,
> exportar CSV, editar información de contacto y destacar anuncios.

---

## Métricas iniciales (honestas)

| Métrica            | Valor de seed | Por qué |
|--------------------|---------------|---------|
| Autores registrados| **1**         | Sólo usuarioTest tiene rol `creator`. |
| Libros publicados  | **6**         | 2 por grupo de edad + ≥1 por categoría. |
| Libros vistos      | **0**         | Las vistas se cuentan al abrir cada libro. |
| Favoritos          | **0**         | No se siembran likes falsos. |
| Baneados           | **0**         | banned_users empieza vacío. |
| Categorías         | **4**         | fantasía, poesía, narrativa, educativa. |

Las métricas se derivan **en vivo** desde la BD (ver `routes/metrics.js`).

---

## Anuncios

Los anuncios pueden ser creados por **administradores** y **moderadores**.

- **Administradores**: el anuncio se muestra con fondo degradado dorado y
  la etiqueta **Admin**. El texto de autoría ("Publicado por") es editable
  desde el panel BookShelf — incluso se puede dejar vacío para ocultarlo.
- **Moderadores**: el anuncio se muestra con fondo simple y la etiqueta
  **Moderador**. El autor es su `display_name`.
- **Anuncio destacado**: cualquier anuncio (admin o moderador) puede ser
  marcado como **destacado** (★) por un administrador. El destacado aparece
  primero en la página de inicio y en el tablón de anuncios.
- **Último anuncio visible**: el anuncio no destacado más reciente siempre se
  muestra completo (no colapsado), para que los lectores vean siempre lo último.
- Los anuncios anteriores se pliegan bajo un `<details>`.

## Animaciones

Se usa **anime.js** (https://animejs.com) en `frontend/src/components/animations/animations.js`:

- `cardEntrance` — aparición escalonada de tarjetas en Home/Explore.
- `bannerEntrance` — animación del tablón de anuncios en Home.
- `buttonPulse` — microinteracción en botones (theme toggle, favoritos).
- `loadingDots` — animación de carga.

---

## Conversión de archivos a libro

Desde el editor (`/book/:id/edit`) puedes subir:

- Texto: `.txt`, `.md`, `.docx`, `.rtf` — se parsea y se divide en capítulos
  (detección de `# Encabezado`, `Capítulo N` o saltos triples).
- Imágenes: `.jpg`, `.jpeg`, `.png`, `.webp` — se suben a la biblioteca personal
  con nombre custom (`@img:nombre`) y se insertan desde el ImageManager en el editor
  o con la referencia `@img:nombre_custom` en el contenido del capítulo.
- Las imágenes de usuario se gestionan desde la página `/library` (Mis imágenes) o
  desde el ImageManager en el editor de cada libro.

Límite: **5 MB** por archivo (`MAX_UPLOAD_SIZE_BYTES` en `.env`).

> El editor carga las categorías disponibles desde la API; los autores pueden
> asignar una categoría existente o dejar el libro como
> **"En espera de categorización"** para que moderadores/admin la asignen después.

El archivo original se guarda en `backend/storage/`. Puede mantenerse **privado**
(sólo visible para el autor) o liberarse para descarga pública (`original_public`
en el editor).

---

## Conteo de vistas

Las vistas se cuentan **10 segundos después** de que un usuario abre la página
del libro (`/book/:id`). Esto evita inflar el contador por rebotes (bounces).

- **Usuarios autenticados**: sólo se cuenta **1 vista** por sesión (el backend
  lleva un registro `book_views` para evitar duplicados).
- **Usuarios anónimos (ghost)**: cada carga de página cuenta como 1 vista (no
  hay forma de identificar al visitante).
- **Reset de vistas**: los administradores ven un botón **"Reiniciar vistas"**
  en la página del libro que pone `views=0` y limpia el tracking `book_views`,
  permitiendo que los mismos usuarios vuelvan a contar.

## Favoritos (bookmarks)

Los usuarios autenticados pueden marcar libros como favoritos (toggle) desde
la página del libro. Los marcadores aparecen en su perfil (`/profile`). Los
libros eliminados no aparecen en la lista de marcadores.

## Comentarios

Los usuarios autenticados pueden comentar en cualquier libro. Los comentarios
pueden ser eliminados por su autor, moderadores o administradores (botón ✕
visible según permisos).

---

## Panel BookShelf (admin)

Ruta: **`/admin`**. Visible sólo para administradores.

Incluye:

- **Métricas en vivo**: autores, libros, vistas totales.
- **Gestión de categorías**: crear y eliminar categorías (al eliminar, los
  libros con esa categoría pasan a **"En espera de categorización"**).
- **Gestión de anuncios**: destacar/quitar destacado de anuncios y personalizar
  el texto **"Publicado por"** (incluso vacío para ocultarlo).
- **Gestión de moderadores**: añadir/eliminar moderadores con reglas de
  protección entre administradores.

## Panel de moderación

Ruta: **`/admin/moderation`**. Accesible para administradores y moderadores.

Incluye:

- **Libros sin categoría**: lista de libros con estado
  **"En espera de categorización"** y selector para asignar una categoría.
- **Tabla global de usuarios**: lista completa con filtros por rol (Todos, Usuarios, Escritores,
  Moderadores, Admins, Baneados, Eliminados), búsqueda por nombre o correo, y badge de estado
  (Baneado, Desbaneado, Anteriormente eliminado, Sin registrar).
- **Semi-formulario de ban inline**: aparece debajo de la fila del usuario seleccionado, con
  campo de motivo, cancelar y banear — sin cambiar de pantalla.
- **Historial completo de baneos**: acordeón de un solo nivel que muestra todos los eventos
  de ban/desban/eliminación por email, con detalles (motivo, fechas, quién baneó/desbaneó, apelación).
- **Cuentas eliminadas**: sección separada que lista correos eliminados, con detección de
  reutilización (si el correo fue registrado de nuevo por otro usuario), badge "Reutilizado —
  display_name (rol)" o "Correo libre". Admin puede eliminar el registro de ban.
- **Cuentas pre-baneadas**: usuarios que existen en `banned_users` pero no en `users`
  (nunca se registraron) — se muestran con badge "Sin registrar" y nombre "(sin registro)".
- **Banear/desbanear**: cada ban inserta un nuevo registro (historial preservado).
  Apelación múltiple: cada envío sobrescribe la apelación del ban activo.
- **Eliminar registro de ban** (sólo admin): borra todos los registros del email
  (solo si no hay bans activos). El `moderation_logs` conserva el historial.
- **Eliminar usuario** (sólo admin): `DELETE /api/users/:id` — elimina todos sus
  datos y marca `deleted_at` en `banned_users` (el email queda libre para re-registro).
- **Exportar CSV** (sólo admin): columnas `email, reason, appeal, banned_at, unbanned_at`.
- **Lista de moderadores y admins**: con tabs, reorden drag-free (↑/↓), añadir/eliminar
  moderadores con reglas de protección entre administradores.
- **Editar información y contactos** (sólo admin): incluye link al Discord
  `https://discord.gg/j543pdNhae`.

Ver `docs/roles_permissions.md` para la matriz completa.

---

## Seguridad mínima (presentación)

- Contraseñas: `bcryptjs` 10 rondas.
- Tokens: JWT HS256 (access token, expira según `JWT_EXPIRES_IN`) + refresh token UUID (30 días, con rotation).
- Auto-refresh en 401: el frontend renueva el access token silenciosamente antes de perder la sesión.
- Logout server-side: revoca todos los refresh tokens y blacklistea el access token actual.
- Sesiones revocables: `token_blacklist` + cutoff por email al banear.
- Inputs validados con `express-validator`.
- **Rate limiting**: 5 registros/minuto y 10 login attempts/minuto por IP en endpoints de auth.
- Consultas parametrizadas con `pg`.
- Protección contra path traversal en subida de archivos (resolución de ruta
  contra `STORAGE_PATH`).
- Categorías escapadas contra inyección LIKE (`%` y `_` escapados con `ESCAPE`).
- CORS restringido a `FRONTEND_URL`.
- Auditoría: `moderation_logs` (actor, acción, target, IP, timestamp).

> ⚠ Para producción real: rotar `JWT_SECRET`, activar HTTPS, habilitar RLS en
> Supabase, activar rate limiting persistente (Redis) y monitoreo.

---

## CI (informal)

No incluimos pipeline real; en su lugar, prácticas recomendadas para el equipo
(Jeison, Santiago, Leyder):

- Ramas: `main` (estable) y `dev` (integración).
- Cada feature en su propia rama: `feature/<nombre>`.
- Pull requests revisados al menos por uno de los otros dos desarrolladores.
- Antes de mergear: `node scripts/healthcheck.js` debe pasar.
- Commits con mensajes claros y atómicos.

---

## Documentación adicional

- [`docs/architecture.md`](docs/architecture.md) — diagrama y decisiones.
- [`docs/api.md`](docs/api.md) — endpoints + ejemplos curl.
- [`docs/roles_permissions.md`](docs/roles_permissions.md) — matriz de roles.
- [`database/README.database.md`](database/README.database.md) — BD y seeds.
- [`backend/README.backend.md`](backend/README.backend.md) — backend.
- [`frontend/README.frontend.md`](frontend/README.frontend.md) — frontend.
- [`deploy_instructions.txt`](deploy_instructions.txt) — pasos rápidos.

---

## Licencia

MIT. Ver [LICENSE](LICENSE).

BookShelf™ — Plataforma de lectura digital
© 2026 Jeison Sossa, Santiago López, Leyder Montoya.

# Booked™ — Plataforma de lectura digital

> © 2026 **Jeison Sossa**, **Santiago López**, **Leyder Montoya**. Todos los derechos reservados. — MIT License

Plataforma web de lectura digital abierta y justa: incentiva la lectura y la
creatividad narrativa evitando prácticas abusivas. Pensada para iniciar en
Colombia, modular, escalable y fácil de modificar.

> **Importante:** Booked es **exclusivamente una página web**, no una aplicación
> nativa. Todo el proyecto corre localmente con Git y las instrucciones de este
> README. No depende de ninguna plataforma de despliegue externa.

---

## Stack

| Capa       | Tecnología                                                |
|------------|-----------------------------------------------------------|
| Frontend   | React 18 + Vite + TailwindCSS + anime.js + react-router-dom |
| Backend    | Node.js + Express + JWT + bcryptjs + multer + express-validator |
| Base datos | PostgreSQL 13+ (o Supabase). Fallback demo: JSON local.   |
| Conversión | mammoth (.docx), parser propio (.md/.txt/.rtf)            |
| Export CSV | csv-writer                                                |

---

## Estructura del repo

```
Booked/
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
cd Booked

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
npm run dev                # http://localhost:3000
```

Abre [http://localhost:3000](http://localhost:3000).

---

## Credenciales de prueba

> Sólo para demo. **No usar en producción.**

| Email                    | Contraseña | Rol                             | Notas |
|--------------------------|------------|---------------------------------|-------|
| usuarioTest@booked.com   | admin123   | creator                         | Autor de todos los libros de ejemplo. No es moderador. |
| admin@booked.com         | admin123   | admin + moderator               | Administrador principal. |
| adminFox@booked.com      | admin123   | admin + moderator (adminFox)    | Administrador principal. |

`admin` y `adminFox` tienen los mismos privilegios; **ninguno puede eliminar al
otro ni a sí mismo**.

Para entrar al panel de moderación: inicia sesión con cualquiera de los dos y
navega a `/admin/moderation`.

---

## Métricas iniciales (honestas)

| Métrica            | Valor de seed | Por qué |
|--------------------|---------------|---------|
| Autores registrados| **1**         | Sólo usuarioTest tiene rol `creator`. |
| Libros publicados  | **6**         | 2 por grupo de edad + ≥1 por categoría. |
| Libros vistos      | **0**         | Las vistas se cuentan al abrir cada libro. |
| Favoritos          | **0**         | No se siembran likes falsos. |
| Baneados           | **0**         | banned_users empieza vacío. |

Las métricas se derivan **en vivo** desde la BD (ver `routes/metrics.js`).

---

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
- Imágenes: `.jpg`, `.jpeg`, `.png`, `.webp` — se posicionan con ImageManager.

Límite: **5 MB** por archivo (`MAX_UPLOAD_SIZE_BYTES` en `.env`).

El archivo original se guarda en `backend/storage/`. Puede mantenerse **privado**
(sólo visible para el autor) o liberarse para descarga pública (`original_public`
en el editor).

---

## Límite de 2 minutos para publicar

Al crear un libro, el autor tiene **2 minutos** para confirmar la publicación.
Pasado ese tiempo, debe editarlo y reintentar. La validación ocurre tanto en
frontend (cuenta regresiva visible) como en backend (`PUT /api/books/:id`).

---

## Pestaña exclusiva de moderación

Ruta: **`/admin/moderation`**. Visible sólo para `admin` y `adminFox`.

Incluye:

- Lista de baneados con motivo, apelación, fechas.
- Banear por correo + motivo (revoca sesiones activas vía `token_blacklist`).
- Desbanear (mantiene historial).
- Apelación única automática cuando un baneado intenta iniciar sesión.
- Exportar CSV (columnas: `email, reason, appeal, banned_at, unbanned_at`).
- Editar información y contactos (incluye link al Discord
  `https://discord.gg/j543pdNhae`).
- Lista de moderadores con reglas de visibilidad/eliminación:
  - `admin` y `adminFox` son administradores principales y **están protegidos**.
  - Moderadores regulares no ven a admin/adminFox.
  - Sólo `admin` ve la lista completa y puede gestionar moderadores regulares.

Ver `docs/roles_permissions.md` para la matriz completa.

---

## Seguridad mínima (presentación)

- Contraseñas: `bcryptjs` 10 rondas.
- Tokens: JWT HS256, expira en `JWT_EXPIRES_IN`.
- Sesiones revocables: `token_blacklist` + cutoff por email al banear.
- Inputs validados con `express-validator`.
- Consultas parametrizadas con `pg`.
- CORS restringido a `FRONTEND_URL`.
- Auditoría: `moderation_logs` (actor, acción, target, IP, timestamp).

> ⚠ Para producción real: rotar `JWT_SECRET`, activar HTTPS, habilitar RLS en
> Supabase, configurar tasa de peticiones (rate limiting) y monitoreo.

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

Booked™ — Plataforma de lectura digital
© 2026 Jeison Sossa, Santiago López, Leyder Montoya.

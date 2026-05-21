# Arquitectura — Booked™

```
┌──────────────────────┐      HTTPS/CORS       ┌────────────────────────┐
│  Frontend (Vite)     │ ───────────────────▶ │  Backend Express        │
│  http://:3000        │                       │  http://:4000           │
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

1. POST `/api/auth/login` con email + password.
2. Backend valida bcrypt y verifica `banned_users`.
3. Devuelve JWT firmado con `JWT_SECRET`.
4. Frontend guarda en `localStorage` (`booked.token`).
5. Cada petición agrega `Authorization: Bearer <token>`.
6. Middleware `auth.js` valida:
   - firma JWT,
   - que el token no esté en `token_blacklist`,
   - que su `iat` sea mayor que el cutoff por email (`*all-before-...`),
   - que el email no esté baneado.

## Flujo de baneo

1. Admin envía `POST /api/moderation/ban` con `{ email, reason }`.
2. Se inserta/actualiza `banned_users`.
3. Se inserta entry `*all-before-<ts>` en `token_blacklist` (revoca sesiones).
4. Todas las peticiones siguientes de ese email fallan con 403.
5. Si el usuario intenta loguear, el login devuelve `{ banned:true, can_appeal }`.
6. El usuario puede enviar UNA apelación (`POST /api/auth/appeal`).
7. Admin desbanea: `POST /api/moderation/unban` → `unbanned_at = now()`.

## Modularidad

- Cada ruta vive en `backend/src/routes/<recurso>.js`.
- Lógica de datos centralizada en `backend/src/db/index.js` con API uniforme:
  los handlers no saben si el backend es Postgres o JSON.
- Componentes UI atómicos en `frontend/src/components/`.
- Contextos para Auth, Toast, Theme.
- Para añadir un recurso nuevo (ej. tags): crear migración, función en `db`,
  ruta y página. Cero acoplamiento horizontal.

# FoxOnAShelf — Contexto del Proyecto

## Qué es
Plataforma de lectura digital abierta y justa para lectores y escritores. Los usuarios pueden publicar libros, leer, calificar, comentar, y usar foros de soporte.

## Stack
- **Frontend**: React + Vite + Tailwind CSS → Cloudflare Pages (`foxonashelf.pages.dev`)
- **Backend**: Node.js + Express + PostgreSQL (Supabase) → Render (`foxonashelf.onrender.com`)
- **BD**: Supabase PostgreSQL (pooler en `aws-1-us-west-1`)

## Cuentas de test (contraseña: `error_foxsam2008`)
| Cuenta | Rol |
|--------|-----|
| zorritocodeadmin@foxonashelf.app | admin |
| zorritocodemod@foxonashelf.app | moderator |
| zorritocodeusuario@foxonashelf.app | user |

## Reglas de código
1. **Todo en español**: código, variables, funciones, comentarios, respuestas de API. Sin símbolos especiales tipo `ñ`.
2. **Conservar claves `localStorage`**: `bookshelf.*` (no renombrar por compatibilidad).
3. **Bucket Supabase**: `bookshelf` (no renombrar).
4. **DevAccountSwitcher**: solo visible en `import.meta.env.DEV`, limitado a 3 cuentas de test.
5. **Logo**: "FoxOnAShelf" sin guiones, alternancia de 2 colores azules vía CSS variables (`--logo-a`, `--logo-b`).
6. **Nombre de archivo de imagen**: `id_usuario-timestamp-numero`.

## Variables de entorno críticas
| Variable | Ubicación | Valor |
|----------|-----------|-------|
| `DATABASE_URL` | Render `.env` | PostgreSQL pooler con `sslmode=disable` |
| `JWT_SECRET` | Render `.env` | Secreto rotado (no el original) |
| `SUPABASE_URL` | Render `.env` | `https://sboivucusckfdikmitzv.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Render `.env` | `sb_secret_...` |
| `VITE_API_BASE_URL` | Cloudflare Pages | `https://foxonashelf.onrender.com` |
| `IPS_VERIFICADAS` | Render `.env` | *(eliminada — ya no se usa)* |

## URLs
- **Frontend**: https://foxonashelf.pages.dev
- **Backend**: https://foxonashelf.onrender.com
- **GitHub**: https://github.com/ERROR-FOX-YT/FoxOnAShelf

## Estado actual
- ~52 bugs corregidos en 4 rondas de análisis
- Responsive mobile implementado (hamburger menu, admin tables, touch targets)
- Verificación de IP eliminada
- JWT expiry: 12 horas
- Rate limits: vistas (10/min por IP), comentarios (20/min por user), chat (10/min por user)

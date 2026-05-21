# CHANGELOG — Booked™

Todas las fechas en formato YYYY-MM-DD.

## [1.0.0] — 2026-05-20
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

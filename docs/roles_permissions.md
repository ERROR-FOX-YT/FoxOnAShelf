# Roles y permisos — Booked™

## Roles

| Rol         | Quién                                            |
|-------------|--------------------------------------------------|
| ghost       | Visitante anónimo (sólo lectura pública).        |
| user        | Cuenta normal: comentar, calificar, favoritos.   |
| creator     | Puede crear y editar sus libros.                 |
| moderator   | Puede moderar libros **gratuitos**.              |
| admin       | Administrador principal (admin@ y adminFox@).    |
| system      | Reservado para tareas internas.                  |

`admin` + `is_admin_fox = true` ⇒ **adminFox** (acceso completo igual que admin).

## Matriz de permisos

| Acción                              | ghost | user | creator | moderator | admin | adminFox |
|-------------------------------------|:-----:|:----:|:-------:|:---------:|:-----:|:--------:|
| Leer libros publicados              | ✅    | ✅   | ✅      | ✅        | ✅    | ✅       |
| Comentar / calificar / favoritos    | ❌    | ✅   | ✅      | ✅        | ✅    | ✅       |
| Crear libros propios                | ❌    | ❌   | ✅      | ✅        | ✅    | ✅       |
| Editar/borrar libro propio          | ❌    | ❌   | ✅      | ✅        | ✅    | ✅       |
| Editar/borrar libro de terceros gratis | ❌ | ❌   | ❌      | ✅        | ✅    | ✅       |
| Editar/borrar libro de terceros pago   | ❌ | ❌   | ❌      | ❌        | ✅    | ✅       |
| Crear anuncios                      | ❌    | ❌   | ❌      | ❌        | ✅    | ✅       |
| Ver lista de baneados / exportar CSV| ❌    | ❌   | ❌      | ❌        | ✅    | ✅       |
| Banear / desbanear                  | ❌    | ❌   | ❌      | ❌        | ✅    | ✅       |
| Editar Información y Contactos      | ❌    | ❌   | ❌      | ❌        | ✅    | ✅       |
| Ver lista completa de moderadores   | ❌    | ❌   | ❌      | sin admins| ✅    | ✅       |

## Reglas especiales sobre admin/adminFox

- `admin` y `adminFox` son **administradores principales**.
- Ninguno puede eliminar al otro.
- Ninguno puede eliminarse a sí mismo.
- Tienen privilegios idénticos.
- Moderadores regulares **no ven** a `admin` ni a `adminFox` en su lista.
- Sólo `admin`/`adminFox` ven la lista completa y pueden eliminar a moderadores
  regulares.
- Moderadores regulares **no pueden eliminar** a otros moderadores.

## Reglas de moderación

- Al banear un correo:
  1. Se inserta/actualiza fila en `banned_users(email, reason)`.
  2. Se inserta marcador `*all-before-<ts>` en `token_blacklist` para invalidar
     todas las sesiones previas de ese email.
  3. Se loguea en `moderation_logs(actor_email, action='ban', target, ip)`.
- Al desbanear: `unbanned_at = now()` (no se borra el registro: historial).
- Cuando un baneado intenta iniciar sesión:
  - Si nunca ha apelado: el frontend muestra el formulario UNA vez.
  - Si ya apeló: queda registrado `appeal_submitted = true` y no se vuelve
    a preguntar.

## Limitaciones de demo

- En producción se recomienda activar RLS de Supabase con las políticas
  comentadas en `database/migrations/001_create_tables.sql`.
- El control en Express está pensado para Postgres local sin RLS.

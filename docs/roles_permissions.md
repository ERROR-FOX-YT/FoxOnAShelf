# Roles y permisos — FoxOnAShelf™

## Roles

| Rol         | Quién                                            |
|-------------|--------------------------------------------------|
| ghost       | Visitante anónimo (sólo lectura pública).        |
| user        | Cuenta normal: comentar, calificar, favoritos.   |
| creator     | Puede crear y editar sus libros.                 |
| moderator   | Puede moderar libros **gratuitos**, crear anuncios, asignar categorías. |
| admin       | Administrador — acceso completo a todo el sistema. |
| system      | Reservado para tareas internas.                  |

No existe el flag `is_admin_fox`; tanto `admin@foxonashelf.app` como
`adminFox@foxonashelf.app` son administradores con **privilegios idénticos**.

## Matriz de permisos

| Acción                              | ghost | user | creator | moderator | admin |
|-------------------------------------|:-----:|:----:|:-------:|:---------:|:-----:|
| Leer libros publicados              | ✅    | ✅   | ✅      | ✅        | ✅    |
| Comentar / calificar / favoritos    | ❌    | ✅   | ✅      | ✅        | ✅    |
| Eliminar **su propio** comentario   | ❌    | ✅   | ✅      | ✅        | ✅    |
| Eliminar cualquier comentario       | ❌    | ❌   | ❌      | ✅        | ✅    |
| Crear libros propios                | ❌    | ❌   | ✅      | ✅        | ✅    |
| Editar/borrar libro propio          | ❌    | ❌   | ✅      | ✅        | ✅    |
| Editar/borrar libro terceros gratis | ❌    | ❌   | ❌      | ✅        | ✅    |
| Editar/borrar libro terceros pago   | ❌    | ❌   | ❌      | ❌        | ✅    |
| Subir imágenes                      | ❌    | ✅   | ✅      | ✅        | ✅    |
| Eliminar imágenes propias           | ❌    | ✅   | ✅      | ✅        | ✅    |
| Insertar imágenes en libro propio   | ❌    | ❌   | ✅      | ✅        | ✅    |
| Insertar imágenes en libro ajeno    | ❌    | ❌   | ❌      | ❌        | ❌    |
| Ver imágenes de libro ajeno (panel) | ❌    | ❌   | ❌      | ✅        | ✅    |
| Crear anuncios                      | ❌    | ❌   | ❌      | ✅        | ✅    |
| Destacar anuncio                    | ❌    | ❌   | ❌      | ❌        | ✅    |
| Editar "Publicado por" en anuncio   | ❌    | ❌   | ❌      | ❌        | ✅    |
| Eliminar anuncio propio             | ❌    | ❌   | ❌      | ✅        | ✅    |
| Eliminar cualquier anuncio          | ❌    | ❌   | ❌      | ❌        | ✅    |
| Ver lista de baneados               | ❌    | ❌   | ❌      | ✅        | ✅    |
| Ver tabla global de usuarios        | ❌    | ❌   | ❌      | ✅        | ✅    |
| Ver cuentas eliminadas              | ❌    | ❌   | ❌      | ✅        | ✅    |
| Banear / desbanear                  | ❌    | ❌   | ❌      | ✅        | ✅    |
| Eliminar registro de ban            | ❌    | ❌   | ❌      | ❌        | ✅    |
| Exportar CSV de baneados            | ❌    | ❌   | ❌      | ❌        | ✅    |
| Editar información y contactos      | ❌    | ❌   | ❌      | ❌        | ✅    |
| Gestionar moderadores (añadir/eliminar) | ❌ | ❌ | ❌      | ❌        | ✅    |
| Crear/eliminar categorías           | ❌    | ❌   | ❌      | ❌        | ✅    |
| Asignar categoría a libro           | ❌    | ❌   | ❌      | ✅        | ✅    |
| Reiniciar vistas de libro           | ❌    | ❌   | ❌      | ❌        | ✅    |

## Reglas especiales entre administradores

- Todos los administradores tienen **privilegios idénticos**.
- Ningún administrador puede eliminar a otro administrador.
- Ningún administrador puede eliminarse a sí mismo.
- Moderadores regulares **no ven** a los administradores en su lista.
- Sólo los administradores ven la lista completa y pueden eliminar a moderadores regulares.
- Moderadores regulares **no pueden eliminar** a otros moderadores.

## Reglas de moderación

- Al banear un correo:
  1. Se **inserta** un nuevo registro en `banned_users(email, reason, banned_by)` — cada ban es un evento independiente, preservando el historial completo.
  2. Se inserta marcador `*all-before-<ts>` en `token_blacklist` para invalidar todas las sesiones previas de ese email.
  3. Se registra en `moderation_logs(actor_email, action='ban', target, ip)`.
- Al desbanear: `unbanned_at = now()` y `unbanned_by` se actualizan en el ban activo (el que tiene `unbanned_at IS NULL`).
- Cuando un baneado intenta iniciar sesión:
  - `can_appeal` depende de `banned.appeal_submitted` del backend: si ya envió apelación `can_appeal=false`, si no `true`.
  - Cada apelación sobrescribe la apelación del **ban activo** (`unbanned_at IS NULL`).
- `listBanned()` agrupa por email: `{ email, bans: [...] }`.
- Sólo administradores pueden **eliminar** un registro de ban (`DELETE /banned/:email`): borra **todos** los registros del email (solo si no hay bans activos). El `moderation_logs` conserva el historial.
- Sólo administradores pueden **eliminar un usuario** (`DELETE /users/:id`):
  - Se eliminan todos sus datos (libros, capítulos, etc.).
  - Se guarda snapshot en `trash` (recuperación en 30 días), a menos que se elimine permanentemente desde la papelera.
  - Se marca `banned_users` con `deleted_at` y `unbanned_at` (el email queda libre).
  - El registro se muestra con badge `Anteriormente eliminado` en el panel de moderación.
  - Se registra en `moderation_logs` con acción `delete-user`.
  - La sección "Cuentas eliminadas" lista estos registros e indica si el correo fue reutilizado.
  - **No pueden eliminarse a sí mismos ni a otro administrador**.

## Reglas de anuncios

- Moderadores y administradores pueden **crear** anuncios.
- Sólo administradores pueden **destacar** un anuncio, **editar** el texto
  "Publicado por", y **eliminar** anuncios de terceros.
- Los moderadores pueden **eliminar sus propios anuncios**.
- Al destacar un anuncio, cualquier otro anuncio destacado pierde el estado.
- El anuncio destacado se muestra con fondo degradado dorado.
- El texto "Publicado por" puede dejarse vacío (se oculta).

## Reglas de categorías

- Sólo administradores pueden **crear** y **eliminar** categorías.
- Moderadores y administradores pueden **asignar** una categoría a un libro
  (desde el panel de moderación).
- Al eliminar una categoría, todos los libros con esa categoría pasan a
  **"En espera de categorización"**.

## Reglas de imágenes de usuario

- Los usuarios pueden subir imágenes y asignarles un nombre personalizado (`custom_name`).
- Las imágenes se insertan en capítulos mediante la sintaxis `@img:<custom_name>`.
- Sólo el **autor del libro** puede insertar imágenes en sus propios libros.
- Administradores y moderadores que editan un libro ajeno **no pueden** insertar sus propias imágenes en él.
- Al editar un libro ajeno, administradores y moderadores ven un panel **"Imágenes del libro"**
  al final del editor, que lista las imágenes usadas en ese libro junto al nombre del autor al que pertenecen.
- Al leer un libro, el sistema resuelve `@img:<custom_name>` contra el autor del libro (`/api/user-images/resolve/<authorId>/<name>`).

## Limitaciones de demo

- En producción se recomienda activar RLS de Supabase con las políticas
  comentadas en `database/migrations/001_create_tables.sql`.
- El control en Express está pensado para Postgres local sin RLS.

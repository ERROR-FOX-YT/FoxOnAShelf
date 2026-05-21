# API — Booked™

Base URL local: `http://localhost:4000`. Todas las rutas devuelven JSON.

Para rutas autenticadas: `Authorization: Bearer <JWT>`.

## Auth

### Registro
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"nuevo@booked.com","password":"secret123","display_name":"Nuevo"}'
```
Respuesta: `{ token, user }`.

### Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@booked.com","password":"admin123"}'
```
Respuesta: `{ token, user }`.

Si el correo está baneado: `403 { error, banned:true, can_appeal, reason }`.

### Apelación (única)
```bash
curl -X POST http://localhost:4000/api/auth/appeal \
  -H 'Content-Type: application/json' \
  -d '{"email":"baneado@booked.com","appeal":"Quisiera explicar..."}'
```

## Libros

### Listar
```bash
curl 'http://localhost:4000/api/books?age_group=adolescente&category=poesia'
```

### Detalle (incrementa views)
```bash
curl http://localhost:4000/api/books/aaaaaaaa-0001-0000-0000-000000000001
```

### Crear (creator/admin)
```bash
curl -X POST http://localhost:4000/api/books \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Mi libro","description":"...","category":"narrativa","age_group":"adulto"}'
```

### Editar
```bash
curl -X PUT http://localhost:4000/api/books/<id> \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Nuevo título","status":"published"}'
```
> `status=published` está sujeto al límite de 2 minutos.

### Crear capítulo
```bash
curl -X POST http://localhost:4000/api/books/<id>/chapters \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Capítulo 1","content":"...","order":1}'
```

### Favorito (toggle)
```bash
curl -X POST http://localhost:4000/api/books/<id>/favorite \
  -H "Authorization: Bearer $TOKEN"
```

### Calificar
```bash
curl -X POST http://localhost:4000/api/books/<id>/rate \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"rating":5}'
```

### Comentar
```bash
curl -X POST http://localhost:4000/api/books/<id>/comment \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"content":"Buen libro"}'
```

### Importar archivo a libro
```bash
curl -X POST http://localhost:4000/api/books/<id>/import-file \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@mi-libro.md" \
  -F "original_public=true"
```

## Búsqueda
```bash
curl 'http://localhost:4000/api/search?q=fantasia'
```

## Anuncios
```bash
curl http://localhost:4000/api/announcements
curl -X POST http://localhost:4000/api/announcements \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Mantenimiento","content":"Mañana a las 10pm."}'
```

## Métricas
```bash
curl http://localhost:4000/api/metrics
curl http://localhost:4000/api/metrics/featured
```

## Moderación (admin)
```bash
# Listar baneados
curl http://localhost:4000/api/moderation/banned -H "Authorization: Bearer $ADMIN"
# Banear
curl -X POST http://localhost:4000/api/moderation/ban -H "Authorization: Bearer $ADMIN" \
  -H 'Content-Type: application/json' -d '{"email":"spam@x.com","reason":"spam"}'
# Desbanear
curl -X POST http://localhost:4000/api/moderation/unban -H "Authorization: Bearer $ADMIN" \
  -H 'Content-Type: application/json' -d '{"email":"spam@x.com"}'
# Moderadores
curl http://localhost:4000/api/moderation/moderators -H "Authorization: Bearer $ADMIN"
# Exportar CSV
curl -X POST http://localhost:4000/api/moderation/export-banned \
  -H "Authorization: Bearer $ADMIN" -o banned_users.csv
# Editar información y contactos
curl -X PUT http://localhost:4000/api/moderation/contact-info \
  -H "Authorization: Bearer $ADMIN" -H 'Content-Type: application/json' \
  -d '{"contact_info":"Discord oficial: https://discord.gg/j543pdNhae"}'
```

## Upload
```bash
curl -X POST http://localhost:4000/api/upload \
  -H "Authorization: Bearer $TOKEN" -F "file=@portada.png"
```

## Health
```bash
curl http://localhost:4000/api/health
# { ok:true, service:'Booked backend', mode:'json', time:'...' }
```

## Códigos de error

| Código | Significado                | Comportamiento del frontend          |
|--------|----------------------------|--------------------------------------|
| 400    | Solicitud inválida         | toast 1.2s + redirect a /error/400 (en críticas) |
| 401    | No autenticado / expirado  | limpia sesión + redirect a /login    |
| 403    | Permisos insuficientes / baneo | toast                              |
| 404    | No encontrado              | render /error/404                    |
| 500    | Error servidor             | toast 1.2s + redirect a /error/500   |

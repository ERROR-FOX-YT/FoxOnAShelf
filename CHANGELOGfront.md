# CHANGELOG — BookShelf™

Todas las fechas en formato YYYY-MM-DD.

## [Desarrollo/Parche 11.A] — 2026-06-14 — equipo BookShelf

### Añadido
- **Fotos reales**: añadidas las imágenes de perfil de cada miembro (ERROR_FOX, Slayer, Leyder).
- **Cargo del equipo**: nuevo campo "Cargo" debajo del nombre, editable desde administración, con color dorado.
- **Título editable**: el título "Nuestro Equipo" puede editarse desde el panel admin.
- **Correo admin**: cada perfil muestra el correo del administrador correspondiente, editable.
- **Fondo de pantalla**: la página del equipo ahora tiene el fondo principal del sitio.
- **Reordenar perfiles**: botones ← → para reordenar las tarjetas del equipo.

### Modificado
- **Fotos más grandes**: las imágenes de perfil aumentaron a 192px con borde dorado.
- **Tarjetas más largas**: ajuste visual para mejor presentación vertical.

### Corregido
- **Guardar perfil**: se corrigió un error que impedía guardar los cambios al editar un perfil del equipo.

## [Desarrollo - 11] — 2026-06-14 — equipo BookShelf

### Añadido
- **Perfiles del equipo**: nueva página "Nuestro Equipo" con tarjetas de los 3 miembros del proyecto, cada una con foto, nombre, edad, contacto e información. Accesible desde el enlace en el pie de página.
- **Edición de perfiles**: los administradores pueden modificar la información y foto de cada perfil directamente desde la página.

## [Desarrollo/Parche 10.A] — 2026-06-14 — ERROR_FOX

### Añadido
- **Sección de notas**: ahora cada versión puede incluir notas adicionales al final, perfectas para comentarios o aclaraciones.
- **Reordenar versiones**: puedes subir o bajar versiones para personalizar el orden en que se muestran.
- **Easter egg personalizable**: el mensaje de error del easter egg del registro ahora puede cambiarse desde el panel de administración.

### Corregido
- Mejoras de estabilidad y correcciones menores en el panel de administración.
- Eliminada la "v" del prefijo de versión en el pie de página.

## [Desarrollo - 10] — 2026-06-14 — ERROR_FOX

### Añadido
- **Edición de anuncios**: ahora puedes editar tus anuncios después de publicarlos. Si eres moderador, puedes editar los tuyos. Los administradores pueden editar cualquier anuncio.
- **Editor de novedades mejorado**: el panel de administración ahora tiene un editor más cómodo para escribir las novedades de cada versión, con secciones separadas para cada tipo de cambio.
- **Vista previa**: antes de publicar una novedad, puedes ver cómo se verá en la página.
- **Página de novedades renovada**: ahora muestra la información de manera más clara y ordenada.

## [Desarrollo - 9] — 2026-06-08 — ERROR_FOX

### Añadido
- **Easter egg en registros**: suerte encontrándolo :3
- **Página de novedades**: nueva sección donde puedes ver todas las versiones del proyecto y lo que trajo cada una.
- **Administración de versiones**: los administradores pueden añadir, editar y eliminar versiones desde el panel de control.
- **Enlace directo a las novedades**: el pie de página ahora muestra la versión actual y un enlace a la página de cambios.

### Corregido
- **Estabilidad general**: se corrigieron varios errores que podían hacer que la página dejara de funcionar al cargar ciertas secciones.
- **Navegación más fluida**: ya no aparecen pantallas en blanco al cambiar entre páginas.
- **Perfiles sin errores**: algunos datos de usuarios ya no causan fallos al mostrarse.

### Modificado
- **Lista de usuarios mejorada**: ahora se muestra la cantidad correcta de usuarios registrados.
- **Mejoras internas**: el sistema de baneos y registros de moderación funciona de manera más ordenada.

### Eliminado
- Código innecesario que ralentizaba la carga.

### Notas
- El easter egg puede ser encontrado al intentar registrarte usando el usuario del administrador, cual será?

## [Desarrollo - 8] — 2026-06-08 — ERROR_FOX

### Corregido
- **Fondo de pantalla**: se eliminó un componente que ocultaba las imágenes de fondo. Ahora el fondo claro y oscuro se ven correctamente según tu tema.
- **Eliminación de categorías**: al borrar una categoría, la página ya no muestra un mensaje de éxito falso si la categoría no existía.

### Modificado
- **Nuevo nombre visual**: el sistema ahora se llama "BookShelf" en todas partes. Los efectos visuales y nombres internos se actualizaron para reflejar el cambio.

### Notas
Gracias Teito por ayudarme, aunque me dejaste el código manchado del nombre de tu proyecto (te voy a pegar)

## [Desarrollo - 7] — 2026-06-05 — Mateo

### Corregido
- **Reorden de imágenes**: ahora al mover una imagen, realmente intercambia su lugar con la vecina (antes solo se movía un paso y se perdía el orden).
- **Diseño adaptable**: las tarjetas de libros ya no se desbordan en pantallas pequeñas.
- **Selector de archivos**: después de subir una imagen, el campo se reinicia correctamente para permitir otra subida.

## [Desarrollo - 6] — 2026-06-05 — ERROR_FOX

### Añadido
- **Fondo de pantalla principal**: las páginas de inicio, explorar y anuncios ahora tienen una imagen de fondo personalizada que cambia según el tema claro u oscuro.

### Modificado
- **Anuncios**: los moderadores ahora pueden eliminar sus propios anuncios (antes solo los administradores podían eliminar cualquier anuncio).

## [Desarrollo - 5] — 2026-06-04 — Leyder

### Corregido
- **Colores consistentes**: todos los elementos de la página ahora usan los mismos tonos turquesa, eliminando colores inconsistentes que había antes.
- **Ventana de recorte simplificada**: ahora es más fácil y precisa al ajustar las imágenes de fondo.

### Eliminado
- Código de recorte antiguo que ya no se usaba.

## [Desarrollo/Parche 4.B] — 2026-06-01 — ERROR_FOX

### Añadido
- **Eliminar comentarios**: ahora puedes borrar tus propios comentarios. Los moderadores y administradores también pueden eliminar cualquier comentario.
- **Eliminar imágenes**: puedes borrar imágenes que hayas subido directamente desde el administrador.
- **Buscar usuarios por correo**: los administradores pueden encontrar usuarios fácilmente escribiendo su correo electrónico.
- **Limpieza automática**: los datos de sesión antiguos se eliminan solos para mantener todo funcionando rápido.

### Corregido
- **Eliminación de cuentas**: al borrar un usuario, ahora se limpian correctamente todos sus datos (comentarios, marcadores, sesiones).
- **Modo lectura**: ya no se cierra accidentalmente al presionar ESC dos veces.
- **Editor de libros**: los capítulos se guardan correctamente y no se pierden los cambios.
- **Inicio de sesión**: la pantalla de bloqueo por baneo funciona como debería.
- Varias correcciones de estabilidad en diferentes secciones de la página.

## [Desarrollo/Parche 4.A] — 2026-05-30 — ERROR_FOX

### Corregido
- **Apelaciones**: ahora puedes enviar más de una apelación si fuiste baneado (antes solo se permitía una).
- **Limpieza de datos**: al eliminar una cuenta, también se cierran todas sus sesiones activas.
- **Base de datos**: limpieza de registros de prueba que ya no eran necesarios.

## [Desarrollo - 4] — 2026-05-29 — ERROR_FOX

### Añadido
- **Sesión persistente**: ya no tienes que iniciar sesión cada vez que entras. La plataforma mantiene tu sesión activa por más tiempo y la renueva automáticamente.
- **Cierre de sesión desde cualquier lugar**: puedes cerrar todas tus sesiones activas con un solo clic.
- **Más seguridad**: el sistema de renovación de sesión está diseñado para que, incluso si alguien roba tu sesión, no pueda mantener el acceso por mucho tiempo.

## [Desarrollo - 3] — 2026-05-29 — ERROR_FOX

### Añadido
- **Protección contra abusos**: el sistema ahora limita la cantidad de registros e intentos de inicio de sesión por minuto para evitar automatizaciones.
- **Imágenes más seguras**: todas las imágenes que se muestran en anuncios y subidas pasan por un control de seguridad.

### Corregido
- **Error crítico de inicio de sesión**: se corrigió un error que impedía iniciar sesión correctamente en algunos casos.
- **Textos en español**: todas las secciones de la página ahora están correctamente traducidas al español.
- **Múltiples errores menores**: se corrigieron problemas en la página principal, perfil, explorar, editor de libros y lecturas.
- **Navegación más estable**: se agregaron protecciones para evitar que la página se rompa al cargar datos incompletos.

## [Desarrollo - 2] — 2026-05-28 — ERROR_FOX

### Añadido
- **Categorías para libros**: los libros ahora se organizan por categorías. Los administradores pueden crear y eliminar categorías, y los moderadores pueden asignarlas.
- **Anuncios destacados**: ahora los anuncios importantes pueden marcarse como "destacados" para que se vean primero.
- **Texto personalizado**: los administradores pueden personalizar quién aparece como autor de un anuncio.
- **Moderadores activos**: los moderadores ahora pueden crear anuncios que se publican con su nombre.
- **Contador de visitas**: los libros muestran cuántas veces han sido vistos. El conteo se actualiza después de 10 segundos de lectura para evitar recargas falsas.
- **Panel de control**: los administradores tienen un panel con estadísticas, gestión de categorías, anuncios y moderadores.

### Corregido
- **Seguridad mejorada**: se corrigieron vulnerabilidades en la subida de archivos y en la creación de libros.
- **Lectura más estable**: el modo de lectura ya no falla al cambiar de libro o capítulo.
- **Búsquedas seguras**: las búsquedas de autores y libros ahora manejan correctamente caracteres especiales.

### Eliminado
- **Pantalla de bienvenida**: se eliminó la pantalla de carga inicial que nunca se ocultaba correctamente.
- Código antiguo y componentes que ya no se utilizaban.

## [Desarrollo - 1] — 2026-05-20 — ERROR_FOX

### Añadido
- **Lanzamiento oficial**: BookShelf abre sus puertas con todo lo necesario para leer y publicar.
- **Cuentas de usuario**: puedes registrarte, iniciar sesión y tener tu perfil personal.
- **Explorar libros**: navega por los libros disponibles, búscalos por categoría y edad recomendada.
- **Lectura en línea**: abre cualquier libro y léelo directamente en la página, con opciones de personalización visual.
- **Publicación de libros**: los escritores pueden subir sus libros en diversos formatos (texto, markdown, Word) y publicarlos.
- **Sistema de moderación**: moderadores y administradores pueden gestionar usuarios, baneos y reportes.
- **Tema claro y oscuro**: elige el modo que prefieras para leer.
- **Documentación completa**: guías de uso, arquitectura y referencias de la plataforma.

## [Desarrollo 0] — ??/??/???? — ERROR_FOX

### Añadido
**Pagina creada**

### Notas
Gracias a nuestro profesor, que nos prestó Claude para tener un molde perfecto para continuar con nuestro proyecto.
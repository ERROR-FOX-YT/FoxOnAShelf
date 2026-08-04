# CHANGELOG — FoxOnAShelf™

Todas las fechas en formato YYYY-MM-DD.

## [Desarrollo 16] — 2026-08-04 — ERROR_FOX

### Añadido
- **Editor de escritura visual**: los autores ahora escriben con un editor completo y fácil de usar: negrita, cursiva, subrayado, alineación, colores, tamaños de letra, tipos de fuente e inserción de imágenes, todo con botones.
- **3 modos de lectura**: vertical (desplazamiento continuo hacia abajo), lateral (desplazamiento horizontal entre páginas) y paneles (ideal para cómics, con las imágenes apiladas al estilo webtoon).
- **Colecciones de libros**: ahora puedes crear listas con tus libros favoritos. Pueden ser públicas o privadas, con portada y color propio.
- **Permisos del lector**: el autor decide qué opciones de personalización (fondo, letra, tamaño, etc.) puede usar quien lee su libro. Las opciones no permitidas simplemente no aparecen.
- **Opciones antes de leer**: al abrir un libro, primero se muestra una pantalla para configurar tu lectura según lo que el autor permitió.
- **Soporte para cómics**: los autores pueden marcar su libro como cómic y las imágenes se muestran apiladas, estilo webtoon.
- **Edición de comentarios**: ahora puedes corregir tus propios comentarios después de publicarlos.

### Corregido
- **Avance de capítulo en modos lateral y paneles**: el lector retrocedía en vez de avanzar al pasar del último slide. Ahora avanza correctamente.
- **Eliminación de registros de cuentas baneadas**: el botón "Eliminar registro" en cuentas eliminadas no avisaba si algo fallaba. Ahora muestra un mensaje de error claro.
- **Bloqueo y desbloqueo de usuarios**: se guarda correctamente quién hizo cada bloqueo y desbloqueo.
- **Colecciones**: agregar libros a una colección ya funciona sin errores.
- **Estadísticas de la página de inicio**: ya no se muestran datos incorrectos si el servidor falla al cargarlas.
- **Cuentas de prueba**: la herramienta de desarrollo ahora avisa correctamente si el inicio de sesión falla.
- **Registros de cuentas ya eliminadas**: ahora se puede eliminar el registro de una cuenta baneada que ya fue eliminada.

### Eliminado
- **Código antiguo del lector**: se eliminaron alrededor de 800 líneas de código obsoleto, haciendo la página más liviana y rápida.

## [Desarrollo 15] — 2026-08-02 — ERROR_FOX

### Corregido
- **Renovación de sesión (crítico)**: al renovar tu sesión de forma automática, la página podía fallar si el proceso se repetía. Ahora es estable y seguro.
- **Botón de favorito (crítico)**: marcar o desmarcar un favorito rápidamente ya no duplica ni desincroniza el conteo.
- **Validación al editar libros**: al guardar un libro se verifican correctamente datos como subtítulo y portada.
- **Imagen de anuncios**: la imagen de los anuncios ahora se guarda y se muestra correctamente.
- **Foros**: antes cualquier usuario podía editar respuestas de otros. Ahora solo el autor puede editar su propia respuesta (moderadores y administradores conservan acceso).
- **Imágenes dentro de capítulos**: las imágenes insertadas en el contenido de un capítulo ahora se muestran correctamente al leer.
- **Modo de lectura continua**: ya no aparecen etiquetas "Página X" confusas entre secciones, y se eliminaron los espacios enormes en blanco entre páginas.

### Documentación
- Se agregó un documento con el contexto completo del proyecto.

## [Desarrollo 14 | FoxOnAShelf] — 2026-08-01 — ERROR_FOX

### Modificado
- **Nuevo nombre del proyecto**: el sitio ahora se llama oficialmente FoxOnAShelf™. La marca se actualizó en toda la página: encabezado, inicio de sesión, lector, panel de administración y pie de página.
- **Encabezado con colores**: el nombre alterna entre azul oscuro y azul claro para verse más llamativo.
- Se conservaron las cuentas, datos y sesiones existentes de los usuarios.

### Añadido
- **Foro rediseñado → Soporte**:
  - Ahora solo existe una categoría: **Soporte**.
  - Nuevo diseño de 3 columnas: **Pendientes**, **Resueltos** y **Anuncios**.
  - **Solución colaborativa**: cualquier usuario puede marcar su respuesta como la solución del problema (solo una por hilo). La solución se fija arriba con un borde verde.
  - **Edición de soluciones**: solo el creador o un moderador/administrador puede editar el contenido de la solución.
  - **Votación** 👍/👎 en cada respuesta.
  - **Auto-desmarcación**: si una solución recibe muchos votos "no útil", se desmarca automáticamente.
  - **Historial de ediciones**: cada cambio en una solución queda registrado y es visible.
  - **Anuncios en el foro**: columna lateral con anuncios de moderadores y administradores.
  - **Publicidad intercalada**: los anuncios aparecen cada cierto número de hilos.
  - **Permisos claros**: el dueño de un hilo puede editarlo y eliminarlo, pero no cerrarlo ni borrar respuestas; moderadores y administradores pueden todo.
  - Búsqueda y paginación en cada columna.
- **Moderación de imágenes de usuarios**:
  - Nueva sección "Imágenes de usuarios" en el Panel de Moderación con la galería de todas las imágenes subidas.
  - Búsqueda por nombre de usuario o correo.
  - Los moderadores pueden marcar imágenes en revisión.
  - Las imágenes en revisión aparecen con marca "EN REVISIÓN" y no pueden usarse hasta ser aprobadas.

## [Desarrollo 13] — 2026-07-31 — ERROR_FOX

### Añadido
- **Barra de progreso de lectura**: las tarjetas de libros ahora muestran cuánto has avanzado en la lectura.
- **Sistema de foros completo**:
  - 3 páginas: inicio con categorías, lista de hilos por categoría y detalle del hilo con respuestas.
  - 6 categorías: General, Discusión de Libros, Recomendaciones, Escritura y Creatividad, Ayuda y Soporte, Off-Topic.
  - Crear, editar y eliminar hilos y respuestas.
  - Reacciones con emojis (👍❤️😂😮😢🔥).
  - Búsqueda de hilos, estadísticas y paginación.
  - Los administradores pueden fijar y cerrar hilos.
- **Resaltados y notas**:
  - Marca texto en el lector con 5 colores (amarillo, verde, azul, rosa, naranja).
  - Agrega notas personales a cada resaltado.
  - Panel lateral con todos tus resaltados del libro, con búsqueda y filtros.
  - Copia tus resaltados al portapapeles.
- **Inicio de sesión renovado**: login y registro lado a lado en escritorio, pestañas en móvil, con mensaje de bienvenida y mejores efectos visuales.
- **Fondo de textura**: foros, novedades y anuncios ahora tienen un fondo de papel sutil.
- **Rendimiento mejorado**: las páginas pesadas cargan más rápido y la búsqueda de libros es más eficiente.

### Corregido
- **Modo de lectura**: ya no se mostraban páginas vacías al abrir un capítulo.
- **Marcadores**: la posición de lectura se restaura correctamente al volver a abrir un capítulo; el marcador en modo de páginas guardaba la posición equivocada.
- **Foro**: se corrigieron más de 20 fallos de coordinación entre las distintas vistas.
- **Panel de resaltados**: los datos se cargaban incorrectamente y ahora se muestran bien.
- **Estadísticas del foro**: se mostraban datos equivocados y ahora son correctos.

### Eliminado
- Código sin usar y ajustes visuales que afectaban la accesibilidad.

### Notas
- Toda la plataforma ahora está en español.
- Se hicieron revisiones completas del código, corrigiendo 30+ fallos de coordinación.

## [Intermedio 12/13] — 2026-07-30 — ERROR_FOX

### Notas
- BookShelf deja de ser un proyecto escolar y ahora es un proyecto personal.

### Añadido
- **Aviso cuando el servidor está apagado**: si la base de datos no responde, aparece un aviso fijo en la parte superior con la hora de la última comprobación.

### Cambios
- **Equipo actualizado**: el proyecto ahora es desarrollado únicamente por ERROR_FOX.
- **Correo del moderador**: la cuenta de moderador cambió a un correo nuevo; sus publicaciones se conservaron.

### Eliminado
- **Perfiles y cuentas que ya no forman parte del proyecto**: se retiraron las cuentas y fotos de los miembros anteriores.

### Traducción a español
- **Módulo Anuncios**: la sección de anuncios ahora se llama `/anuncios` en el sitio y su administración usa nombres en español.
- **Módulo Equipo**: la página del equipo ahora se llama `/equipo` y los perfiles usan nombres en español.

## [Desarrollo/Parche 12.A] — 2026-07-21 — ERROR_FOX

### Corregido
- **Archivo de datos expuesto**: la base de datos local podía ser descargada directamente desde el navegador. Ahora está bloqueado.
- **Chat se crasheaba al iniciar**: si faltaba alguna configuración del servidor, la aplicación entera dejaba de funcionar. Ahora funciona de forma degradada.
- **Anuncios desaparecían al borrar un usuario**: al eliminar una cuenta, todos sus anuncios desaparecían de la vista. Ya no ocurre.
- **Equipo: botón de mover perfil no funcionaba**: al intentar reordenar los perfiles del equipo, el cambio no se guardaba correctamente.
- **Permisos de moderador ignorados**: los moderadores no tenían acceso a ciertas funciones que les correspondían.
- **Texto roto en el pie de página**: en ciertos casos se mostraba "undefined — undefined" en el footer.
- **Imágenes no se liberaban de memoria**: las imágenes de anuncios acumulaban memoria sin liberarla.
- **Colores incorrectos en modo oscuro**: algunos elementos mostraban color blanco fijo en vez de adaptarse al tema.
- **Código obsoleto eliminado**: se limpiaron archivos, funciones y referencias que ya no se usaban.

### Notas
- Revisión general del código fuente. Se corrigieron problemas de seguridad, bugs y código obsoleto.

## [Desarrollo - 12 Parte 2] — 2026-07-21 — ERROR_FOX

### Añadido
- **Layout de Home reestructurado**: contenido principal a la izquierda, panel de anuncios compactos a la derecha con espacio reservado para publicidad.
- **Libros destacados como hero principal**: al entrar al dashboard, lo primero que se ve son los libros destacados en un recuadro centrado con el logo BookShelf™ y descripción.
- **Barra "Explorar más libros"**: botón de ancho completo al fondo del recuadro de destacados, con ícono de lupa, que lleva a /explore.
- **Stats en la parte superior**: Autores, Publicados y Vistas ahora aparecen arriba de todo en el Home, en 3 columnas compactas.
- **Ordenamiento de anuncios**: los anuncios destacados siempre aparecen primero, seguidos del anuncio de admin más reciente, luego por fecha. Sidebar ampliado a 9 anuncios con espacios de publicidad cada 3.
- **Estilos dorados**: anuncios de admin y destacados tienen borde y fondo dorado tanto en modo claro como oscuro.
- **Preview antes de publicar**: botón "Ver preview" en el formulario de creación de anuncios para previsualizar cómo se verá antes de publicar.
- **Mejoras estéticas en Explorar**: pestañas con iconos, contador de resultados, estados vacíos con iconos, skeleton de carga mejorado.
- **Cuentas de prueba rápidas**: botones flotantes al lado del chat para cambiar entre cuentas de test (solo visible en desarrollo).
- **Tarjetas de libros uniformes**: todas las tarjetas mantienen la misma altura independientemente de la descripción.
- **Público objetivo mejor visible**: el público al que va dirigido cada libro aparece en una línea separada, debajo de autor y categoría.

## [Desarrollo - 12 Parte 1] — 2026-07-18 — ERROR_FOX

### Notas
- BookShelf fue presentada en un breve evento del "Programa Nivelatorio con Aporte de Empleados" de la Universidad de EAFIT.

### Añadido
- **Página de inicio de sesión/registro dual**: nueva vista que muestra login y registro lado a lado. La card activa se agranda e ilumina al pasar el mouse; la otra se oscurece y reduce.
- **Estética glassmorphism**: efecto de cristal esmerilado en las cards de autenticación.
- **Fondo animado**: orbes de gradiente flotantes y partículas ascendentes con CSS puro.
- **Inputs flotantes**: labels que se animan hacia arriba al enfocar el campo, con línea de acento que se expande.
- **Efecto glow**: borde luminoso animado en la card activa usando gradientes de color.
- **Easter eggs personalizables**: sección de administración para gestionar nombres exclusivos, mensajes y emojis. La comparación no distingue mayúsculas y acepta variaciones.
- **Responsive**: diseño adaptado para móvil (cards apiladas verticalmente).

### Corregido
- **Ortografía en comentarios**: signo de apertura `¿` restaurado en la confirmación de eliminar comentario.
- **Traducción incompleta**: textos "No chapters available" y "Contents" traducidos al español en el modo de lectura.

## [Desarrollo/Parche 11.A] — 2026-06-16 — equipo BookShelf

### Añadido
- **Chat del equipo**: nuevo botón flotante 💬 disponible para usuarios registrados. Los mensajes se actualizan automáticamente y son visibles para todo el equipo.
- **Imágenes en la nube**: las fotos y archivos ahora se guardan en la nube en vez del disco local, visibles desde cualquier dispositivo.

### Corregido
- **Inicio de sesión**: ya no distingue mayúsculas ni minúsculas en el correo electrónico.

### Eliminado
- **Página pública de GitHub**: el sitio ya no está disponible en línea. El proyecto corre exclusivamente en local.
- Archivos temporales y scripts del túnel que ya no se usan.

## [Desarrollo - 11] — 2026-06-14 — equipo BookShelf

### Añadido
- **Perfiles del equipo**: nueva página "Nuestro Equipo" con tarjetas de los 3 miembros del proyecto, cada una con foto, nombre, edad, contacto e información. Accesible desde el enlace en el pie de página.
- **Edición de perfiles**: los administradores pueden modificar la información y foto de cada perfil directamente desde la página.
- **Fotos reales**: añadidas las imágenes de perfil de cada miembro (ERROR_FOX).
- **Cargo del equipo**: nuevo campo "Cargo" debajo del nombre, editable desde administración, con color dorado.
- **Título editable**: el título "Nuestro Equipo" puede editarse desde el panel admin.
- **Correo admin**: cada perfil muestra el correo del administrador correspondiente, editable.
- **Fondo de pantalla**: la página del equipo ahora tiene el fondo principal del sitio.
- **Reordenar perfiles**: botones ← → para reordenar las tarjetas del equipo.

### Corregido
- **Guardar perfil**: se corrigió un error que impedía guardar los cambios al editar un perfil del equipo.

### Modificado
- **Fotos más grandes**: las imágenes de perfil aumentaron a 192px con borde dorado.
- **Tarjetas más largas**: ajuste visual para mejor presentación vertical.

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

## [Desarrollo - 5] — 2026-06-04 — ERROR_FOX

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
Pagina creada

### Notas
Gracias a nuestro profesor, que nos prestó Claude para tener un molde perfecto para continuar con nuestro proyecto.
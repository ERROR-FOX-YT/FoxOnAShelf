# CHANGELOG — FoxOnAShelf™

Todas las fechas en formato YYYY-MM-DD.

## [Desarrollo 14 | FoxOnAShelf] — 2026-08-01 — ERROR_FOX

### Modificado
- **Renombrado de BookShelf a FoxOnAShelf**: el proyecto pasa a llamarse oficialmente FoxOnAShelf™
  - Marca visible actualizada: header, login, lector (ediciones digitales), panel admin, piezas del sitio
  - `index.html`: título y meta description actualizados a FoxOnAShelf™
  - Backend: nombre de servicio, mensajes de arranque, comentarios y nombres de paquete (`foxonashelf-backend`, `foxonashelf-frontend`)
  - Se conservan los emails `*@bookshelf.app` (cuentas reales en BD), el bucket de Supabase `bookshelf` (almacenamiento en uso) y las claves `localStorage` existentes para no romper sesiones y datos
- **Header con nombre alternado por colores**: "Fox" y "A" en azul oscuro (`foxBlue`), "On" y "Shelf" en azul claro (`foxBlueLight`)
- **Clases CSS renombradas**: `bookshelfBrown` → `foxBrown`, `bookshelfAccent` → `foxAccent` en tailwind.config.js, index.css y todos los componentes (25 archivos JSX)

### Añadido
- **Rediseño completo del foro → Soporte**:
  - Eliminadas las 6 categorías del foro. Ahora solo existe una categoría: **Soporte**
  - Nuevo layout de 3 columnas: **Pendientes** (izquierda), **Resueltos** (centro), **Anuncios** (derecha)
  - **Solución colaborativa**: cualquier usuario puede marcar su respuesta como solución (solo 1 por hilo); los mods/admins también. La solución se fija arriba con borde verde
  - **Edición de solución**: solo el creador o un mod/admin puede editar el contenido de la solución
  - **Votación** 👍/👎 en cada respuesta; se reinicia al editar la solución
  - **Auto-desmarcación**: si una solución recibe 80% votos "no útil" con 10+ votos, se desmarca automáticamente
  - **Historial de ediciones** de la solución: cada edición queda registrada y es visible con un desplegable
  - **Anuncios del foro**: columna derecha más pequeña que muestra anuncios de mods/admins
  - **Publicidad intercalada**: cada N hilos en pendientes/resueltos; si la columna está vacía, el anuncio se muestra primero
  - **Permisos visuales**: owner puede editar/eliminar su hilo pero NO cerrarlo ni borrar subcomentarios; mod/admin puede todo; soluciones de mod/admin llevan tag azul y color de fondo especial
  - Búsqueda por título/contenido dentro del hilo
  - Paginación por columna independiente
- **ForoHilo.jsx reescrito**: solución fijada arriba, votación, historial desplegable, permisos mod/admin visibles
- **`_redirects`** para Cloudflare Pages SPA routing
- **Moderación de imágenes de usuarios**:
  - Nueva sección "Imágenes de usuarios" en Panel de Moderación con galería de todas las imágenes subidas
  - Búsqueda por nombre de usuario o correo electrónico
  - Botón para moderar imágenes (solo mods/admins)
  - Pestaña "Moderadas" con contador de imágenes pendientes de revisión
  - Imágenes moderadas aparecen con badge "EN REVISIÓN" y efecto grayscale
  - Usuario no puede usar, renombrar ni eliminar imágenes moderadas
  - Mensaje informativo en la biblioteca del usuario cuando su imagen está en revisión
- **MediaLibrary.jsx actualizado**: badge "moderada" con estilo rojo, botones deshabilitados para imágenes en revisión

## [Desarrollo 13] — 2026-07-31 — ERROR_FOX

### Añadido
- **Barra de progreso de lectura** (`ReadingProgress.jsx`): nuevo componente que muestra una barra animada del porcentaje de lectura en las tarjetas de libro.
- **Sistema de foros completo** (`/foros`):
  - 3 páginas: Foros.jsx (inicio con categorías), ForoCategoria.jsx (hilos), ForoHilo.jsx (detalle con respuestas)
  - 6 categorías predeterminadas: General, Discusión de Libros, Recomendaciones, Escritura y Creatividad, Ayuda y Soporte, Off-Topic
  - CRUD completo: crear/editar/eliminar hilos, crear/editar/eliminar respuestas
  - Reacciones con emojis (👍❤️😂😮😢🔥)
  - Búsqueda de hilos por título/contenido
  - Estadísticas del foro
  - Paginación en todas las vistas
  - Control de hilos: fijar (admin), cerrar (admin)
- **Sistema de highlights/notas** (`/api/destacados`):
  - Marcar texto en el lector con 5 colores (amarillo, verde, azul, rosa, naranja)
  - Agregar notas personales a cada highlight
  - Panel lateral deslizante con todos los highlights del libro
  - Búsqueda y filtrado de highlights
  - Exportar highlights copiados al portapapeles
  - Botón 🎯 en el header del lector
- **Diseño de login renovado** (`DualAuth.jsx`):
  - Vista dual: login a la izquierda, registro a la derecha en desktop
  - Pestañas en móvil para alternar entre login/registro
  - Mensaje de bienvenida "Únete a la comunidad lectora"
  - Efectos visuales mejorados: gradientes, sombras, focus rings
- **Fondo de textura en más páginas**: Foros, ForoCategoria, ForoHilo, Changelog, Anuncios ahora tienen fondo de papel sutil (`.page-bg`)
- **Lazy loading de páginas pesadas**: Admin, AdminModeration, ForoHilo, BookEdit, MediaLibrary ahora se cargan bajo demanda (chunks separados)
- **Debounce en búsqueda de Explorar**: 300ms de delay para evitar llamadas API excesivas
- **Memoización de BookCard**: componente envuelto en `React.memo` para evitar re-renders innecesarios
- **Migraciones de base de datos**:
  - `007_crear_foros.sql`: tablas foro_categorias, foro_hilos, foro_respuestas, foro_reacciones
  - `008_crear_destacados_notas.sql`: tabla destacados para highlights del lector
  - `001_reiniciar_vistas.sql`: script para reiniciar contadores de vistas manteniendo datos relevantes

### Corregido
- **Bug de contenido vacío en modo páginas**: `chapter.content` vs `chapter.contenido` — el reader mostraba páginas vacías porque usaba el nombre de campo en inglés
- **Bug de restauración de scroll**: la posición de scroll no se restauraba al reabrir un capítulo desde el marcador
- **Bug de marcador en modo páginas**: siempre guardaba `scrollTop=0` porque el modo páginas no usa scroll; ahora guarda `currentSpread`
- **Bug de traducción foro**: nombres de campo no coordinados entre backend y frontend (20 issues encontrados y corregidos)
- **Bug de HighlightsPanel**: datos no se cargaban porque el backend agrupa por capítulo y el frontend esperaba array plano
- **Bug de import en Reader.jsx**: `HighlightsPanel` es default export, no named export
- **Bug de paginación en foro**: parámetro `?pagina=` no coincidía con `req.query.page`
- **Bug de UUID en ForoCategoria**: `parseInt()` en un UUID retornaba NaN
- **Bug de estadísticas en Foros.jsx**: respuesta anidada no se desempaquetaba correctamente

### Eliminado
- **Imports no usados**: `useToast` en Foros.jsx, `useMemo` en DualAuth.jsx, `HighlightsToggle` en ReadingMode.jsx
- **Estilos de accesibilidad**: `:focus-visible` para navegación por teclado, `prefers-reduced-motion` para usuarios con sensibilidad al movimiento.
- **Animación de entrada suave**: fade-in en el contenido principal de cada página.
- **Estilos de pestañas mejorados**: Explorar usa pestañas con mejor contraste y estado activo.
- **Estilos de tarjetas mejorados**: mejor hover effect, z-index dinámico, y transiciones suaves.

### Notas
- **Traducción global completa**: toda la aplicación (backend, frontend, base de datos, estados) ahora usa español.
- **Revisión de código exhaustiva**: se hicieron 3 revisiones completas del código, encontrando y corrigiendo 30+ bugs de coordinación entre backend y frontend.
- **Sistema de foros**: plataforma completa de discusión con categorías, hilos, respuestas y reacciones.
- **Sistema de highlights/notas**: marcadores de texto y notas personales en el lector.
- **Diseño de login renovado**: vista dual lado a lado en escritorio, pestañas en móvil.
- **Optimización de rendimiento**: lazy loading, debounce, memoización.
- **Investigación**: análisis de plataformas innovadoras (Sinai.ai, Chaptera, Folio, Booky, SocialBook).

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
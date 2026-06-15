# BookShelf™ — Frontend

React 18 + Vite + Tailwind + anime.js + react-router-dom.

## Ejecutar

```bash
cd frontend
npm install
npm run dev
```

Por defecto: `http://localhost:3100` (proxy de `/api` y `/storage` a `http://localhost:4000`).

## Estructura

```
src/
├─ api/client.js              Wrapper fetch + mini-redirecciones 400/500 (nunca lanza)
├─ components/
│  ├─ animations/animations.js  Anime.js helpers
│  ├─ BookCard.jsx              Tarjeta de libro (con capitalización de categorías)
│  ├─ BookList.jsx              Lista de libros
│  ├─ Comments.jsx              Sección de comentarios (con eliminación)
│  ├─ Editor.jsx                Editor de libro (capítulos + metadatos + categorías dinámicas)
│  ├─ FavoritesButton.jsx       Botón de favoritos
│  ├─ FiltersPanel.jsx          Panel de filtros (categorías desde API)
│  ├─ Footer.jsx                Footer con info de contacto
│  ├─ Header.jsx                Navegación principal
│  ├─ ImageManager.jsx          Gestor de imágenes de usuario (subir/renombrar/reordenar/eliminar/insertar @img:nombre)
│  ├─ RatingStars.jsx           Calificación por estrellas
│  ├─ Reader.jsx                Lector de capítulos (preferencias, crop modal)
│  ├─ ReadingMode.jsx           Modal de lectura a pantalla completa (portal, teclas, scroll, @img:nombre, barra progreso)
│  └─ readerConstants.js        Constantes compartidas (temas, fuentes, anchos)
├─ context/
│  ├─ AuthContext.jsx           Auth + roles (isAdmin, isModerator)
│  ├─ ToastContext.jsx          Sistema de notificaciones toast (z-50)
│  └─ ThemeContext.jsx          Tema claro/oscuro
├─ pages/
│  ├─ Home.jsx                  Página principal (anuncios destacados, métricas, top libros)
│  ├─ Explore.jsx               Explorar libros (filtros + búsqueda)
│  ├─ Book.jsx                  Detalle del libro (timer de 10s para vistas, bookmark)
│  ├─ BookEdit.jsx              Editar libro (usa Editor)
│  ├─ Author.jsx                Perfil de autor
│  ├─ Collection.jsx            Colección de libros
│  ├─ Announcements.jsx         Tablón de anuncios (featured + latest + colapsable)
│  ├─ Login.jsx                 Inicio de sesión (con apelación)
│  ├─ Register.jsx              Registro
│  ├─ Profile.jsx               Perfil de usuario (marcadores, libros propios)
│  ├─ Admin.jsx                 Panel BookShelf (categorías, anuncios, moderadores, métricas)
│  ├─ AdminModeration.jsx       Panel de moderación (tabla usuarios, filtros, baneo inline, historial baneos, cuentas eliminadas, export CSV)
│  ├─ MediaLibrary.jsx          Biblioteca de imágenes de usuario (@img:nombre, upload, rename, reorder, delete)
│  └─ ErrorPages.jsx            Páginas de error (400, 404, 500)
├─ hooks/
│  └─ useLockedBody.js          Hook que bloquea interacción del body (usado en easter egg)
└─ styles/index.css             Tailwind + variables del tema + scrollbar reading mode
```

## Reading mode

- Modal de lectura a pantalla completa vía `createPortal` (z-40).
- Atajos de teclado: `←`/`→` capítulos, `Esc` salir, `P` preferencias.
- Barra de progreso vertical con `position: sticky`, actualizada por listener `scroll` nativo.
- Parseo de `@img:nombre` y `![alt](url)` en el contenido: las imágenes referenciadas se resuelven via `/api/user-images/resolve/:authorId/:name`.
- Scrollbar estilizado con variables CSS `--sb-thumb`.
- Preferencias persistentes en `localStorage` (tema, fuente, tamaño, ancho, interlineado, imagen de fondo).
- Recorte interactivo de imagen de fondo con CropModal (presets 16:9, 4:3, 1:1, 9:16).
- Bookmark manual (persiste progreso + muestra toast, separado del auto-save).

## Imágenes de usuario (@img:nombre)

- Las imágenes se guardan por cuenta (`user_id`) y están disponibles para cualquier libro del autor.
- Cada imagen tiene un nombre custom único por usuario: solo letras, números y `-_,.!?¿¡<>` (máx 60 caracteres). Sin espacios, sin `ñ`.
- La referencia en contenido usa `@img:nombre_custom`.
- Si una imagen no se referencia en ningún capítulo del usuario, se marca como "en desuso" (no se borra automáticamente).
- Desde el Editor, el ImageManager permite seleccionar un capítulo para insertar `@img:nombre` en la posición exacta del cursor.
- Página `/library` (MediaLibrary) para gestionar todas las imágenes: subir, renombrar, reordenar, eliminar, ver estado de uso.

## Tema claro / oscuro

- Claro:  fondo `#F5E9D4` (pergamino), texto `#1F2937`.
- Oscuro: fondo `#2B2F33` (grisáceo), texto `#E6E7E8`.
- Se persiste en `localStorage` (`bookshelf.theme`).

## Convenciones

- **API client**: nunca lanza excepciones. Siempre revisar `r.__error` tras una llamada.
- **Capitalización**: las categorías se muestran capitalizadas (primera letra mayúscula)
  pero se almacenan en minúsculas.
- **Vistas**: se cuentan tras 10 segundos en la página del libro. Admin puede reiniciarlas.
- **Anuncios**: destacados con fondo degradado dorado (admin) o simple (moderador).
  El anuncio más reciente no destacado siempre visible.

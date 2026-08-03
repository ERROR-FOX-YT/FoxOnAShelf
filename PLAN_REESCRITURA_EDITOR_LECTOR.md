# PLAN: Reescritura del Editor y Lector de FoxOnAShelf

> **Fecha**: 2026-08-02
> **Estado**: Pendiente de implementación
> **Autor del plan**: ERROR_FOX (via opencode)
> **Rama**: `desarrollo-15` (commits futuros)

---

## Resumen Ejecutivo

Reemplazar el editor actual (textarea + `<!-- page -->`) por un editor WYSIWYG tipo Google Docs usando **TipTap**, eliminar el modo de lectura por páginas/libro, implementar 3 modos de lectura (scroll vertical, scroll lateral, paneles), sistema de colecciones, soporte para formato comic/webtoon, y un sistema donde **el autor controla qué opciones de personalización tiene el lector**.

### Decisiones de diseño (confirmadas por el usuario)
- **Editor**: Full WYSIWYG (TipTap/ProseMirror)
- **Colecciones**: Tabla separada en BD
- **Modo comic**: Se activa por tipo de libro (`novela` o `comic`)
- **Modos de lectura**: Scroll vertical + scroll lateral + paneles (3 modos)
- **Variables**: Todas las nuevas en español para evitar problemas de traducción

---

## FASE 1: Base de Datos

### Migración `011_editor_wysiwyg.sql`

#### Tabla `libros` — columnas nuevas

| Columna | Tipo | Default | Descripción |
|---------|------|---------|-------------|
| `tipo_libro` | `text` | `'novela'` | `'novela'` o `'comic'` |
| `color_fondo` | `text` | `'#FFFFFF'` | Color de fondo de la hoja del lector |
| `modo_lectura` | `text` | `'vertical'` | `'vertical'`, `'lateral'` o `'paneles'` |
| `permisos_lector` | `jsonb` | Ver abajo | Qué puede cambiar el lector |

#### Estructura de `permisos_lector` (jsonb)

```json
{
  "permitir_cambiar_fondo": true,
  "permitir_cambiar_tipografia": true,
  "permitir_cambiar_tamano": true,
  "permitir_cambiar_interlineado": true,
  "permitir_cambiar_ancho": true,
  "permitir_cambiar_color_hoja": true,
  "imagen_fondo_prestablecida": null,
  "tipografia_por_defecto": "serif",
  "tamano_por_defecto": 18,
  "fondo_por_defecto": "parchment",
  "nota_comic": "Este libro es ilustrado. La tipografía no aplica al contenido visual."
}
```

#### Tabla `colecciones` — columnas nuevas

| Columna | Tipo | Default | Descripción |
|---------|------|---------|-------------|
| `url_portada` | `text` | `null` | Portada de la colección |
| `color` | `text` | `'#7B4B27'` | Color temático de la colección |

#### Tabla `capitulos` — sin cambios de schema

El contenido se guarda como JSON string (TipTap) en `contenido`. Backward compatibility: si `contenido` empieza con `{` se parsea como TipTap JSON, si no se trata como texto plano.

---

## FASE 2: Backend

### 2.1 `backend/src/routes/colecciones.js` (NUEVO)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/` | none | Listar colecciones públicas |
| `GET` | `/:id` | none | Detalle + libros ordenados |
| `POST` | `/` | auth | Crear colección |
| `PUT` | `/:id` | ownerOrAdmin | Actualizar colección |
| `DELETE` | `/:id` | ownerOrAdmin | Eliminar colección |
| `POST` | `/:id/libros` | ownerOrAdmin | Agregar libro |
| `DELETE` | `/:id/libros/:libroId` | ownerOrAdmin | Quitar libro |
| `PUT` | `/:id/reordenar` | ownerOrAdmin | Reordenar libros |

### 2.2 Actualizar `backend/src/routes/books.js`

- `POST /` y `PUT /:id` — aceptar `tipo_libro`, `color_fondo`, `modo_lectura`, `permisos_lector`
- `GET /:id` — devolver campos nuevos + info de colección

### 2.3 DB functions en `backend/src/db/index.js`

- CRUD colecciones (`crearColeccion`, `obtenerColeccion`, `actualizarColeccion`, `eliminarColeccion`, `agregarLibroColeccion`, `quitarLibroColeccion`, `reordenarLibrosColeccion`, `listarColecciones`)
- Actualizar `crearLibro`, `obtenerLibro`, `actualizarLibro` con campos nuevos

### 2.4 `backend/src/server.js`

- Registrar `app.use('/api/colecciones', coleccionesRouter)`

### 2.5 `backend/src/services/conversion.js`

- Adaptar para generar contenido TipTap JSON en vez de texto plano con `<!-- page -->`

---

## FASE 3: Editor WYSIWYG

### 3.1 Dependencias nuevas (npm install)

```
@tiptap/react
@tiptap/starter-kit
@tiptap/extension-image
@tiptap/extension-text-align
@tiptap/extension-color
@tiptap/extension-text-style
@tiptap/extension-underline
@tiptap/extension-placeholder
@tiptap/extension-horizontal-rule
@tiptap/extension-dropcursor
@tiptap/extension-highlight
```

### 3.2 `EditorWYSIWYG.jsx` (NUEVO)

Estructura del componente:

```
┌──────────────────────────────────────────────────┐
│  METADATOS DEL LIBRO (card)                      │
│  [Título] [Subtítulo] [Descripción]              │
│  [Categoría] [Grupo edad] [Tipo: Novela/Comic]   │
│  [Modo lectura: vertical/lateral/paneles]         │
│  [Color de fondo] [Portada]                       │
├──────────────────────────────────────────────────┤
│  PERMISOS DEL LECTOR (card)                      │
│  ☑ Permitir cambiar fondo                        │
│  ☑ Permitir cambiar tipografía  [Serif por def.] │
│  ☑ Permitir cambiar tamaño     [M por defecto]   │
│  ☐ Permitir cambiar interlineado                  │
│  ☑ Permitir cambiar ancho                         │
│  ☑ Permitir cambiar color de hoja                 │
│  [Imagen de fondo prestablecida]                  │
│  [Nota para comic (solo si tipo=comic)]           │
├──────────────────────────────────────────────────┤
│  CAPÍTULOS (tabs o acordeón)                      │
│  [Cap 1] [Cap 2] [+ Nuevo]                       │
├──────────────────────────────────────────────────┤
│  TOOLBAR (sticky)                                 │
│  [Fuente▼] [Tamaño▼] | [B] [I] [U] [S]          │
│  [H1] [H2] [H3] [Párrafo] | [◄] [■] [►] [𝐽]   │
│  [Color] [Fondo] | [Lista] [Lista num]            │
│  [Img] [Separador] | [Deshacer] [Rehacer]         │
├──────────────────────────────────────────────────┤
│  CANVAS EDITABLE (centrado, fondo configurable)   │
│  ┌────────────────────────────┐                   │
│  │  TipTap EditorContent      │                   │
│  │  (contenido del capítulo)  │                   │
│  └────────────────────────────┘                   │
│  [Guardar] [Publicar] [Vista previa]              │
└──────────────────────────────────────────────────┘
```

### 3.3 `ModalImagenes.jsx` (NUEVO)

- Galería del usuario (`GET /api/imagenes-usuario`)
- Al seleccionar → inserta `<img>` en posición del cursor
- Botón "Insertar como fondo" → imagen con opacidad detrás del texto
- Solo imágenes del usuario, no externas

### 3.4 `PanelComic.jsx` (NUEVO)

- Visible solo cuando `tipo_libro === 'comic'`
- Canvas 800px ancho (estándar webtoon)
- Cada bloque = imagen a ancho completo
- Drag & drop para reordenar
- Gutter spacing configurable entre paneles

---

## FASE 4: Lector — Pre-reading con Control de Autor

### 4.1 Modelo de permisos

El autor define en el editor qué opciones están disponibles. El lector solo ve las opciones que el autor permitió.

| Si el autor pone... | El lector ve... |
|---------------------|-----------------|
| `permitir_cambiar_tipografia: false` | Solo la tipografía por defecto, sin botones para cambiar |
| `tipografia_por_defecto: "mono"` | Mono seleccionada, no puede cambiar |
| `permitir_cambiar_tipografia: true` | Todos los botones de tipografía habilitados |
| `imagen_fondo_prestablecida: "url..."` | Imagen de fondo ya aplicada, puede quitarla si `permitir_cambiar_fondo: true` |

### 4.2 `Reader.jsx` — Pre-reading reescrito

```
┌──────────────────────────────────────────────┐
│  CAPÍTULOS (strip horizontal)                │
│  [Cap 1] [Cap 2] [Cap 3] [+ Cont.]          │
├──────────────────────────────────────────────┤
│  PERSONALIZACIÓN DE LECTURA                  │
│                                              │
│  Fondo de ventana:    [■][■][■][■][■]        │  ← Solo si permitir_cambiar_fondo
│  Imagen de fondo:     [Seleccionar imagen]   │  ← Si imagen_prestablecida → mostrar preview
│  Color de la hoja:    [■][■][■][■][■]        │  ← Solo si permitir_cambiar_color_hoja
│                                              │
│  Tipografía:  [Serif] [Sans] [Mono]          │  ← Solo si permitir_cambiar_tipografia
│  (Nota: Este libro es ilustrado...)          │  ← Solo si tipo=comic
│                                              │
│  Tamaño:      [XS] [S] [M] [L] [XL]         │  ← Solo si permitir_cambiar_tamano
│  Interlineado:[Compacto][Normal][Amplio]     │  ← Solo si permitir_cambiar_interlineado
│  Ancho:       [Estrecho][Medio][Ancho]       │  ← Solo si permitir_cambiar_ancho
│                                              │
├──────────────────────────────────────────────┤
│  VISTA PREVIA EN TIEMPO REAL                 │
│  ┌──────────────────────────────────┐        │
│  │  Fondo: [color/imagen del autor] │        │
│  │  ┌──────────────────────────┐    │        │
│  │  │ Capítulo 1 — Título      │    │        │
│  │  │ Lorem ipsum dolor sit... │    │        │
│  │  └──────────────────────────┘    │        │
│  └──────────────────────────────────┘        │
├──────────────────────────────────────────────┤
│  [▶ Empezar a leer]  [✓ Terminado]  [← Volver]│
└──────────────────────────────────────────────┘
```

### 4.3 Lógica de visibilidad

```javascript
function opcionesDisponibles(book) {
  const perm = book.permisos_lector || {};
  return {
    fondo: perm.permitir_cambiar_fondo !== false,
    tipografia: perm.permitir_cambiar_tipografia !== false,
    tamano: perm.permitir_cambiar_tamano !== false,
    interlineado: perm.permitir_cambiar_interlineado !== false,
    ancho: perm.permitir_cambiar_ancho !== false,
    colorHoja: perm.permitir_cambiar_color_hoja !== false,
    imagenPrestablecida: perm.imagen_fondo_prestablecida || null,
    tipografiaDefecto: perm.tipografia_por_defecto || 'serif',
    tamanoDefecto: perm.tamano_por_defecto || 18,
    fondoDefecto: perm.fondo_por_defecto || 'parchment',
    notaComic: book.tipo_libro === 'comic'
      ? (perm.nota_comic || 'Este libro es ilustrado. La tipografía no aplica al contenido visual.')
      : null,
  };
}
```

### 4.4 Funciones innovadoras (inspiradas en plataformas)

| Función | Fuente | Descripción |
|---------|--------|-------------|
| Selector de color con cuadrados | Wattpad | Click en cuadrado de color = cambio instantáneo |
| Vista previa en tiempo real | Kindle | La vista previa se actualiza al cambiar opciones |
| Auto-scroll con velocidad | Wattpad | Modo lectura lateral: velocidad ajustable (tortuga 🐢 → conejo 🐇) |
| Per-series settings | Tachiyomi | Las preferencias se guardan por libro en localStorage |
| Strip author formatting | Royal Road | Toggle "usar formato del autor" / "mi formato" |
| OLED Black theme | Royal Road | Tema negro puro para pantallas OLED |
| Open Dyslexic font | Royal Road | Fuente accesible para dislexia |
| Guided View para comics | ComiXology | Modo panel-by-panel con transiciones suaves |
| Gutter spacing como ritmo | Webtoon | Espacio vertical = pacing (200px beat, 600px scene change, 1500px time skip) |

---

## FASE 5: Lector — Modos de Lectura (ReadingMode.jsx reescrito)

### 5.1 Código a eliminar completamente

- `pairPages()` — ya no hay modo book
- `splitIntoPages()` — ya no se usa `<!-- page -->`
- `buildDisplayPages()` — ya no se generan páginas sintéticas
- `pageTextToHTML()` — se reemplaza por renderizado de HTML de TipTap
- CoverPage, TitlePage, TOCPage, PageContent — componentes eliminados
- Toda la lógica de page-flip animation (~200 líneas)
- OUTERS de readerConstants.js
- Preferencia `pageMode`
- CropModal de Reader.jsx
- Referencias a `<!-- page -->` markers

### 5.2 Modo Vertical (novelas)

- Scroll continuo hacia abajo
- Contenido TipTap renderizado como HTML
- Barra de progreso sticky
- Fondo: color del autor (default) o imagen del lector si permitido

### 5.3 Modo Lateral (manga/novela visual)

- Scroll horizontal, un bloque a la vez
- Flechas o swipe para navegar
- Auto-scroll con slider de velocidad (tortuga → conejo)
- Indicador de página actual

### 5.4 Modo Paneles (comic/webtoon)

- Imágenes a ancho completo apiladas verticalmente
- Gutter spacing configurable por el autor (ritmo visual)
- Modo "Guided View" (panel-by-panel con zoom) para lectura en celular
- Indicador de progreso por panel

### 5.5 `readerConstants.js` actualizado

- Eliminar `OUTERS`
- Mantener `THEMES`, `FONTS`, `WIDTHS`, `FONT_SIZES`, `LINE_HEIGHTS`
- Agregar `GUTTER_SPACING`: `{ beat: 200, escena: 600, salto: 1500 }` (px)
- Agregar fuente `dyslexic`: `{ label: 'Dyslexic', stack: 'Open Dyslexic, sans-serif' }`

---

## FASE 6: Colecciones

### 6.1 `Collection.jsx` (REESCRIBIR)

- Vista de colección con portada, descripción, color
- Grid de libros ordenados
- Drag & drop para reordenar (autor)
- Botón crear/editar colección

### 6.2 `Profile.jsx` (ACTUALIZAR)

- Sección "Mis colecciones"
- Crear colección, agregar/quitar libros

### 6.3 `Explore.jsx` (ACTUALIZAR)

- Sección/filtro de colecciones públicas
- Cards con portada y color

---

## FASE 7: Archivos Nuevos y Modificados

### Archivos NUEVOS (6)

| # | Archivo | Descripción |
|---|---------|-------------|
| 1 | `database/migrations/011_editor_wysiwyg.sql` | Columnas libros + colecciones |
| 2 | `backend/src/routes/colecciones.js` | API CRUD colecciones |
| 3 | `frontend/src/components/EditorWYSIWYG.jsx` | Editor TipTap + toolbar |
| 4 | `frontend/src/components/ModalImagenes.jsx` | Selector de imágenes |
| 5 | `frontend/src/components/PanelComic.jsx` | Editor modo comic |
| 6 | `frontend/src/components/LectorModos.jsx` | Wrapper 3 modos lectura |

### Archivos MODIFICADOS (12)

| # | Archivo | Cambios |
|---|---------|---------|
| 1 | `backend/src/db/index.js` | CRUD colecciones + campos libros |
| 2 | `backend/src/routes/books.js` | Aceptar tipo_libro, permisos_lector |
| 3 | `backend/src/server.js` | Registrar /api/colecciones |
| 4 | `backend/src/services/conversion.js` | Generar TipTap JSON |
| 5 | `frontend/src/components/Editor.jsx` | Reemplazar por EditorWYSIWYG |
| 6 | `frontend/src/components/ImageManager.jsx` | Adaptar para TipTap |
| 7 | `frontend/src/components/ReadingMode.jsx` | Eliminar page-flip, 3 modos |
| 8 | `frontend/src/components/Reader.jsx` | Pre-reading con permisos de autor |
| 9 | `frontend/src/components/readerConstants.js` | OUTERS→GUTTER, dyslexic |
| 10 | `frontend/src/pages/Collection.jsx` | Vista completa |
| 11 | `frontend/src/pages/Profile.jsx` | Sección colecciones |
| 12 | `frontend/src/pages/Explore.jsx` | Filtro colecciones |

---

## Orden de Ejecución

1. **Migraciones de BD** (fase 1)
2. **Backend**: colecciones + actualizar books (fase 2)
3. **Instalar TipTap** + EditorWYSIWYG + ModalImagenes + PanelComic (fase 3)
4. **Reescribir Reader.jsx** con permisos de autor (fase 4)
5. **Reescribir ReadingMode** con 3 modos (fase 5)
6. **Limpiar código viejo** del editor y reader (fase 6)
7. **Colecciones frontend** (fase 7)
8. **Testing** y fix de regresiones
9. **Commit + merge a main + push**

---

## Referencias de Plataformas

| Plataforma | Lo que aportó |
|------------|---------------|
| **Kindle** | Vista previa en tiempo real, selector "Aa" universal |
| **Wattpad** | Cuadrados de color para cambio instantáneo, auto-scroll con tortuga/conejo |
| **Webtoon** | Gutter spacing como pacing, formato 800px, scroll vertical puro |
| **Royal Road** | Strip author formatting, OLED Black, Open Dyslexic, reader width control |
| **Tachiyomi** | Per-series settings, 6 modos de lectura, gesture customization |
| **ComiXology** | Guided View panel-by-panel, transiciones animadas |
| **Manga Plus** | Scroll vertical + horizontal, minimalismo |
| **Tapas** | Scroll + page toggle, soporte ambos formatos |

---

## Reglas Importantes

1. **Todas las variables, columnas BD, funciones y rutas nuevas en español**
2. **Backward compatibility**: el contenido viejo (`<!-- page -->`, `@img:`) se detecta y se trata como texto plano
3. **No romper existentes**: los libros publicados siguen funcionando hasta que el autor los edite con el nuevo editor
4. **Commit y merge a main después de cada fase completada**

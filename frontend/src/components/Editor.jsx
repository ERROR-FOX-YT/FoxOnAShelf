import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { useNavigate } from 'react-router-dom';
import EditorWYSIWYG from './EditorWYSIWYG.jsx';
import PanelComic from './PanelComic.jsx';
import ImageManager from './ImageManager.jsx';
import BookImagesPanel from './BookImagesPanel.jsx';

const PERMISOS_DEFECTO = {
  permitir_cambiar_fondo: true,
  permitir_cambiar_tipografia: true,
  permitir_cambiar_tamano: true,
  permitir_cambiar_interlineado: true,
  permitir_cambiar_ancho: true,
  permitir_cambiar_color_hoja: true,
  imagen_fondo_prestablecida: null,
  tipografia_por_defecto: 'serif',
  tamano_por_defecto: 18,
  fondo_por_defecto: 'parchment',
  nota_comic: 'Este libro es ilustrado. La tipografía no aplica al contenido visual.'
};

export default function Editor({ book, chapters: initial, onSaved, user }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [chapters, setChapters] = useState(initial || []);
  const [capActivo, setCapActivo] = useState(0);

  useEffect(() => { setChapters(initial || []); }, [initial]);

  const [meta, setMeta] = useState({
    titulo: book.titulo, subtitulo: book.subtitulo || '',
    descripcion: book.descripcion || '',
    categoria: book.categoria || 'narrativa',
    grupo_edad: book.grupo_edad || 'adulto',
    original_publico: !!book.original_publico,
    tipo_libro: book.tipo_libro || 'novela',
    color_fondo: book.color_fondo || '#FFFFFF',
    modo_lectura: book.modo_lectura || 'vertical',
  });

  const [permisos, setPermisos] = useState(() => {
    try {
      return typeof book.permisos_lector === 'string' ? JSON.parse(book.permisos_lector) : (book.permisos_lector || PERMISOS_DEFECTO);
    } catch { return PERMISOS_DEFECTO; }
  });

  useEffect(() => {
    api.get('/api/categorias').then(r => !r.__error && setCategories(r.categorias || []));
  }, []);

  async function saveAll() {
    const r1 = await api.put('/api/libros/' + book.id, {
      ...meta,
      permisos_lector: permisos
    });
    if (r1 && r1.__error) { toast.error('Error al guardar metadatos'); return false; }
    for (const c of chapters) {
      if (c._new) {
        const r = await api.post('/api/libros/' + book.id + '/capitulos', {
          titulo: c.titulo, contenido: c.contenido, orden: c.orden
        });
        if (r && r.__error) { toast.error('Error al crear capítulo: ' + (c.titulo || 'sin título')); return false; }
      } else if (c.id) {
        const r = await api.put('/api/libros/' + book.id + '/capitulos/' + c.id, {
          titulo: c.titulo, contenido: c.contenido, orden: c.orden
        });
        if (r && r.__error) { toast.error('Error al guardar capítulo: ' + (c.titulo || 'sin título')); return false; }
      }
    }
    return true;
  }

  async function saveMeta() {
    if (await saveAll()) { toast.ok('Cambios guardados'); onSaved && onSaved(); }
  }

  async function publish() {
    if (!await saveAll()) return;
    const r = await api.put('/api/libros/' + book.id, { estado: 'publicado' });
    if (r && r.__error) { setTimeout(() => navigate('/error/400'), 1200); return; }
    toast.ok('Cambios guardados y libro publicado');
    onSaved && onSaved();
  }

  async function unpublish() {
    const r = await api.put('/api/libros/' + book.id, { estado: 'borrador' });
    if (r && r.__error) return;
    toast.ok('Libro bajado a borrador');
    onSaved && onSaved();
  }

  async function confirmDelete() {
    const ok = window.confirm('¿Estás seguro de borrar este libro? No se puede deshacer.');
    if (!ok) return;
    const r = await api.del('/api/libros/' + book.id);
    if (r && r.__error) return;
    toast.ok('Libro borrado');
    navigate('/profile');
  }

  async function importFile(e) {
    const f = e.target.files[0]; if (!f) return;
    const fd = new FormData();
    fd.append('file', f);
    fd.append('original_publico', meta.original_publico ? 'true' : 'false');
    const r = await api.form('/api/libros/' + book.id + '/importar-archivo', fd);
    if (r && r.__error) { toast.error('Error al importar archivo'); return; }
    toast.ok('Archivo convertido: ' + r.capitulos_creados + ' capítulo(s)');
    onSaved && onSaved();
  }

  async function deleteChapter(index, ch) {
    if (ch._new) {
      setChapters(prev => prev.filter((_, i) => i !== index));
      return;
    }
    const ok = window.confirm('¿Borrar "' + (ch.titulo || 'Capítulo') + '"? No se puede deshacer.');
    if (!ok) return;
    const r = await api.del('/api/libros/' + book.id + '/capitulos/' + ch.id);
    if (r && r.__error) { toast.error('Error al eliminar capítulo'); return; }
    setChapters(prev => prev.filter((_, i) => i !== index));
    toast.ok('Capítulo eliminado');
  }

  function actualizarContenidoCapitulo(index, contenido) {
    setChapters(prev => {
      const next = [...prev];
      next[index] = { ...next[index], contenido };
      return next;
    });
  }

  function actualizarPanelesCapitulo(index, paneles) {
    setChapters(prev => {
      const next = [...prev];
      next[index] = { ...next[index], paneles, contenido: JSON.stringify({ tipo: 'comic', paneles }) };
      return next;
    });
  }

  const esComic = meta.tipo_libro === 'comic';

  return (
    <div className="space-y-4">
      {/* Estado */}
      <div className="card p-4 flex flex-wrap gap-3 items-center text-sm">
        {book.estado === 'borrador' ? (
          <>
            <div>Estado: <strong>Borrador</strong></div>
            <button className="btn-primary ml-auto" onClick={publish}>Publicar</button>
          </>
        ) : book.estado === 'publicado' ? (
          <>
            <div>Estado: <strong>Publicado</strong></div>
            <button className="btn-ghost ml-auto text-xs" onClick={unpublish}>Bajar a borrador</button>
          </>
        ) : (
          <div>Estado: <strong>{book.estado}</strong></div>
        )}
        {(book.autor_id === user?.id || user?.role === 'admin') && (
          <button className="btn-ghost text-xs text-red-500 border-red-200 hover:bg-red-50" onClick={confirmDelete}>Borrar libro</button>
        )}
      </div>

      {/* Metadatos */}
      <div className="card p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="flex flex-col text-sm">
          <span className="text-xs opacity-70 mb-1">Título</span>
          <input className="input" value={meta.titulo} onChange={e => setMeta({...meta, titulo: e.target.value})} />
        </label>
        <label className="flex flex-col text-sm">
          <span className="text-xs opacity-70 mb-1">Subtítulo</span>
          <input className="input" value={meta.subtitulo} onChange={e => setMeta({...meta, subtitulo: e.target.value})} />
        </label>
        <label className="flex flex-col text-sm md:col-span-2">
          <span className="text-xs opacity-70 mb-1">Descripción</span>
          <textarea className="input min-h-[80px]" value={meta.descripcion}
                    onChange={e => setMeta({...meta, descripcion: e.target.value})} />
        </label>
        <label className="flex flex-col text-sm">
          <span className="text-xs opacity-70 mb-1">Categoría</span>
          <select className="input" value={meta.categoria}
                  onChange={e => setMeta({...meta, categoria: e.target.value})}>
            <option value="en espera de categorización">En espera de categorización</option>
            {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-sm">
          <span className="text-xs opacity-70 mb-1">Grupo de edad</span>
          <select className="input" value={meta.grupo_edad}
                  onChange={e => setMeta({...meta, grupo_edad: e.target.value})}>
            {['infantil','adolescente','adulto'].map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-sm">
          <span className="text-xs opacity-70 mb-1">Tipo de libro</span>
          <select className="input" value={meta.tipo_libro}
                  onChange={e => setMeta({...meta, tipo_libro: e.target.value})}>
            <option value="novela">Novela / Texto</option>
            <option value="comic">Comic / Webtoon</option>
          </select>
        </label>
        <label className="flex flex-col text-sm">
          <span className="text-xs opacity-70 mb-1">Modo de lectura</span>
          <select className="input" value={meta.modo_lectura}
                  onChange={e => setMeta({...meta, modo_lectura: e.target.value})}>
            <option value="vertical">Scroll vertical</option>
            <option value="lateral">Scroll lateral</option>
            <option value="paneles">Paneles</option>
          </select>
        </label>
        <label className="flex flex-col text-sm">
          <span className="text-xs opacity-70 mb-1">Color de fondo de hoja</span>
          <div className="flex items-center gap-2">
            <input type="color" value={meta.color_fondo} className="w-10 h-8 rounded cursor-pointer"
                   onChange={e => setMeta({...meta, color_fondo: e.target.value})} />
            <input className="input flex-1" value={meta.color_fondo}
                   onChange={e => setMeta({...meta, color_fondo: e.target.value})} />
          </div>
        </label>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" checked={meta.original_publico}
                 onChange={e => setMeta({...meta, original_publico: e.target.checked})} />
          Permitir descarga del archivo original cuando esté publicado
        </label>
        <div className="md:col-span-2">
          <button className="btn-primary" onClick={saveMeta}>Guardar cambios</button>
        </div>
      </div>

      {/* Permisos del lector */}
      <div className="card p-4">
        <h3 className="font-serif text-lg font-bold mb-3">Opciones del lector</h3>
        <p className="text-xs opacity-60 mb-3">Controla qué puede personalizar el lector cuando abra tu libro.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={permisos.permitir_cambiar_fondo}
                   onChange={e => setPermisos({...permisos, permitir_cambiar_fondo: e.target.checked})} />
            Permitir cambiar fondo
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={permisos.permitir_cambiar_tipografia}
                   onChange={e => setPermisos({...permisos, permitir_cambiar_tipografia: e.target.checked})} />
            Permitir cambiar tipografía
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={permisos.permitir_cambiar_tamano}
                   onChange={e => setPermisos({...permisos, permitir_cambiar_tamano: e.target.checked})} />
            Permitir cambiar tamaño
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={permisos.permitir_cambiar_interlineado}
                   onChange={e => setPermisos({...permisos, permitir_cambiar_interlineado: e.target.checked})} />
            Permitir cambiar interlineado
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={permisos.permitir_cambiar_ancho}
                   onChange={e => setPermisos({...permisos, permitir_cambiar_ancho: e.target.checked})} />
            Permitir cambiar ancho
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={permisos.permitir_cambiar_color_hoja}
                   onChange={e => setPermisos({...permisos, permitir_cambiar_color_hoja: e.target.checked})} />
            Permitir cambiar color de hoja
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-foxBrown/10">
          <label className="flex flex-col text-sm">
            <span className="text-xs opacity-70 mb-1">Tipografía por defecto</span>
            <select className="input text-sm" value={permisos.tipografia_por_defecto}
                    onChange={e => setPermisos({...permisos, tipografia_por_defecto: e.target.value})}>
              <option value="serif">Serif</option>
              <option value="sans">Sans</option>
              <option value="mono">Mono</option>
            </select>
          </label>
          <label className="flex flex-col text-sm">
            <span className="text-xs opacity-70 mb-1">Tamaño por defecto</span>
            <select className="input text-sm" value={permisos.tamano_por_defecto}
                    onChange={e => setPermisos({...permisos, tamano_por_defecto: Number(e.target.value)})}>
              {[14,18,22,26,30].map(v => <option key={v} value={v}>{v}px</option>)}
            </select>
          </label>
          <label className="flex flex-col text-sm">
            <span className="text-xs opacity-70 mb-1">Tema por defecto</span>
            <select className="input text-sm" value={permisos.fondo_por_defecto}
                    onChange={e => setPermisos({...permisos, fondo_por_defecto: e.target.value})}>
              <option value="parchment">Pergamino</option>
              <option value="sepia">Sepia</option>
              <option value="night">Noche</option>
              <option value="snow">Nieve</option>
              <option value="forest">Bosque</option>
            </select>
          </label>
          {esComic && (
            <label className="flex flex-col text-sm sm:col-span-2">
              <span className="text-xs opacity-70 mb-1">Nota para comic (visible en el lector)</span>
              <input className="input text-sm" value={permisos.nota_comic || ''}
                     onChange={e => setPermisos({...permisos, nota_comic: e.target.value})}
                     placeholder="Este libro es ilustrado..." />
            </label>
          )}
        </div>
      </div>

      {/* Importar archivo */}
      <div className="card p-4">
        <h3 className="font-serif text-lg font-bold mb-2">Convertir archivo a libro</h3>
        <p className="text-xs opacity-70 mb-2">Formatos: .txt, .md, .docx, .rtf. Máximo 5 MB.</p>
        <input type="file" accept=".txt,.md,.docx,.rtf" onChange={importFile} />
      </div>

      {/* Capítulos */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-lg font-bold">Capítulos</h3>
          <button className="btn-ghost text-sm"
                  onClick={() => {
                    const nuevo = { _new: true, titulo: 'Nuevo capítulo', contenido: esComic ? JSON.stringify({ tipo: 'comic', paneles: [] }) : '', orden: chapters.length + 1, paneles: [] };
                    setChapters(prev => [...prev, nuevo]);
                    setCapActivo(chapters.length);
                  }}>
            + Añadir capítulo
          </button>
        </div>

        {chapters.length === 0 && (
          <p className="text-sm opacity-50 text-center py-4">No hay capítulos. Agrega el primero.</p>
        )}

        <div className="space-y-2">
          {chapters.map((c, i) => (
            <div key={c.id || '_new_' + i}
                 className={`border rounded-lg overflow-hidden cursor-pointer transition-colors ${capActivo === i ? 'border-foxBrown shadow-sm' : 'border-foxBrown/15'}`}>
              <div className="flex items-center gap-2 p-3 bg-black/5 dark:bg-white/5"
                   onClick={() => setCapActivo(capActivo === i ? -1 : i)}>
                <span className="text-xs font-bold opacity-50">{i + 1}</span>
                <input className="input flex-1 text-sm" value={c.titulo || ''} onClick={e => e.stopPropagation()}
                       onChange={e => {
                         const next = [...chapters]; next[i] = { ...next[i], titulo: e.target.value };
                         setChapters(next);
                       }} />
                <button className="btn-ghost text-xs text-red-500 border-red-200 hover:bg-red-50 px-2 py-1"
                        onClick={e => { e.stopPropagation(); deleteChapter(i, c); }}>
                  Eliminar
                </button>
              </div>

              {capActivo === i && (
                <div className="p-3 border-t border-foxBrown/10">
                  {esComic ? (
                    <PanelComic
                      paneles={c.paneles || []}
                      onChange={paneles => actualizarPanelesCapitulo(i, paneles)}
                      autorId={book.autor_id}
                    />
                  ) : (
                    <EditorWYSIWYG
                      contenido={c.contenido}
                      onChange={contenido => actualizarContenidoCapitulo(i, contenido)}
                      autorId={book.autor_id}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Gestión de imágenes */}
      {user?.id === book.autor_id ? (
        <ImageManager onInsert={() => {}} chapters={chapters} />
      ) : (
        <BookImagesPanel bookId={book.id} authorId={book.autor_id} />
      )}
    </div>
  );
}

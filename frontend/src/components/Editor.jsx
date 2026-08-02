import { useEffect, useState, useRef } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { useNavigate } from 'react-router-dom';
import ImageManager from './ImageManager.jsx';
import BookImagesPanel from './BookImagesPanel.jsx';

export default function Editor({ book, chapters: initial, onSaved, user }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  const [chapters, setChapters] = useState(initial || []);
  const cursorRef = useRef({});
  const textareaRefs = useRef({});

  useEffect(() => { setChapters(initial || []); }, [initial]);
  const [meta, setMeta] = useState({
    titulo: book.titulo, subtitulo: book.subtitulo || '',
    descripcion: book.descripcion || '',
    categoria: book.categoria || 'narrativa',
    grupo_edad: book.grupo_edad || 'adulto',
    original_publico: !!book.original_publico
  });

  useEffect(() => {
    api.get('/api/categorias').then(r => !r.__error && setCategories(r.categorias || []));
  }, []);

  async function saveAll() {
    const r1 = await api.put('/api/libros/' + book.id, meta);
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

  function insertImage(chapterIdx, name) {
    const ta = textareaRefs.current[chapterIdx];
    const cursor = cursorRef.current[chapterIdx] || 0;
    const markdown = '\n\n@img:' + name + '\n\n';
    setChapters(prev => {
      if (!prev[chapterIdx]) return prev;
      const contenido = prev[chapterIdx].contenido || '';
      const before = contenido.slice(0, cursor);
      const after = contenido.slice(cursor);
      const next = [...prev];
      next[chapterIdx] = { ...next[chapterIdx], contenido: before + markdown + after };
      return next;
    });
    setTimeout(() => {
      if (ta) { ta.focus(); ta.selectionStart = ta.selectionEnd = cursor + markdown.length; }
    }, 0);
  }

  function addPageBreak(chapterIdx) {
    const ta = textareaRefs.current[chapterIdx];
    const cursor = cursorRef.current[chapterIdx] || 0;
    setChapters(prev => {
      if (!prev[chapterIdx]) return prev;
      const contenido = prev[chapterIdx].contenido || '';
      const before = contenido.slice(0, cursor);
      const after = contenido.slice(cursor);
      const marker = '\n\n<!-- page -->\n\n';
      const next = [...prev];
      next[chapterIdx] = { ...next[chapterIdx], contenido: before + marker + after };
      return next;
    });
    setTimeout(() => {
      if (ta) { ta.focus(); ta.selectionStart = ta.selectionEnd = cursor + marker.length; }
    }, 0);
  }

  function pageCount(contenido) {
    if (!contenido) return 1;
    const count = contenido.split(/<!--\s*page\s*-->/g).length;
    return count || 1;
  }

  return (
    <div className="space-y-4">
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
          <div>Estado: <strong>{book.estado === 'publicado' ? 'Publicado' : book.estado === 'eliminado' ? 'Eliminado' : book.estado}</strong></div>
        )}
        {(book.autor_id === user?.id || user?.role === 'admin') && (
          <button className="btn-ghost text-xs text-red-500 border-red-200 hover:bg-red-50" onClick={confirmDelete}>Borrar libro</button>
        )}
      </div>

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
            {categories.map(c => <option key={c} value={c}>{cap(c)}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-sm">
          <span className="text-xs opacity-70 mb-1">Grupo de edad</span>
          <select className="input" value={meta.grupo_edad}
                  onChange={e => setMeta({...meta, grupo_edad: e.target.value})}>
            {['infantil','adolescente','adulto'].map(c => <option key={c}>{c}</option>)}
          </select>
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

      <div className="card p-4">
        <h3 className="font-serif text-lg font-bold mb-2">Convertir archivo a libro</h3>
        <p className="text-xs opacity-70 mb-2">Formatos: .txt, .md, .docx, .rtf. Máximo 5 MB.</p>
        <input type="file" accept=".txt,.md,.docx,.rtf" onChange={importFile} />
      </div>

      <div className="card p-4">
        <h3 className="font-serif text-lg font-bold mb-2">Capítulos</h3>
        <ul className="space-y-2">
          {chapters.map((c, i) => (
            <li key={c.id || '_new_' + i} className="border border-foxBrown/15 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <input className="input flex-1" value={c.titulo || ''} onChange={e => {
                  const next = [...chapters]; next[i] = { ...next[i], titulo: e.target.value };
                  setChapters(next);
                }} />
                <span className="text-xs opacity-50 mr-1">{pageCount(c.contenido)}p</span>
                <button className="btn-ghost text-xs px-2 py-1"
                        title="Insertar salto de página"
                        onClick={() => addPageBreak(i)}>
                  ➕ Pág.
                </button>
                <button className="btn-ghost text-xs text-red-500 border-red-200 hover:bg-red-50 px-2 py-1"
                        onClick={() => deleteChapter(i, c)}>
                  Eliminar
                </button>
              </div>
              <textarea ref={el => textareaRefs.current[i] = el}
                className="input min-h-[120px] font-serif" value={c.contenido || ''}
                onSelect={e => { cursorRef.current[i] = e.target.selectionStart; }}
                onFocus={e => { cursorRef.current[i] = e.target.selectionStart; }}
                onKeyUp={e => { cursorRef.current[i] = e.target.selectionStart; }}
                onChange={e => {
                  cursorRef.current[i] = e.target.selectionStart;
                  setChapters(prev => {
                    const next = [...prev];
                    next[i] = { ...next[i], contenido: e.target.value };
                    return next;
                  });
                }} />
            </li>
          ))}
        </ul>
        <button className="btn-ghost mt-3 text-sm"
                onClick={() => setChapters(prev => [...prev, { _new:true, titulo:'Nuevo capítulo', contenido:'', orden: prev.length+1 }])}>
          + Añadir capítulo
        </button>
      </div>

      {user?.id === book.autor_id ? (
        <ImageManager onInsert={(ci, name) => insertImage(ci, name)} chapters={chapters} />
      ) : (
        <BookImagesPanel bookId={book.id} authorId={book.autor_id} />
      )}
    </div>
  );
}

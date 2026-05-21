import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { useNavigate } from 'react-router-dom';
import ImageManager from './ImageManager.jsx';

/**
 * Editor con:
 *   - Edición de capítulos (texto + reorden)
 *   - Subida de archivo .txt/.md/.docx/.rtf para convertir a libro
 *   - ImageManager para arrastrar imágenes entre párrafos
 *   - Temporizador de 2 minutos para publicar
 */
export default function Editor({ book, chapters: initial, onSaved }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [chapters, setChapters] = useState(initial || []);
  const [meta, setMeta] = useState({
    title: book.title, subtitle: book.subtitle || '',
    description: book.description || '',
    category: book.category || 'narrativa',
    age_group: book.age_group || 'adulto',
    original_public: !!book.original_public
  });

  // Temporizador de 2 minutos
  const [deadline, setDeadline] = useState(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(x => x+1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (book.status === 'draft') setDeadline(Date.now() + 2*60*1000);
  }, [book.id]);

  const remaining = deadline ? Math.max(0, deadline - Date.now()) : 0;
  const remainText = deadline ? mmss(remaining) : '—';
  const expired = deadline && remaining === 0;

  function mmss(ms) {
    const s = Math.floor(ms/1000);
    return String(Math.floor(s/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0');
  }

  async function saveMeta() {
    const r = await api.put('/api/books/' + book.id, meta);
    if (r && r.__error) return;
    toast.ok('Cambios guardados');
    onSaved && onSaved();
  }

  async function saveChapter(c) {
    if (c._new) {
      const r = await api.post('/api/books/' + book.id + '/chapters', {
        title: c.title, content: c.content, order: c.order
      });
      if (!(r && r.__error)) toast.ok('Capítulo creado');
    }
    onSaved && onSaved();
  }

  async function publish() {
    if (expired) { toast.error('Se excedieron los 2 minutos para publicar'); navigate('/error/400'); return; }
    const r = await api.put('/api/books/' + book.id, { status: 'published' });
    if (r && r.__error) { setTimeout(() => navigate('/error/400'), 1200); return; }
    toast.ok('Libro publicado');
    setDeadline(null);
    onSaved && onSaved();
  }

  async function importFile(e) {
    const f = e.target.files[0]; if (!f) return;
    const fd = new FormData();
    fd.append('file', f);
    fd.append('original_public', meta.original_public ? 'true' : 'false');
    const r = await api.form('/api/books/' + book.id + '/import-file', fd);
    if (r && r.__error) return;
    toast.ok('Archivo convertido: ' + r.chapters_created + ' capítulo(s)');
    onSaved && onSaved();
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap gap-3 items-center text-sm">
        {book.status === 'draft' ? (
          <>
            <div>Estado: <strong>Borrador</strong></div>
            <div>Tiempo para publicar: <strong className={expired ? 'text-red-600' : ''}>{remainText}</strong></div>
            <button className="btn-primary ml-auto" onClick={publish}>Publicar</button>
          </>
        ) : (
          <div>Estado: <strong>{book.status}</strong></div>
        )}
      </div>

      <div className="card p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="flex flex-col text-sm">
          <span className="text-xs opacity-70 mb-1">Título</span>
          <input className="input" value={meta.title} onChange={e => setMeta({...meta, title: e.target.value})} />
        </label>
        <label className="flex flex-col text-sm">
          <span className="text-xs opacity-70 mb-1">Subtítulo</span>
          <input className="input" value={meta.subtitle} onChange={e => setMeta({...meta, subtitle: e.target.value})} />
        </label>
        <label className="flex flex-col text-sm md:col-span-2">
          <span className="text-xs opacity-70 mb-1">Descripción</span>
          <textarea className="input min-h-[80px]" value={meta.description}
                    onChange={e => setMeta({...meta, description: e.target.value})} />
        </label>
        <label className="flex flex-col text-sm">
          <span className="text-xs opacity-70 mb-1">Categoría</span>
          <select className="input" value={meta.category}
                  onChange={e => setMeta({...meta, category: e.target.value})}>
            {['fantasia','poesia','narrativa','educativa'].map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-sm">
          <span className="text-xs opacity-70 mb-1">Grupo de edad</span>
          <select className="input" value={meta.age_group}
                  onChange={e => setMeta({...meta, age_group: e.target.value})}>
            {['infantil','adolescente','adulto'].map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" checked={meta.original_public}
                 onChange={e => setMeta({...meta, original_public: e.target.checked})} />
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
            <li key={c.id || i} className="border border-bookedBrown/15 rounded p-3">
              <input className="input mb-2" value={c.title || ''} onChange={e => {
                const next = [...chapters]; next[i] = { ...next[i], title: e.target.value };
                setChapters(next);
              }} />
              <textarea className="input min-h-[120px] font-serif" value={c.content || ''} onChange={e => {
                const next = [...chapters]; next[i] = { ...next[i], content: e.target.value };
                setChapters(next);
              }} />
              <div className="mt-2 flex gap-2">
                <button className="btn-ghost text-xs" onClick={() => saveChapter(chapters[i])}>Guardar capítulo</button>
              </div>
            </li>
          ))}
        </ul>
        <button className="btn-ghost mt-3 text-sm"
                onClick={() => setChapters([...chapters, { _new:true, title:'Nuevo capítulo', content:'', order: chapters.length+1 }])}>
          + Añadir capítulo
        </button>
      </div>

      <ImageManager bookId={book.id} />
    </div>
  );
}

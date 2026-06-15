import { useEffect, useState, useRef } from 'react';
import { listUserImages, uploadUserImage, updateUserImage, deleteUserImage } from '../api/userImages.js';
import { safeUrl } from '../api/safe.js';
import { useToast } from '../context/ToastContext.jsx';

const NAME_REGEX = /^[a-zA-Z0-9\-_,\.\?!¿¡<>]+$/;

export default function ImageManager({ onInsert, chapters }) {
  const toast = useToast();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadName, setUploadName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [chapterPicker, setChapterPicker] = useState(null);
  const uploadRef = useRef(null);

  useEffect(() => { loadImages(); }, []);

  async function loadImages() {
    setLoading(true);
    const imgs = await listUserImages();
    setImages(imgs);
    setLoading(false);
  }

  function validateName(name) {
    if (!name || name.length < 1 || name.length > 60) return 'Entre 1 y 60 caracteres';
    if (!NAME_REGEX.test(name)) return 'Solo letras, números y -_,.!?¿¡<>';
    return null;
  }

  async function handleUpload() {
    if (!uploadFile) { toast.error('Selecciona un archivo'); return; }
    const err = validateName(uploadName);
    if (err) { toast.error('Nombre: ' + err); return; }
    setUploading(true);
    const img = await uploadUserImage(uploadFile, uploadName.trim());
    setUploading(false);
    if (!img) { toast.error('Error al subir'); return; }
    setUploadFile(null);
    setUploadName('');
    if (uploadRef.current) uploadRef.current.value = '';
    await loadImages();
    toast.ok('Imagen subida como "' + img.custom_name + '"');
  }

  async function handleRename(id) {
    const name = editValue.trim();
    const err = validateName(name);
    if (err) { toast.error('Nombre: ' + err); return; }
    const ok = await updateUserImage(id, { custom_name: name });
    if (!ok) { toast.error('Error al renombrar'); return; }
    setImages(prev => prev.map(i => i.id === id ? { ...i, custom_name: name } : i));
    setEditingId(null);
    toast.ok('Nombre actualizado');
  }

  async function handleReorder(id, dir) {
    const sorted = [...images].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const idx = sorted.findIndex(i => i.id === id);
    if (idx === -1) return;
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[swapIdx];
    const aOrder = a.sort_order || 0;
    const bOrder = b.sort_order || 0;
    const r1 = await updateUserImage(a.id, { sort_order: bOrder });
    const r2 = await updateUserImage(b.id, { sort_order: aOrder });
    if (!r1 || !r2) { toast.error('Error al reordenar'); return; }
    await loadImages();
  }

  async function handleDelete(id) {
    const img = images.find(i => i.id === id);
    if (!img) return;
    if (!window.confirm('¿Eliminar "' + img.custom_name + '"? No se puede deshacer.')) return;
    const ok = await deleteUserImage(id);
    if (!ok) { toast.error('Error al eliminar'); return; }
    setImages(prev => prev.filter(i => i.id !== id));
    toast.ok('Imagen eliminada');
  }

  function startInsert(ci, name) {
    onInsert(ci, name);
    setChapterPicker(null);
    toast.ok('@img:' + name + ' insertado en capítulo ' + (ci + 1));
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-bold">Imágenes de usuario</h3>
        <button className="btn-ghost text-xs" onClick={loadImages} disabled={loading}>
          {loading ? 'Cargando…' : '↻ Recargar'}
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 p-3 border border-bookshelfBrown/15 rounded">
        <label className="flex flex-col text-sm flex-1 min-w-[160px]">
          <span className="text-xs opacity-70 mb-1">Archivo (.jpg .jpeg .png .webp)</span>
          <input type="file" accept=".jpg,.jpeg,.png,.webp" className="input text-sm py-1"
                 ref={uploadRef}
                 onChange={e => setUploadFile(e.target.files[0])} />
        </label>
        <label className="flex flex-col text-sm flex-1 min-w-[140px]">
          <span className="text-xs opacity-70 mb-1">Nombre personalizado</span>
          <input className="input text-sm py-1" placeholder="portada_v1"
                 value={uploadName} onChange={e => setUploadName(e.target.value)} maxLength={60} />
        </label>
        <button className="btn-primary text-sm" onClick={handleUpload} disabled={uploading}>
          {uploading ? 'Subiendo…' : 'Subir'}
        </button>
      </div>

      {loading ? (
        <p className="text-xs opacity-60">Cargando imágenes…</p>
      ) : images.length === 0 ? (
        <p className="text-xs opacity-60">No has subido imágenes aún.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {images.map(img => (
            <div key={img.id} className="border border-bookshelfBrown/15 rounded p-2 flex flex-col gap-1 min-w-0 overflow-hidden">
              <div className="aspect-video bg-bookshelfBrown/5 rounded overflow-hidden">
                <img src={safeUrl(img.url)} alt={img.custom_name}
                     className="w-full h-full object-contain" />
              </div>
              <div className="flex items-center gap-1 text-xs">
                {editingId === img.id ? (
                  <>
                    <input className="input flex-1 text-xs py-0.5" value={editValue}
                           onChange={e => setEditValue(e.target.value)}
                           onKeyDown={e => { if (e.key === 'Enter') handleRename(img.id); if (e.key === 'Escape') setEditingId(null); }}
                           maxLength={60} autoFocus />
                    <button className="text-green-600 px-1" onClick={() => handleRename(img.id)}>✓</button>
                    <button className="px-1" onClick={() => setEditingId(null)}>✕</button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 font-mono truncate" title={img.custom_name}>
                      {img.custom_name}
                    </span>
                    <span className={'text-[10px] px-1 rounded ' + (img.in_use ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400')}>
                      {img.in_use ? 'ok' : '—'}
                    </span>
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-0.5 mt-auto">
                {editingId !== img.id && (
                  <>
                    {chapterPicker === img.id ? (
                      <div className="flex flex-wrap gap-1">
                        {(chapters || []).map((ch, ci) => (
                          <button key={ci} className="btn-ghost text-[10px] px-1 py-0.5 truncate max-w-[80px]"
                                  onClick={() => startInsert(ci, img.custom_name)}>
                            Cap.{ci + 1}
                          </button>
                        ))}
                        <button className="btn-ghost text-[10px] px-1 py-0.5" onClick={() => setChapterPicker(null)}>✕</button>
                      </div>
                    ) : (
                      <button className="btn-ghost text-[10px] px-1 py-0.5 text-blue-600 dark:text-blue-400"
                              onClick={() => setChapterPicker(img.id)}>
                        ↓ Insertar
                      </button>
                    )}
                    <button className="btn-ghost text-[10px] px-1 py-0.5"
                            onClick={() => { setEditingId(img.id); setEditValue(img.custom_name); }}>
                      Renombrar
                    </button>
                    <button className="btn-ghost text-[10px] px-1 py-0.5" onClick={() => handleReorder(img.id, -1)}>↑</button>
                    <button className="btn-ghost text-[10px] px-1 py-0.5" onClick={() => handleReorder(img.id, 1)}>↓</button>
                    <button className="btn-ghost text-[10px] px-1 py-0.5 text-red-500"
                            onClick={() => handleDelete(img.id)}>✕</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

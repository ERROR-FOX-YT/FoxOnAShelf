import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useNavigate } from 'react-router-dom';
import { listUserImages, uploadUserImage, updateUserImage, deleteUserImage } from '../api/userImages.js';
import { safeUrl } from '../api/safe.js';

const NAME_REGEX = /^[a-zA-Z0-9\-_,\.\?!¿¡<>]+$/;

export default function MediaLibrary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadName, setUploadName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const uploadRef = useRef(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    loadImages();
  }, [user]);

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
    if (!img) { toast.error('Error al subir imagen'); return; }
    setImages(prev => [...prev, img]);
    setUploadFile(null);
    setUploadName('');
    if (uploadRef.current) uploadRef.current.value = '';
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
    setImages(prev => prev.map(i => {
      if (i.id === a.id) return { ...i, sort_order: bOrder };
      if (i.id === b.id) return { ...i, sort_order: aOrder };
      return i;
    }).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
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

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <header className="card p-6">
        <h1 className="font-serif text-2xl font-bold">Mis imágenes</h1>
        <p className="text-xs opacity-70 mt-1">Sube imágenes y asígnales un nombre para usarlas en tus libros con <code className="bg-bookshelfBrown/10 px-1 rounded">@img:nombre</code></p>
      </header>

      <div className="card p-4">
        <h2 className="font-serif text-lg font-bold mb-3">Subir nueva imagen</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-sm flex-1 min-w-[200px]">
            <span className="text-xs opacity-70 mb-1">Archivo (.jpg .jpeg .png .webp)</span>
            <input type="file" accept=".jpg,.jpeg,.png,.webp" className="input"
                   ref={uploadRef}
                   onChange={e => setUploadFile(e.target.files[0])} />
          </label>
          <label className="flex flex-col text-sm flex-1 min-w-[180px]">
            <span className="text-xs opacity-70 mb-1">Nombre personalizado</span>
            <input className="input" placeholder="e.g. portada_v1" value={uploadName}
                   onChange={e => setUploadName(e.target.value)} maxLength={60} />
          </label>
          <button className="btn-primary" onClick={handleUpload} disabled={uploading}>
            {uploading ? 'Subiendo…' : 'Subir'}
          </button>
        </div>
        <p className="text-xs opacity-50 mt-2">Solo letras, números y -_,.!?¿¡&lt;&gt; (máx 60 caracteres, sin espacios ni ñ)</p>
      </div>

      <div className="card p-4">
        <h2 className="font-serif text-lg font-bold mb-3">
          {loading ? 'Cargando…' : images.length + ' imagen(es)'}
        </h2>
        {!loading && images.length === 0 && (
          <p className="opacity-70 text-sm">No has subido imágenes aún.</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {images.map(img => (
            <div key={img.id} className="border border-bookshelfBrown/15 rounded p-3 flex flex-col gap-2 min-w-0 overflow-hidden">
              <div className="relative w-full aspect-video bg-bookshelfBrown/5 rounded overflow-hidden">
                <img src={safeUrl(img.url)} alt={img.custom_name}
                     className="w-full h-full object-contain" />
              </div>
              <div className="flex items-center gap-1">
                {editingId === img.id ? (
                  <input className="input flex-1 text-sm py-1" value={editValue}
                         onChange={e => setEditValue(e.target.value)}
                         onKeyDown={e => { if (e.key === 'Enter') handleRename(img.id); if (e.key === 'Escape') setEditingId(null); }}
                         maxLength={60} autoFocus />
                ) : (
                  <span className="flex-1 font-mono text-sm truncate" title={img.custom_name}>
                    {img.custom_name}
                  </span>
                )}
                <span className={'text-xs px-1.5 py-0.5 rounded ' + (img.in_use ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400')}>
                  {img.in_use ? 'en uso' : 'desuso'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1 mt-auto">
                {editingId === img.id ? (
                  <>
                    <button className="btn-ghost text-xs px-2 py-1 text-green-600" onClick={() => handleRename(img.id)}>✓</button>
                    <button className="btn-ghost text-xs px-2 py-1" onClick={() => setEditingId(null)}>✕</button>
                  </>
                ) : (
                  <button className="btn-ghost text-xs px-2 py-1" onClick={() => { setEditingId(img.id); setEditValue(img.custom_name); }}>Renombrar</button>
                )}
                <button className="btn-ghost text-xs px-2 py-1" onClick={() => handleReorder(img.id, -1)}>↑</button>
                <button className="btn-ghost text-xs px-2 py-1" onClick={() => handleReorder(img.id, 1)}>↓</button>
                <button className="btn-ghost text-xs px-2 py-1 text-red-500"
                        onClick={() => handleDelete(img.id)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

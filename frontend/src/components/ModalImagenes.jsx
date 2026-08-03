import { useState, useEffect } from 'react';
import { apiBase } from '../api/client.js';
import { listUserImages } from '../api/userImages.js';

export default function ModalImagenes({ autorId, onSelect, onClose }) {
  const [imagenes, setImagenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    listUserImages()
      .then(r => setImagenes(r.imagenes || []))
      .catch(() => setImagenes([]))
      .finally(() => setCargando(false));
  }, []);

  const filtradas = imagenes.filter(img =>
    (img.nombre_personalizado || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  function resolverUrl(img) {
    return `${apiBase() || ''}/api/imagenes-usuario/resolver/${autorId || img.usuario_id}/${encodeURIComponent(img.nombre_personalizado)}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-nightGray rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col"
           onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
          <h3 className="font-serif font-bold text-lg">Insertar imagen</h3>
          <button onClick={onClose} className="text-2xl opacity-50 hover:opacity-100">×</button>
        </div>

        <div className="p-3 border-b border-black/10 dark:border-white/10">
          <input className="input w-full" placeholder="Buscar imagen..." value={busqueda}
                 onChange={e => setBusqueda(e.target.value)} />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cargando && <p className="text-center opacity-50 py-8">Cargando imágenes...</p>}
          {!cargando && imagenes.length === 0 && (
            <div className="text-center py-8 space-y-2">
              <div className="text-4xl opacity-30">🖼</div>
              <p className="text-sm opacity-70">No tienes imágenes. Sube imágenes en tu biblioteca.</p>
            </div>
          )}
          {!cargando && filtradas.length === 0 && imagenes.length > 0 && (
            <p className="text-center opacity-50 py-8">No se encontraron imágenes con "{busqueda}"</p>
          )}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {filtradas.map(img => (
              <button key={img.id}
                      className="group relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-foxBrown transition-colors"
                      onClick={() => onSelect(resolverUrl(img))}>
                <img src={resolverUrl(img)} alt={img.nombre_personalizado}
                     className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate text-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {img.nombre_personalizado}
                </div>
                {img.moderada && (
                  <div className="absolute top-1 right-1 bg-red-500 text-white text-[9px] px-1 py-0.5 rounded">
                    REVISIÓN
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 border-t border-black/10 dark:border-white/10 flex justify-end">
          <button onClick={onClose} className="btn-ghost text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

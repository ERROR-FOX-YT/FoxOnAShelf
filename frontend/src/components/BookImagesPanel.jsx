import { useEffect, useState } from 'react';
import { listBookImages } from '../api/userImages.js';
import { safeUrl } from '../api/safe.js';

export default function BookImagesPanel({ bookId }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listBookImages(bookId).then(imgs => {
      setImages(imgs);
      setLoading(false);
    });
  }, [bookId]);

  if (loading) return (
    <div className="card p-4">
      <h3 className="font-serif text-lg font-bold mb-2">Imágenes del libro</h3>
      <p className="text-xs opacity-60">Cargando imágenes…</p>
    </div>
  );

  return (
    <div className="card p-4 space-y-3">
      <h3 className="font-serif text-lg font-bold">Imágenes del libro</h3>
      {images.length === 0 ? (
        <p className="text-xs opacity-60">Este libro no usa imágenes.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {images.map((img) => (
            <div key={img.id} className="border border-foxBrown/15 rounded p-2 flex flex-col gap-1 min-w-0 overflow-hidden">
              <div className="aspect-video bg-foxBrown/5 rounded overflow-hidden">
                <img src={safeUrl(img.url)} alt={img.nombre_personalizado}
                     className="w-full h-full object-contain" />
              </div>
              <span className="font-mono text-xs truncate" title={img.nombre_personalizado}>
                {img.nombre_personalizado}
              </span>
              <span className="text-[10px] opacity-60 truncate">
                {img.propietario.nombre_mostrado}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

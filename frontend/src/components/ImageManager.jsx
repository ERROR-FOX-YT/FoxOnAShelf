import { useState } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';

export default function ImageManager({ bookId }) {
  const toast = useToast();
  const [images, setImages] = useState([]);
  const [dragOver, setDragOver] = useState(false);

  async function upload(file) {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const r = await api.form('/api/upload', fd);
    if (r && r.__error) return;
    setImages(im => [...im, { ...r.file, position: im.length }]);
    toast.ok('Imagen subida');
  }

  function onDrop(e) {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0]; upload(f);
  }

  function move(i, dir) {
    setImages(im => {
      const next = [...im];
      const j = i + dir;
      if (j < 0 || j >= next.length) return im;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  return (
    <div className="card p-4">
      <h3 className="font-serif text-lg font-bold mb-2">Imágenes del libro</h3>
      <p className="text-xs opacity-70 mb-2">Arrastra archivos .jpg .jpeg .png .webp (máx 5 MB).</p>
      <div onDragOver={e => { e.preventDefault(); setDragOver(true); }}
           onDragLeave={() => setDragOver(false)}
           onDrop={onDrop}
           className={'border-2 border-dashed rounded p-6 text-center text-sm ' +
                      (dragOver ? 'border-bookedBrown bg-bookedBrown/10' : 'border-bookedBrown/30')}>
        Arrastra una imagen aquí
        <div className="text-xs opacity-60 mt-1">o</div>
        <input type="file" accept=".jpg,.jpeg,.png,.webp" className="mt-2"
               onChange={e => upload(e.target.files[0])} />
      </div>

      <ul className="mt-3 space-y-2">
        {images.map((img, i) => (
          <li key={img.filename} className="flex items-center gap-3 text-sm border border-bookedBrown/15 rounded p-2">
            <img src={img.url} alt="" className="w-16 h-16 object-cover rounded" />
            <div className="flex-1 truncate">{img.filename}</div>
            <button className="btn-ghost text-xs" onClick={() => move(i, -1)}>↑</button>
            <button className="btn-ghost text-xs" onClick={() => move(i, +1)}>↓</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

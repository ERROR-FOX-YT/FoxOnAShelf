import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

export default function ReadingProgress({ bookId }) {
  const { user } = useAuth();
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    if (!user) return;
    api.get('/api/marcadores').then(r => {
      if (r && !r.__error && r.marcadores) {
        const bookmark = r.marcadores.find(m => m.libro_id === bookId);
        if (bookmark) {
          if (bookmark.terminado) { setProgress(100); return; }
          const idx = bookmark.indice_capitulo || 0;
          api.get('/api/libros/' + bookId).then(r2 => {
            if (r2 && !r2.__error && r2.capitulos) {
              const total = r2.capitulos.length || 1;
              setProgress(Math.round(((idx + 1) / total) * 100));
            }
          });
        }
      }
    });
  }, [user, bookId]);

  if (!user || progress === null) return null;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-[10px] opacity-60 mb-0.5">
        <span>{progress === 100 ? 'Terminado' : 'En progreso'}</span>
        <span>{progress}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-foxBrown/15 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: progress + '%',
            backgroundColor: progress === 100 ? '#22c55e' : 'var(--accent-main)'
          }}
        />
      </div>
    </div>
  );
}

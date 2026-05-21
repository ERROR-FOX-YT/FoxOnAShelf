import { useEffect, useState } from 'react';

export default function Reader({ book, chapters }) {
  const [idx, setIdx]   = useState(0);
  const [size, setSize] = useState(() => +(localStorage.getItem('booked.reader.size') || 18));
  const [bookmark, setBookmark] = useState(() => +(localStorage.getItem('booked.reader.mark.' + book.id) || 0));

  useEffect(() => { localStorage.setItem('booked.reader.size', size); }, [size]);
  useEffect(() => { setIdx(bookmark); }, [bookmark, book.id]);

  if (!chapters || !chapters.length) {
    return <div className="card p-6 opacity-70">Este libro todavía no tiene capítulos.</div>;
  }
  const cur = chapters[idx];

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 text-xs mb-3">
        <button className="btn-ghost" disabled={idx === 0} onClick={() => setIdx(i => i-1)}>← Anterior</button>
        <button className="btn-ghost" disabled={idx === chapters.length-1} onClick={() => setIdx(i => i+1)}>Siguiente →</button>
        <span className="opacity-70 ml-2">Capítulo {idx+1} / {chapters.length}</span>
        <div className="ml-auto flex gap-2">
          <button className="btn-ghost" onClick={() => setSize(s => Math.max(12, s-2))}>A−</button>
          <button className="btn-ghost" onClick={() => setSize(s => Math.min(28, s+2))}>A+</button>
          <button className="btn-ghost"
                  onClick={() => { localStorage.setItem('booked.reader.mark.' + book.id, String(idx)); setBookmark(idx); }}>
            🔖 Marcar
          </button>
        </div>
      </div>
      <h3 className="font-serif text-2xl font-bold text-bookedBrown mb-2">{cur.title}</h3>
      <article className="prose whitespace-pre-wrap font-serif leading-relaxed"
               style={{ fontSize: size + 'px' }}>
        {cur.content}
      </article>
    </div>
  );
}

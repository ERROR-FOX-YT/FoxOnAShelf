import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import BookList from '../components/BookList.jsx';
import { bannerEntrance, cardEntrance } from '../components/animations/animations.js';

export default function Home() {
  const [announcements, setAnn] = useState([]);
  const [featured, setF]        = useState([]);
  const [metrics, setM]         = useState({ authors_total:0, books_total:0, views_total:0 });
  const annRef = useRef(null);
  const cardsRef = useRef(null);

  useEffect(() => {
    api.get('/api/announcements').then(r => setAnn(r.announcements || []));
    api.get('/api/metrics/featured').then(r => setF(r.featured || []));
    api.get('/api/metrics').then(r => setM(r));
  }, []);

  useEffect(() => { if (annRef.current) bannerEntrance(annRef.current); }, [announcements]);
  useEffect(() => {
    if (cardsRef.current) cardEntrance(cardsRef.current.querySelectorAll('[data-metric]'));
  }, [metrics]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <section ref={annRef} className="card p-6">
        <h1 className="font-serif text-3xl font-bold text-bookedBrown">Booked™ — Lectura digital abierta y justa</h1>
        <p className="opacity-80 mt-1">Una plataforma colombiana para leer, escribir y compartir historias.</p>
        {announcements[0] && (
          <div className="mt-4 border-l-4 border-bookedBrown pl-3">
            <div className="font-semibold">{announcements[0].title}</div>
            <div className="text-sm opacity-80 whitespace-pre-wrap">{announcements[0].content}</div>
          </div>
        )}
      </section>

      <section ref={cardsRef} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Autores registrados" value={metrics.authors_total} hint="Usuarios con rol creator" />
        <Stat label="Libros publicados"   value={metrics.books_total}   hint="status = published" />
        <Stat label="Libros vistos"       value={metrics.views_total}   hint="suma de views" />
      </section>

      <section>
        <h2 className="font-serif text-xl font-bold mb-3">Libros más vistos</h2>
        <BookList books={featured} />
        <p className="text-xs opacity-60 mt-2">Los destacados se ordenan por número de vistas, no por likes.</p>
      </section>
    </div>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div className="card p-4" data-metric>
      <div className="text-xs uppercase opacity-70">{label}</div>
      <div className="text-3xl font-serif font-bold text-bookedBrown">{value}</div>
      <div className="text-xs opacity-60">{hint}</div>
    </div>
  );
}

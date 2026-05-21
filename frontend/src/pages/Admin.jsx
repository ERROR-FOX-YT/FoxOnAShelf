import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

export default function Admin() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [metrics, setM] = useState({});
  const [moderators, setMods] = useState([]);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!isAdmin()) { navigate('/'); return; }
    api.get('/api/metrics').then(setM);
    api.get('/api/moderation/moderators').then(r => !r.__error && setMods(r.moderators || []));
  }, [user]);

  if (!user || !isAdmin()) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <h1 className="font-serif text-2xl font-bold">Dashboard Admin</h1>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Autores"  value={metrics.authors_total ?? 0} />
        <Stat label="Libros"   value={metrics.books_total ?? 0} />
        <Stat label="Vistas"   value={metrics.views_total ?? 0} />
      </section>

      <div className="card p-4">
        <h2 className="font-serif text-xl font-bold mb-2">Accesos rápidos</h2>
        <ul className="text-sm list-disc pl-5 space-y-1">
          <li><Link to="/admin/moderation" className="underline">Pestaña de moderación</Link></li>
          <li><Link to="/announcements" className="underline">Crear anuncios</Link></li>
        </ul>
      </div>

      <div className="card p-4">
        <h2 className="font-serif text-xl font-bold mb-2">Moderadores</h2>
        <ul className="text-sm space-y-1">
          {moderators.map(m => (
            <li key={m.id} className="flex gap-2 items-center">
              <span>{m.display_name || m.email}</span>
              <span className="opacity-60 text-xs">({m.role}{m.is_admin_fox ? ' · adminFox' : ''})</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase opacity-70">{label}</div>
      <div className="text-3xl font-serif font-bold text-bookedBrown">{value}</div>
    </div>
  );
}

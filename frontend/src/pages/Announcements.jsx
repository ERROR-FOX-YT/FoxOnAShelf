import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Announcements() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [t, setT] = useState(''); const [c, setC] = useState('');

  async function load() {
    const r = await api.get('/api/announcements');
    if (!r.__error) setItems(r.announcements || []);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!t.trim() || !c.trim()) { toast.error('Completa título y contenido'); return; }
    const r = await api.post('/api/announcements', { title: t, content: c });
    if (!r.__error) { setT(''); setC(''); load(); toast.ok('Anuncio publicado'); }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <h1 className="font-serif text-2xl font-bold">Tablón de anuncios</h1>
      {isAdmin() && (
        <div className="card p-4 space-y-2">
          <input className="input" placeholder="Título" value={t} onChange={e => setT(e.target.value)} />
          <textarea className="input min-h-[100px]" placeholder="Contenido" value={c} onChange={e => setC(e.target.value)} />
          <button className="btn-primary" onClick={create}>Publicar anuncio</button>
        </div>
      )}
      <ul className="space-y-3">
        {items.map(a => (
          <li key={a.id} className="card p-4">
            <h3 className="font-serif text-lg font-bold">{a.title}</h3>
            <div className="text-xs opacity-60">{new Date(a.created_at).toLocaleString()}</div>
            <div className="mt-2 whitespace-pre-wrap">{a.content}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Comments({ bookId }) {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [text, setText] = useState('');

  async function load() {
    const r = await api.get('/api/books/' + bookId + '/comments');
    if (!r.__error) setItems(r.comments || []);
  }
  useEffect(() => { load(); }, [bookId]);

  async function send() {
    if (!text.trim()) { toast.error('Escribe algo antes de comentar'); return; }
    const r = await api.post('/api/books/' + bookId + '/comment', { content: text });
    if (!r.__error) { setText(''); load(); toast.ok('Comentario publicado'); }
  }

  return (
    <div className="card p-4">
      <h3 className="font-serif text-lg font-bold mb-2">Comentarios</h3>
      <ul className="space-y-2 mb-3 max-h-80 overflow-auto">
        {items.length === 0 && <li className="opacity-70 text-sm">Sé el primero en comentar.</li>}
        {items.map(c => (
          <li key={c.id} className="border border-bookedBrown/15 rounded p-2 text-sm">
            <div className="font-semibold">{c.author_name || 'Anónimo'}</div>
            <div>{c.content}</div>
          </li>
        ))}
      </ul>
      {user ? (
        <div className="flex gap-2">
          <input className="input flex-1" placeholder="Tu comentario..."
                 value={text} onChange={e => setText(e.target.value)} />
          <button className="btn-primary" onClick={send}>Enviar</button>
        </div>
      ) : (
        <div className="opacity-70 text-sm">Inicia sesión para comentar.</div>
      )}
    </div>
  );
}

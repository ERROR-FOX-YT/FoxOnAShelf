import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import { useNavigate, Link } from 'react-router-dom';

export default function Profile() {
  const { user, logout, isCreator } = useAuth();
  const [books, setBooks] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    api.get('/api/books').then(r => setBooks((r.books || []).filter(b => b.author_id === user.sub)));
  }, [user]);

  async function createBook() {
    const r = await api.post('/api/books', {
      title: 'Nuevo libro', description: '',
      category: 'narrativa', age_group: 'adulto'
    });
    if (!r.__error) navigate('/book/' + r.book.id + '/edit');
  }

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <header className="card p-6">
        <h1 className="font-serif text-2xl font-bold">{user.display_name || user.email}</h1>
        <div className="text-xs opacity-70">{user.email} · rol: {user.role}</div>
        <div className="mt-3 flex gap-2">
          {isCreator() && <button className="btn-primary" onClick={createBook}>+ Nuevo libro</button>}
          <button className="btn-ghost" onClick={logout}>Cerrar sesión</button>
        </div>
      </header>
      <h2 className="font-serif text-xl font-bold">Mis libros</h2>
      <ul className="space-y-2">
        {books.length === 0 && <li className="opacity-70 text-sm">Aún no has creado libros.</li>}
        {books.map(b => (
          <li key={b.id} className="card p-3 flex items-center gap-3">
            <Link to={'/book/' + b.id} className="flex-1 font-semibold">{b.title}</Link>
            <span className="text-xs opacity-70">{b.status}</span>
            <Link to={'/book/' + b.id + '/edit'} className="btn-ghost text-xs">Editar</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

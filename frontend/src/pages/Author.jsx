import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import BookList from '../components/BookList.jsx';

export default function Author() {
  const { authorId } = useParams();
  const [user, setUser] = useState(null);
  const [books, setBooks] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get('/api/usuarios/' + authorId).then(r => { if (r.__error) setError(true); else setUser(r.user); });
    api.get('/api/libros?autor_id=' + authorId).then(r => setBooks(r.libros || []));
  }, [authorId]);

  if (error) return <div className="max-w-6xl mx-auto p-6 opacity-70">Usuario no encontrado.</div>;
  if (!user) return <div className="max-w-6xl mx-auto p-6 opacity-70">Cargando...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      <header className="rm-card p-6">
        <h1 className="font-serif text-2xl font-bold">{user.nombre_mostrado || user.email}</h1>
        <div className="text-xs opacity-70">Rol: {user.role}</div>
      </header>
      <h2 className="font-serif text-xl font-bold">Libros</h2>
      <BookList books={books} />
    </div>
  );
}

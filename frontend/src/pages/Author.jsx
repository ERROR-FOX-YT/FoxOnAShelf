import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import BookList from '../components/BookList.jsx';

export default function Author() {
  const { authorId } = useParams();
  const [user, setUser] = useState(null);
  const [books, setBooks] = useState([]);

  useEffect(() => {
    api.get('/api/users/' + authorId).then(r => !r.__error && setUser(r.user));
    api.get('/api/books').then(r => setBooks((r.books || []).filter(b => b.author_id === authorId)));
  }, [authorId]);

  if (!user) return <div className="max-w-6xl mx-auto p-6 opacity-70">Cargando...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      <header className="card p-6">
        <h1 className="font-serif text-2xl font-bold">{user.display_name || user.email}</h1>
        <div className="text-xs opacity-70">Rol: {user.role}</div>
      </header>
      <h2 className="font-serif text-xl font-bold">Libros</h2>
      <BookList books={books} />
    </div>
  );
}

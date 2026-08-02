import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Editor from '../components/Editor.jsx';

export default function BookEdit() {
  const { bookId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [chapters, setCh] = useState([]);

  async function load() {
    const r = await api.get('/api/libros/' + bookId);
    if (!r.__error) { setBook(r.libro); setCh(r.capitulos || []); }
  }
  useEffect(() => { load(); }, [bookId]);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  if (!user) return null;
  if (book && book.autor_id !== user.id && user.role === 'moderator' && !book.es_gratis) {
    return <div className="max-w-6xl mx-auto p-6">Los moderadores solo pueden editar libros gratuitos.</div>;
  }
  if (book && book.autor_id !== user.id && user.role !== 'admin' && user.role !== 'moderator') {
    return <div className="max-w-6xl mx-auto p-6">No tienes permiso para editar este libro.</div>;
  }
  if (!book) return <div className="max-w-6xl mx-auto p-6 opacity-70">Cargando...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="font-serif text-2xl font-bold mb-4">Editar libro</h1>
      <Editor book={book} chapters={chapters} onSaved={load} user={user} />
    </div>
  );
}

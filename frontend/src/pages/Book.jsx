import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Reader from '../components/Reader.jsx';
import Comments from '../components/Comments.jsx';
import FavoritesButton from '../components/FavoritesButton.jsx';
import RatingStars from '../components/RatingStars.jsx';

export default function Book() {
  const { bookId } = useParams();
  const { user } = useAuth();
  const [book, setBook] = useState(null);
  const [chapters, setCh] = useState([]);

  useEffect(() => {
    api.get('/api/books/' + bookId).then(r => {
      if (!r.__error) { setBook(r.book); setCh(r.chapters || []); }
    });
  }, [bookId]);

  if (!book) return <div className="max-w-6xl mx-auto p-6 opacity-70">Cargando libro...</div>;

  const isOwner = user && user.sub === book.author_id;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      <header className="card p-6">
        <h1 className="font-serif text-3xl font-bold text-bookedBrown">{book.title}</h1>
        {book.subtitle && <div className="opacity-80">{book.subtitle}</div>}
        <div className="text-sm opacity-70 mt-1">
          por <strong>{book.author_name}</strong> · {book.category} · {book.age_group}
        </div>
        <p className="mt-3 whitespace-pre-wrap">{book.description}</p>
        <div className="mt-4 flex flex-wrap gap-3 items-center">
          <FavoritesButton bookId={bookId} initial={false} />
          <RatingStars bookId={bookId} />
          {book.original_file && book.original_public && (
            <a className="btn-ghost text-sm" href={'/storage/' + book.original_file} download>
              ⬇ Descargar archivo original
            </a>
          )}
          {(isOwner || (user && user.role === 'admin')) && (
            <Link className="btn-ghost text-sm" to={'/book/' + bookId + '/edit'}>Editar</Link>
          )}
        </div>
      </header>

      <Reader book={book} chapters={chapters} />
      <Comments bookId={bookId} />
    </div>
  );
}

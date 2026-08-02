import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { safeUrl } from '../api/safe.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Reader from '../components/Reader.jsx';
import Comments from '../components/Comments.jsx';
import FavoritesButton from '../components/FavoritesButton.jsx';
import RatingStars from '../components/RatingStars.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';

export default function Book() {
  const { bookId } = useParams();
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  const [book, setBook] = useState(null);
  const [chapters, setCh] = useState([]);
  const [favorited, setFav] = useState(false);
  const [userRating, setUR] = useState(0);
  const [bookmark, setBookmark] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const fetched = useRef(null);
  const viewTimer = useRef(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    setLoadError(null);
    if (fetched.current !== bookId) {
      fetched.current = bookId;
      api.get('/api/libros/' + bookId).then(r => {
        if (cancelledRef.current) return;
        if (r.__error) { setLoadError(r.error || 'Error al cargar el libro'); return; }
        setBook(r.libro);
        setCh(r.capitulos || []);
        setFav(r.favorited || false);
        setUR(r.calificacion_usuario || 0);
        setBookmark(r.marcador || null);
      }).catch(err => {
        if (!cancelledRef.current) setLoadError(err?.message || 'Error de conexión');
      });
    }
    viewTimer.current = setTimeout(() => {
      api.post('/api/libros/' + bookId + '/vista');
    }, 10000);
    return () => { clearTimeout(viewTimer.current); cancelledRef.current = true; };
  }, [bookId]);

  if (loadError) return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="rm-card p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="text-5xl opacity-40">📖</div>
        <h2 className="font-serif text-xl font-bold text-foxBrown">Error al cargar el libro</h2>
        <p className="text-sm opacity-70">{loadError}</p>
        <button className="btn-primary text-sm" onClick={() => { fetched.current = null; setLoadError(null); }}>
          Intentar de nuevo
        </button>
      </div>
    </div>
  );

  if (!book) return (
    <div className="max-w-6xl mx-auto px-4 py-12 animate-pulse space-y-4">
      <div className="rm-card p-6">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="w-36 h-52 rounded-lg bg-foxBrown/10 shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-8 w-3/4 rounded bg-foxBrown/10" />
            <div className="h-4 w-1/2 rounded bg-foxBrown/10" />
            <div className="h-4 w-1/3 rounded bg-foxBrown/10" />
            <div className="h-20 w-full rounded bg-foxBrown/10" />
          </div>
        </div>
      </div>
      <div className="h-48 rounded-lg bg-foxBrown/5" />
    </div>
  );

  const isOwner = user && user.id === book.autor_id;

  const bookAuthor = book.nombre_autor || book.autor_id || 'Autor desconocido';
  const bookCategory = cap(book.categoria) || 'General';
  const bookAge = cap(book.grupo_edad) || 'General';

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      <header className="rm-card p-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {book.url_portada && (
            <div className="shrink-0">
              <img src={safeUrl(book.url_portada)} alt={book.titulo}
                   className="w-36 h-52 object-cover rounded-lg shadow-md" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-3xl font-bold text-foxBrown">{book.titulo || 'Sin título'}</h1>
            {book.subtitulo && <div className="opacity-80">{book.subtitulo}</div>}
            <div className="text-sm opacity-70 mt-1">
              por <strong>{bookAuthor}</strong> · <span className="rm-tag">{bookCategory}</span> · {bookAge}
            </div>
            <p className="mt-3 whitespace-pre-wrap">{book.descripcion || 'Sin descripción disponible.'}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 items-center">
          <FavoritesButton bookId={bookId} initial={favorited} />
          <RatingStars bookId={bookId} initial={userRating} />
          {book.archivo_original && book.original_publico && (
            <a className="btn-ghost text-sm" href={'/storage/' + book.archivo_original} download>
              ⬇ Descargar archivo original
            </a>
          )}
          {(isOwner || (user && (user.role === 'admin' || user.role === 'moderator'))) && (
            <Link className="btn-ghost text-sm" to={'/book/' + bookId + '/edit'}>Editar</Link>
          )}
          {isAdmin() && (
            <button className="btn-ghost text-sm text-red-600" onClick={async () => {
              const r = await api.post('/api/libros/' + bookId + '/reiniciar-vistas');
              if (!r.__error) { setBook(b => ({ ...b, vistas: 0 })); toast.ok('Vistas reiniciadas'); }
            }}>Reiniciar vistas</button>
          )}
        </div>
      </header>

      <ErrorBoundary fallback={(err, reset) => (
        <div className="rm-card p-8 text-center space-y-3">
          <div className="text-4xl opacity-40">📖</div>
          <p className="font-bold">Error en el lector</p>
          <p className="text-sm opacity-70">{err?.message || 'El lector no pudo cargar.'}</p>
          <button className="btn-primary text-sm" onClick={reset}>Reintentar</button>
        </div>
      )}>
        <Reader book={book} chapters={chapters} bookmark={bookmark} />
      </ErrorBoundary>

      <ErrorBoundary>
        <Comments bookId={bookId} />
      </ErrorBoundary>
    </div>
  );
}

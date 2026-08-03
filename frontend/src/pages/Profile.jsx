import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { useNavigate, Link } from 'react-router-dom';

export default function Profile() {
  const { user, logout, canCreate } = useAuth();
  const [books, setBooks] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading]     = useState(true);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    Promise.all([
      api.get('/api/libros?autor_id=' + user.id + '&estado=all').then(r => setBooks(r.libros || [])),
      api.get('/api/marcadores').then(r => setBookmarks(r.marcadores || [])),
    ]).finally(() => setLoading(false));
  }, [user, navigate]);

  async function deleteBook(id) {
    const ok = window.confirm('¿Estás seguro de borrar este libro? No se puede deshacer.');
    if (!ok) return;
    const r = await api.del('/api/libros/' + id);
    if (r && r.__error) return;
    toast.ok('Libro borrado');
    setBooks(prev => prev.filter(b => b.id !== id));
  }

  async function createBook() {
    const r = await api.post('/api/libros', {
      titulo: 'Nuevo libro', descripcion: '',
      categoria: 'narrativa', grupo_edad: 'adulto'
    });
    if (!r.__error) navigate('/book/' + r.libro.id + '/edit');
  }

  async function unmarkBook(bookId) {
    const r = await api.del('/api/marcadores/' + bookId);
    if (!r.__error) {
      setBookmarks(prev => prev.filter(b => b.id !== bookId));
      toast.ok('Marcador eliminado');
    }
  }

  async function finishBook(bookId) {
    const r = await api.put('/api/marcadores/' + bookId + '/terminar', { terminado: true });
    if (!r.__error) {
      setBookmarks(prev => prev.map(b => b.id === bookId ? { ...b, terminado: true } : b));
      toast.ok('Libro terminado');
    }
  }

  if (!user) return null;

  function statusLabel(s) {
    return s === 'publicado' ? 'Publicado' : s === 'borrador' ? 'Borrador' : s === 'eliminado' ? 'Eliminado' : s;
  }

  // Separar marcadores activos de terminados
  const active = bookmarks.filter(b => !b.terminado);
  const finished = bookmarks.filter(b => b.terminado);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <header className="card p-6">
        <h1 className="font-serif text-2xl font-bold">{user.nombre_mostrado || user.email}</h1>
        <div className="text-xs opacity-70">{user.email} · rol: {user.role}</div>
        <div className="mt-3 flex gap-2">
          {canCreate() && <button className="btn-primary" onClick={createBook}>+ Nuevo libro</button>}
          <button className="btn-ghost" onClick={logout}>Cerrar sesión</button>
        </div>
      </header>

      <section>
        <h2 className="font-serif text-xl font-bold mb-2">Marcadores · en curso ({active.length})</h2>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="animate-pulse card p-3 flex items-center gap-3">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-foxBrown/10 rounded w-48"></div>
                  <div className="h-3 bg-foxBrown/10 rounded w-32"></div>
                </div>
                <div className="h-8 bg-foxBrown/10 rounded w-16"></div>
                <div className="h-8 bg-foxBrown/10 rounded w-16"></div>
              </div>
            ))}
          </div>
        ) : active.length === 0 ? (
          <p className="opacity-70 text-sm">No tienes libros marcados. Empieza a leer y vuelve aquí.</p>
        ) : (
          <ul className="space-y-2">
            {active.map(b => (
              <li key={b.id} className="card p-3 flex items-center gap-3">
                <Link to={'/book/' + b.id} className="flex-1">
                  <div className="font-semibold">{b.titulo}</div>
                  <div className="text-xs opacity-70">
                    por {b.nombre_autor} · {b.indice_capitulo != null ? `cap. ${b.indice_capitulo + 1}` : 'inicio'}
                  </div>
                </Link>
                <Link to={'/book/' + b.id} className="btn-ghost text-xs">▶ Continuar</Link>
                <button className="btn-ghost text-xs"
                        onClick={() => finishBook(b.id)}>
                  ✓ Terminar
                </button>
                <button className="btn-ghost text-xs text-red-500 border-red-200 hover:bg-red-50"
                        onClick={() => unmarkBook(b.id)}
                        title="Quitar marcador">
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {finished.length > 0 && (
        <section>
          <h2 className="font-serif text-xl font-bold mb-2">Terminados ({finished.length})</h2>
          <ul className="space-y-2">
            {finished.map(b => (
              <li key={b.id} className="card p-3 flex items-center gap-3">
                <Link to={'/book/' + b.id} className="flex-1">
                  <div className="font-semibold">{b.titulo} <span className="text-xs opacity-70">✓ terminado</span></div>
                  <div className="text-xs opacity-70">por {b.nombre_autor}</div>
                </Link>
                <button className="btn-ghost text-xs text-red-500 border-red-200 hover:bg-red-50"
                        onClick={() => unmarkBook(b.id)}
                        title="Quitar marcador">
                  ✕ Desmarcar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-serif text-xl font-bold mb-2">Mis libros</h2>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="animate-pulse card p-3 flex items-center gap-3">
                <div className="h-4 bg-foxBrown/10 rounded w-40"></div>
                <div className="h-3 bg-foxBrown/10 rounded w-16 ml-auto"></div>
                <div className="h-8 bg-foxBrown/10 rounded w-14"></div>
                <div className="h-8 bg-foxBrown/10 rounded w-14"></div>
              </div>
            ))}
          </div>
        ) : books.length === 0 ? (
          <p className="opacity-70 text-sm">Aún no has creado libros.</p>
        ) : (
          <ul className="space-y-2">
            {books.map(b => (
              <li key={b.id} className="card p-3 flex items-center gap-3">
                <Link to={'/book/' + b.id} className="flex-1 font-semibold">{b.titulo}</Link>
                <span className="text-xs opacity-70">{statusLabel(b.estado)}</span>
                <Link to={'/book/' + b.id + '/edit'} className="btn-ghost text-xs">Editar</Link>
                <button className="btn-ghost text-xs text-red-500 border-red-200 hover:bg-red-50" onClick={() => deleteBook(b.id)}>Borrar</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

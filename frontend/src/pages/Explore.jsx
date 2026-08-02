import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import BookList from '../components/BookList.jsx';
import AuthorCard from '../components/AuthorCard.jsx';
import FiltersPanel from '../components/FiltersPanel.jsx';
import { cardEntrance } from '../components/animations/animations.js';

export default function Explore() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('books');
  const [filter, setFilter] = useState({ q: params.get('q') || '',
    categoria: params.get('categoria') || '',
    grupo_edad: params.get('grupo_edad') || '' });
  const paramsStrRef = useRef(params.toString());

  useEffect(() => {
    const curr = params.toString();
    if (curr === paramsStrRef.current) return;
    paramsStrRef.current = curr;
    const q = params.get('q') || '';
    const categoria = params.get('categoria') || '';
    const grupo_edad = params.get('grupo_edad') || '';
    if (q !== filter.q || categoria !== filter.categoria || grupo_edad !== filter.grupo_edad) {
      setFilter({ q, categoria, grupo_edad });
    }
  }, [params, filter]);

  const [debouncedFilter, setDebouncedFilter] = useState(filter);
  const debounceTimer = useRef(null);

  const debouncedSetFilter = useCallback((next) => {
    setFilter(next);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedFilter(next), 300);
  }, []);

  const [books, setBooks]   = useState([]);
  const [authors, setAuthors] = useState([]);
  const [loading, setLoad]  = useState(false);
  const authorsRef = useRef(null);

  useEffect(() => {
    const abort = new AbortController();
    setLoad(true);
    if (tab === 'books') {
      const q = new URLSearchParams();
      if (debouncedFilter.q)         q.set('q', debouncedFilter.q);
      if (debouncedFilter.categoria)  q.set('categoria', debouncedFilter.categoria);
      if (debouncedFilter.grupo_edad) q.set('grupo_edad', debouncedFilter.grupo_edad);
      setParams(q);
      api.get('/api/libros?' + q.toString()).then(r => {
        if (abort.signal.aborted) return;
        setBooks(r.libros || []); setLoad(false);
      });
    } else {
      const qs = debouncedFilter.q ? '?q=' + encodeURIComponent(debouncedFilter.q) : '';
      setParams(new URLSearchParams(debouncedFilter.q ? { q: debouncedFilter.q } : {}));
      api.get('/api/busqueda/autores' + qs).then(r => {
        if (abort.signal.aborted) return;
        setAuthors(r.autores || []); setLoad(false);
      });
    }
    return () => abort.abort();
  }, [debouncedFilter, tab, setParams]);

  useEffect(() => {
    if (authorsRef.current && authors.length) {
      cardEntrance(authorsRef.current.querySelectorAll('[data-book-card]'));
    }
  }, [authors]);

  useEffect(() => {
    document.body.classList.add('has-main-bg');
    return () => { document.body.classList.remove('has-main-bg'); };
  }, []);

  const resultCount = tab === 'books' ? books.length : authors.length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold">Explorar</h1>
        {resultCount > 0 && (
          <span className="text-xs opacity-50">{resultCount} resultado{resultCount !== 1 ? 's' : ''}</span>
        )}
      </div>

      <div className="flex gap-2 border-b border-foxBrown/15 pb-2">
        <button className={'explore-tab ' + (tab === 'books' ? 'explore-tab--active' : '')}
                onClick={() => setTab('books')}>
          📚 Libros
        </button>
        <button className={'explore-tab ' + (tab === 'authors' ? 'explore-tab--active' : '')}
                onClick={() => setTab('authors')}>
          ✍ Autores
        </button>
      </div>

      <FiltersPanel value={filter} onChange={debouncedSetFilter} />

      {loading ? (
        tab === 'books' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="animate-pulse card p-4 space-y-3">
                <div className="h-5 bg-foxBrown/10 rounded w-3/4"></div>
                <div className="h-3 bg-foxBrown/10 rounded w-1/2"></div>
                <div className="h-3 bg-foxBrown/10 rounded w-full"></div>
                <div className="h-3 bg-foxBrown/10 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse card p-4 space-y-3">
                <div className="h-5 bg-foxBrown/10 rounded w-1/2"></div>
                <div className="h-3 bg-foxBrown/10 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        )
      ) : tab === 'books' ? (
        books.length === 0 ? (
          <div className="text-center py-12 opacity-60">
            <div className="text-4xl mb-2">📚</div>
            <p className="text-sm">No se encontraron libros con estos filtros.</p>
          </div>
        ) : (
          <BookList books={books} />
        )
      ) : (
        <div ref={authorsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {authors.length === 0 ? (
            <div className="text-center py-12 opacity-60 col-span-full">
              <div className="text-4xl mb-2">✍</div>
              <p className="text-sm">No se encontraron autores con libros publicados.</p>
            </div>
          ) : (
            authors.map(a => <AuthorCard key={a.id} author={a} />)
          )}
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
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
    category: params.get('category') || '',
    age_group: params.get('age_group') || '' });
  const paramsStrRef = useRef(params.toString());

  useEffect(() => {
    const curr = params.toString();
    if (curr === paramsStrRef.current) return;
    paramsStrRef.current = curr;
    const q = params.get('q') || '';
    const category = params.get('category') || '';
    const age_group = params.get('age_group') || '';
    if (q !== filter.q || category !== filter.category || age_group !== filter.age_group) {
      setFilter({ q, category, age_group });
    }
  }, [params, filter]);
  const [books, setBooks]   = useState([]);
  const [authors, setAuthors] = useState([]);
  const [loading, setLoad]  = useState(false);
  const authorsRef = useRef(null);

  useEffect(() => {
    const abort = new AbortController();
    setLoad(true);
    if (tab === 'books') {
      const q = new URLSearchParams();
      if (filter.q)         q.set('q', filter.q);
      if (filter.category)  q.set('category', filter.category);
      if (filter.age_group) q.set('age_group', filter.age_group);
      setParams(q);
      api.get('/api/books?' + q.toString()).then(r => {
        if (abort.signal.aborted) return;
        setBooks(r.books || []); setLoad(false);
      });
    } else {
      const qs = filter.q ? '?q=' + encodeURIComponent(filter.q) : '';
      setParams(new URLSearchParams(filter.q ? { q: filter.q } : {}));
      api.get('/api/search/authors' + qs).then(r => {
        if (abort.signal.aborted) return;
        setAuthors(r.authors || []); setLoad(false);
      });
    }
    return () => abort.abort();
  }, [filter, tab, setParams]);

  useEffect(() => {
    if (authorsRef.current && authors.length) {
      cardEntrance(authorsRef.current.querySelectorAll('[data-book-card]'));
    }
  }, [authors]);

  useEffect(() => {
    document.body.classList.add('has-main-bg');
    return () => { document.body.classList.remove('has-main-bg'); };
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      <h1 className="font-serif text-2xl font-bold">Explorar</h1>
      <div className="flex gap-2 border-b border-bookshelfBrown/15 pb-2">
        <button className={'btn-ghost text-sm ' + (tab === 'books' ? 'bg-bookshelfBrown text-parchment' : '')}
                onClick={() => setTab('books')}>Libros</button>
        <button className={'btn-ghost text-sm ' + (tab === 'authors' ? 'bg-bookshelfBrown text-parchment' : '')}
                onClick={() => setTab('authors')}>Autores</button>
      </div>
      <FiltersPanel value={filter} onChange={setFilter} />
      {loading ? (
        tab === 'books' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse card p-4 space-y-3">
                <div className="h-5 bg-bookshelfBrown/10 rounded w-3/4"></div>
                <div className="h-3 bg-bookshelfBrown/10 rounded w-1/2"></div>
                <div className="h-3 bg-bookshelfBrown/10 rounded w-full"></div>
                <div className="h-3 bg-bookshelfBrown/10 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse card p-4 space-y-3">
                <div className="h-5 bg-bookshelfBrown/10 rounded w-1/2"></div>
                <div className="h-3 bg-bookshelfBrown/10 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        )
      ) : tab === 'books' ? (
        <BookList books={books} />
      ) : (
        <div ref={authorsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {authors.length === 0 && <div className="opacity-70 text-sm col-span-full">No se encontraron autores con libros publicados.</div>}
          {authors.map(a => <AuthorCard key={a.id} author={a} />)}
        </div>
      )}
    </div>
  );
}

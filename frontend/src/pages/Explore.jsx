import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import BookList from '../components/BookList.jsx';
import FiltersPanel from '../components/FiltersPanel.jsx';

export default function Explore() {
  const [params, setParams] = useSearchParams();
  const initial = { q: params.get('q') || '',
                    category: params.get('category') || '',
                    age_group: params.get('age_group') || '' };
  const [filter, setFilter] = useState(initial);
  const [books, setBooks]   = useState([]);
  const [loading, setLoad]  = useState(false);

  useEffect(() => {
    setLoad(true);
    const q = new URLSearchParams();
    if (filter.q)         q.set('q', filter.q);
    if (filter.category)  q.set('category', filter.category);
    if (filter.age_group) q.set('age_group', filter.age_group);
    setParams(q);
    api.get('/api/books?' + q.toString()).then(r => {
      setBooks(r.books || []); setLoad(false);
    });
  }, [filter]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      <h1 className="font-serif text-2xl font-bold">Explorar</h1>
      <FiltersPanel value={filter} onChange={setFilter} />
      {loading ? <div className="opacity-70">Cargando...</div> : <BookList books={books} />}
    </div>
  );
}

import { useEffect, useRef } from 'react';
import BookCard from './BookCard.jsx';
import { bookEntrance } from './animations/animations.js';

export default function BookList({ books }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && books && books.length) {
      bookEntrance(ref.current.querySelectorAll('[data-book-card]'));
    }
  }, [books]);

  if (!books || !books.length) {
    return <div className="opacity-70 text-sm">No hay libros para mostrar todavía.</div>;
  }
  return (
    <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
      {books.map(b => <BookCard key={b.id} book={b} />)}
    </div>
  );
}

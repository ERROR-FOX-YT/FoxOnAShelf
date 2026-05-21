import { Link } from 'react-router-dom';

export default function BookCard({ book }) {
  return (
    <Link to={'/book/' + book.id}
          className="card p-4 block hover:translate-y-[-2px] transition-transform"
          data-book-card>
      <div className="font-serif text-lg font-bold text-bookedBrown">{book.title}</div>
      {book.subtitle && <div className="text-sm opacity-80">{book.subtitle}</div>}
      <div className="text-xs opacity-70 mt-1">
        {book.author_name && <span>por {book.author_name} · </span>}
        {book.category} · {book.age_group}
      </div>
      <div className="mt-3 text-xs flex gap-3 opacity-70">
        <span>👁 {book.views || 0}</span>
        <span>★ {book.favorite_count || 0}</span>
      </div>
    </Link>
  );
}

import { Link } from 'react-router-dom';

function Decor({ variant = 'top' }) {
  return (
    <div className="book-card__decor" aria-hidden="true">
      <span className="book-card__decor-line" />
      <span className="book-card__decor-dot" />
      <span className="book-card__decor-diamond" />
      <span className="book-card__decor-line" style={{ flex: '0.4' }} />
      <span className="book-card__decor-diamond" style={{ width: 5, height: 5 }} />
      <span className="book-card__decor-line" style={{ flex: '0.4' }} />
      <span className="book-card__decor-diamond" />
      <span className="book-card__decor-dot" />
      <span className="book-card__decor-line" />
    </div>
  );
}

export default function BookCard({ book }) {
  if (!book) return null;
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  return (
    <Link to={'/book/' + book.id}
          className="book-card"
          data-book-card>
      <Decor variant="top" />
      <div className="font-serif text-lg font-bold leading-tight" style={{ color: 'var(--book-text)' }}>
        {book.title}
      </div>
      {book.subtitle && (
        <div className="text-sm mt-0.5" style={{ color: 'var(--book-text-muted)' }}>
          {book.subtitle}
        </div>
      )}
      <div className="text-xs mt-2" style={{ color: 'var(--book-text-muted)' }}>
        {book.author_name && <span>por <strong style={{ color: 'var(--book-text)' }}>{book.author_name}</strong> · </span>}
        <span className="rm-tag">{cap(book.category)}</span> · {cap(book.age_group)}
      </div>
      <Decor />
      <div className="flex gap-3 text-xs" style={{ color: 'var(--book-text-muted)' }}>
        <span>Visitas: {book.views || 0}</span>
        <span>Favoritos: {book.favorite_count || 0}</span>
      </div>
    </Link>
  );
}

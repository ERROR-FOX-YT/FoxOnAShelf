import { memo } from 'react';
import { Link } from 'react-router-dom';
import ReadingProgress from './ReadingProgress.jsx';

function Decor() {
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

function BookCard({ book }) {
  if (!book) return null;
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  return (
    <Link to={'/book/' + book.id}
          className="book-card"
          data-book-card>
      <Decor />
      <div className="font-serif text-lg font-bold leading-tight" style={{ color: 'var(--book-text)' }}>
        {book.titulo}
      </div>
      <div className="text-sm mt-0.5 min-h-[1.25rem]" style={{ color: 'var(--book-text-muted)' }}>
        {book.subtitulo || '\u00A0'}
      </div>
      <div className="text-xs mt-2" style={{ color: 'var(--book-text-muted)' }}>
        {book.nombre_autor && <span>por <strong style={{ color: 'var(--book-text)' }}>{book.nombre_autor}</strong> · </span>}
        <span className="rm-tag">{cap(book.categoria)}</span>
      </div>
      <div className="text-xs mt-1" style={{ color: 'var(--book-text-muted)' }}>
        {cap(book.grupo_edad)}
      </div>
      <Decor />
      <div className="flex gap-3 text-xs" style={{ color: 'var(--book-text-muted)' }}>
        <span>Visitas: {book.vistas || 0}</span>
        <span>Favoritos: {book.conteo_favoritos || 0}</span>
      </div>
      <ReadingProgress bookId={book.id} />
    </Link>
  );
}

export default memo(BookCard);

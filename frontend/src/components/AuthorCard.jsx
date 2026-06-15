import { Link } from 'react-router-dom';

export default function AuthorCard({ author }) {
  if (!author) return null;
  return (
    <Link to={'/author/' + author.id}
          className="rm-card p-4 block"
          data-book-card>
      <div className="font-serif text-lg font-bold text-bookshelfBrown">{author.display_name || author.email}</div>
      <div className="text-xs opacity-70 mt-1">{author.email}</div>
      <div className="mt-3 text-xs opacity-70">
        {author.book_count} libro{author.book_count !== 1 ? 's' : ''} publicado{author.book_count !== 1 ? 's' : ''}
      </div>
    </Link>
  );
}

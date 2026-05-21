import { useParams } from 'react-router-dom';

export default function Collection() {
  const { id } = useParams();
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="font-serif text-2xl font-bold">Colección</h1>
      <div className="opacity-70 mt-2">ID: {id}</div>
      <p className="opacity-70 mt-2 text-sm">
        En esta demo las colecciones se pueden crear desde el panel de autor.
        El esquema ya está en la base de datos (tablas <code>collections</code> y <code>collection_books</code>).
      </p>
    </div>
  );
}

import { useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function RatingStars({ bookId }) {
  const { user } = useAuth();
  const toast = useToast();
  const [v, setV] = useState(0);

  async function rate(n) {
    if (!user) { toast.error('Inicia sesión para calificar'); return; }
    setV(n);
    const r = await api.post('/api/books/' + bookId + '/rate', { rating: n });
    if (!(r && r.__error)) toast.ok('Calificación guardada');
  }
  return (
    <div className="inline-flex gap-1" aria-label="Calificar libro">
      {[1,2,3,4,5].map(n => (
        <button key={n} aria-label={'Calificar con ' + n}
                className={'text-xl ' + (n <= v ? 'text-bookedBrown' : 'opacity-40')}
                onClick={() => rate(n)}>★</button>
      ))}
    </div>
  );
}

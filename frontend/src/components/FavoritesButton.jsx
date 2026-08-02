import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { buttonPulse } from './animations/animations.js';

export default function FavoritesButton({ bookId, initial = false }) {
  const { user } = useAuth();
  const toast = useToast();
  const [fav, setFav] = useState(initial);
  useEffect(() => { setFav(initial); }, [initial]);

  async function toggle(e) {
    buttonPulse(e.currentTarget);
    if (!user) { toast.error('Inicia sesión para guardar favoritos'); return; }
    const r = await api.post('/api/libros/' + bookId + '/favorito');
    if (r && !r.__error) setFav(r.favorited);
  }
  return (
    <button className={'btn-ghost ' + (fav ? 'text-accent-secondary font-semibold' : '')} onClick={toggle}>
      {fav ? '★ Favorito' : '☆ Favorito'}
    </button>
  );
}

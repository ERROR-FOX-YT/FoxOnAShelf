import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useState } from 'react';
import { buttonPulse } from './animations/animations.js';

export default function Header() {
  const { user, logout, isAdmin, isModerator } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [openMenu, setOpenMenu] = useState(false);

  function onSearch(e) {
    e.preventDefault();
    if (q.trim()) navigate('/explore?q=' + encodeURIComponent(q.trim()));
  }

  return (
    <header className="border-b border-bookshelfBrown/15 bg-parchment/80 dark:bg-nightGray/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
        <Link to="/" className="font-serif text-xl font-bold text-bookshelfBrown">
          BookShelf<sup className="text-xs">™</sup>
        </Link>
        <nav className="hidden md:flex items-center gap-4 text-sm">
          <Link to="/explore">Explorar</Link>
          <Link to="/announcements">Anuncios</Link>
          {user && <Link to="/profile">Mi perfil</Link>}
          {user && <Link to="/library">Mis imágenes</Link>}
          {isAdmin() && <Link to="/admin">Admin</Link>}
          {isModerator() && <Link to="/admin/moderation" className="font-semibold text-bookshelfBrown">Moderación</Link>}
        </nav>
        <form onSubmit={onSearch} className="flex-1 max-w-md ml-auto">
           <input className="rm-search" placeholder="Buscar libros, autores, categorías..."
                 value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar" />
        </form>
        <button onClick={(e) => { buttonPulse(e.currentTarget); toggle(); }}
                className="btn-ghost text-xs" aria-label="Cambiar tema">
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        {user ? (
          <div className="relative">
            <button onClick={() => setOpenMenu(o => !o)} className="btn-ghost text-sm">
              {user.display_name || user.email}
            </button>
            {openMenu && (
              <div className="absolute right-0 mt-2 w-48 card p-3 text-sm">
                <div className="font-semibold mb-1">Sesión activa</div>
                <div className="truncate opacity-80 mb-3">{user.email}</div>
                <button onClick={() => { setOpenMenu(false); logout(); }} className="btn-primary w-full text-center">Cerrar sesión</button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login" className="rm-btn-primary text-sm">Entrar</Link>
        )}
      </div>
    </header>
  );
}

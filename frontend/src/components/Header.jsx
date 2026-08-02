import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useState, useRef, useEffect } from 'react';
import { buttonPulse } from './animations/animations.js';

export default function Header() {
  const { user, logout, isAdmin, isModerator } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!openMenu) return;
    function onDocClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [openMenu]);

  function onSearch(e) {
    e.preventDefault();
    if (q.trim()) navigate('/explore?q=' + encodeURIComponent(q.trim()));
  }

  return (
    <header className="border-b border-foxBrown/15 bg-parchment/80 dark:bg-nightGray/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
        <Link to="/" className="font-serif text-xl font-bold flex items-baseline">
          <span style={{ color: 'var(--logo-a)' }}>Fox</span>
          <span style={{ color: 'var(--logo-b)' }}>On</span>
          <span style={{ color: 'var(--logo-a)' }}>A</span>
          <span style={{ color: 'var(--logo-b)' }}>Shelf</span>
          <sup className="text-xs ml-0.5" style={{ color: 'var(--logo-a)' }}>™</sup>
        </Link>
        <nav className="hidden md:flex items-center gap-4 text-sm">
          <Link to="/explore">Explorar</Link>
          <Link to="/anuncios">Anuncios</Link>
          <Link to="/foros">Foros</Link>
          {user && <Link to="/profile">Mi perfil</Link>}
          {user && <Link to="/library">Mis imágenes</Link>}
          {isAdmin() && <Link to="/admin">Admin</Link>}
          {isModerator() && <Link to="/admin/moderation" className="font-semibold text-foxBrown">Moderación</Link>}
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
          <div className="relative" ref={menuRef}>
            <button onClick={() => setOpenMenu(o => !o)} className="btn-ghost text-sm">
              {user.nombre_mostrado || user.email}
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

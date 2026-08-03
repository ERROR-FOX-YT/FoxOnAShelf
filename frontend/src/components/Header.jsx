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
  const [openMobile, setOpenMobile] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!openMenu) return;
    function onDocClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [openMenu]);

  useEffect(() => {
    if (openMobile) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [openMobile]);

  function onSearch(e) {
    e.preventDefault();
    if (q.trim()) navigate('/explore?q=' + encodeURIComponent(q.trim()));
  }

  function navLink(to, label, className = '') {
    return (
      <Link to={to} onClick={() => setOpenMobile(false)}
            className={'block py-2 px-3 rounded-lg hover:bg-foxBrown/10 transition-colors min-h-[44px] flex items-center ' + className}>
        {label}
      </Link>
    );
  }

  return (
    <>
      <header className="border-b border-foxBrown/15 bg-parchment/80 dark:bg-nightGray/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="font-serif text-lg sm:text-xl font-bold flex items-baseline shrink-0">
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

          <form onSubmit={onSearch} className="flex-1 max-w-md ml-auto hidden sm:block">
            <input className="rm-search" placeholder="Buscar libros, autores, categorías..."
                  value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar" />
          </form>

          <button onClick={(e) => { buttonPulse(e.currentTarget); toggle(); }}
                  className="btn-ghost text-base min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Cambiar tema">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {user ? (
            <div className="relative" ref={menuRef}>
              <button onClick={() => setOpenMenu(o => !o)} className="btn-ghost text-sm min-h-[44px] px-2 hidden sm:block">
                {user.nombre_mostrado || user.email}
              </button>
              {openMenu && (
                <div className="absolute right-0 mt-2 w-48 card p-3 text-sm">
                  <div className="font-semibold mb-1">Sesión activa</div>
                  <div className="truncate opacity-80 mb-3">{user.email}</div>
                  <button onClick={() => { setOpenMenu(false); logout(); }} className="btn-primary w-full text-center min-h-[44px]">Cerrar sesión</button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="rm-btn-primary text-sm hidden sm:block min-h-[44px] flex items-center">Entrar</Link>
          )}

          <button onClick={() => setOpenMobile(true)}
                  className="md:hidden btn-ghost min-w-[44px] min-h-[44px] flex items-center justify-center text-xl"
                  aria-label="Abrir menú">
            ☰
          </button>
        </div>
      </header>

      {openMobile && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpenMobile(false)} />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-parchment dark:bg-nightGray shadow-xl overflow-y-auto"
               style={{ animation: 'slideIn 0.2s ease-out' }}>
            <div className="p-4 space-y-1">
              <div className="flex items-center justify-between mb-4">
                <Link to="/" onClick={() => setOpenMobile(false)} className="font-serif text-lg font-bold">
                  <span style={{ color: 'var(--logo-a)' }}>Fox</span>
                  <span style={{ color: 'var(--logo-b)' }}>On</span>
                  <span style={{ color: 'var(--logo-a)' }}>A</span>
                  <span style={{ color: 'var(--logo-b)' }}>Shelf</span>
                </Link>
                <button onClick={() => setOpenMobile(false)} className="btn-ghost min-w-[44px] min-h-[44px] flex items-center justify-center text-xl">✕</button>
              </div>

              <form onSubmit={onSearch} className="mb-4 sm:hidden">
                <input className="rm-search w-full" placeholder="Buscar..."
                      value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar" />
              </form>

              {navLink('/explore', '📚 Explorar')}
              {navLink('/anuncios', '📢 Anuncios')}
              {navLink('/foros', '💬 Foros')}
              {user && navLink('/profile', '👤 Mi perfil')}
              {user && navLink('/library', '🖼 Mis imágenes')}
              {isAdmin() && navLink('/admin', '⚙ Admin')}
              {isModerator() && navLink('/admin/moderation', '🛡 Moderación', 'font-semibold text-foxBrown')}

              <div className="border-t border-foxBrown/15 my-3" />

              {user ? (
                <>
                  <div className="px-3 py-2 text-sm">
                    <div className="font-semibold">{user.nombre_mostrado}</div>
                    <div className="text-xs opacity-60 truncate">{user.email}</div>
                  </div>
                  <button onClick={() => { setOpenMobile(false); logout(); }}
                          className="w-full text-left py-2 px-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 min-h-[44px] flex items-center">
                    Cerrar sesión
                  </button>
                </>
              ) : (
                navLink('/login', '🔑 Entrar')
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useState } from 'react';
import { buttonPulse } from './animations/animations.js';

export default function Header() {
  const { user, logout, savedAccounts, isAdmin, isAdminFox } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [openAccts, setOpenAccts] = useState(false);

  function onSearch(e) {
    e.preventDefault();
    if (q.trim()) navigate('/explore?q=' + encodeURIComponent(q.trim()));
  }

  const saved = savedAccounts();

  return (
    <header className="border-b border-bookedBrown/15 bg-parchment/80 dark:bg-nightGray/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
        <Link to="/" className="font-serif text-xl font-bold text-bookedBrown">
          Booked<sup className="text-xs">™</sup>
        </Link>
        <nav className="hidden md:flex items-center gap-4 text-sm">
          <Link to="/explore">Explorar</Link>
          <Link to="/announcements">Anuncios</Link>
          {user && <Link to="/profile">Mi perfil</Link>}
          {isAdmin() && <Link to="/admin">Admin</Link>}
          {isAdmin() && <Link to="/admin/moderation" className="font-semibold text-bookedBrown">Moderación</Link>}
        </nav>
        <form onSubmit={onSearch} className="flex-1 max-w-md ml-auto">
          <input className="input" placeholder="Buscar libros, autores, categorías..."
                 value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar" />
        </form>
        <button onClick={(e) => { buttonPulse(e.currentTarget); toggle(); }}
                className="btn-ghost text-xs" aria-label="Cambiar tema">
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        {user ? (
          <div className="relative">
            <button onClick={() => setOpenAccts(o => !o)} className="btn-ghost text-sm">
              {user.display_name || user.email}
            </button>
            {openAccts && (
              <div className="absolute right-0 mt-2 w-64 card p-3 text-sm">
                <div className="font-semibold mb-1">Sesión activa</div>
                <div className="truncate">{user.email}</div>
                <hr className="my-2 border-bookedBrown/20" />
                <div className="font-semibold mb-1">Cuentas guardadas (max 3)</div>
                <ul className="space-y-1">
                  {saved.map(a => (
                    <li key={a.email} className="truncate">
                      <button className="hover:underline" onClick={() => { setOpenAccts(false); navigate('/login?email=' + encodeURIComponent(a.email)); }}>
                        {a.display_name || a.email}
                      </button>
                    </li>
                  ))}
                  {saved.length === 0 && <li className="opacity-60">No hay cuentas guardadas</li>}
                </ul>
                <hr className="my-2 border-bookedBrown/20" />
                <button onClick={logout} className="btn-primary w-full">Cerrar sesión</button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login" className="btn-primary text-sm">Entrar</Link>
        )}
      </div>
    </header>
  );
}

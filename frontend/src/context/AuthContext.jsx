import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, bindRuntime, criticalPost } from '../api/client.js';
import { useToast } from './ToastContext.jsx';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const toast    = useToast();

  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bookshelf.user') || 'null'); }
    catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { bindRuntime({ toast, navigate }); }, [toast, navigate]);

  useEffect(() => {
    const stored = localStorage.getItem('bookshelf.user');
    if (!stored) { setLoading(false); return; }
    let cancelled = false;
    try {
      const u = JSON.parse(stored);
      if (u && u.id) {
        api.get('/api/usuarios/' + u.id).then(r => {
          if (cancelled) return;
          if (r.__error) {
            if (r.code === 401) {
              localStorage.removeItem('bookshelf.token');
              localStorage.removeItem('bookshelf.refreshToken');
              localStorage.removeItem('bookshelf.user');
              setUser(null);
            }
          } else if (r.user) {
            localStorage.setItem('bookshelf.user', JSON.stringify(r.user));
            setUser(r.user);
          }
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    } catch {
      if (!cancelled) setLoading(false);
    }
    return () => { cancelled = true; };
  }, []);

  async function login(email, password) {
    const r = await api.post('/api/auth/iniciar-sesion', { email, password });
    if (r && r.__error) {
      if (r.baneado) return { baneado: true, puede_apelar: r.puede_apelar, motivo: r.motivo };
      if (r.code === 401)            return { error: 'Credenciales inválidas' };
      return { error: r.error || 'Error al iniciar sesión' };
    }
    localStorage.setItem('bookshelf.token', r.token);
    localStorage.setItem('bookshelf.refreshToken', r.refreshToken);
    localStorage.setItem('bookshelf.user', JSON.stringify(r.user));
    setUser(r.user);
    toast.ok('Sesión iniciada');
    return { ok: true };
  }

  async function register(email, password, nombre_mostrado) {
    const r = await criticalPost('/api/auth/registro', { email, password, nombre_mostrado });
    if (r && r.__error) return { error: r.error, huevo_pascua: r.huevo_pascua, emoji: r.emoji };
    localStorage.setItem('bookshelf.token', r.token);
    localStorage.setItem('bookshelf.refreshToken', r.refreshToken);
    localStorage.setItem('bookshelf.user', JSON.stringify(r.user));
    setUser(r.user);
    toast.ok('Cuenta creada');
    return { ok: true };
  }

  function logout() {
    const token = localStorage.getItem('bookshelf.token');
    if (token) {
      fetch('/api/auth/salir', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
      }).catch(() => {});
    }
    localStorage.removeItem('bookshelf.token');
    localStorage.removeItem('bookshelf.refreshToken');
    localStorage.removeItem('bookshelf.user');
    localStorage.removeItem('bookshelf.savedAccounts');
    setUser(null);
    toast.info('Sesión cerrada');
    navigate('/login');
  }

  async function submitAppeal(email, apelacion) {
    const r = await api.post('/api/auth/apelar', { email, apelacion });
    if (r && r.__error) return { error: r.error };
    return { ok: true };
  }

  function isAdmin()      { return user && user.role === 'admin'; }
  function isModerator()  { return user && ['admin','moderator'].includes(user.role); }
  function canCreate()    { return !!user; }

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout, submitAppeal,
                               isAdmin, isModerator, canCreate }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

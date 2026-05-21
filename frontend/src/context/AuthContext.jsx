import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, bindRuntime, criticalPost } from '../api/client';
import { useToast } from './ToastContext';

const AuthCtx = createContext(null);

const SAVED_KEY = 'booked.savedAccounts'; // hasta 3 cuentas guardadas

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const toast    = useToast();

  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('booked.user') || 'null'); }
    catch { return null; }
  });

  useEffect(() => { bindRuntime({ toast, navigate }); }, [toast, navigate]);

  async function login(email, password) {
    const r = await api.post('/api/auth/login', { email, password });
    if (r && r.__error) {
      if (r.banned && r.can_appeal) return { banned: true, can_appeal: true, reason: r.reason };
      if (r.banned)                 return { banned: true, can_appeal: false, reason: r.reason };
      return { error: r.error };
    }
    localStorage.setItem('booked.token', r.token);
    localStorage.setItem('booked.user', JSON.stringify(r.user));
    setUser(r.user);
    rememberAccount(r.user);
    toast.ok('Sesión iniciada');
    return { ok: true };
  }

  async function register(email, password, display_name) {
    const r = await criticalPost('/api/auth/register', { email, password, display_name });
    if (r && r.__error) return { error: r.error };
    localStorage.setItem('booked.token', r.token);
    localStorage.setItem('booked.user', JSON.stringify(r.user));
    setUser(r.user);
    rememberAccount(r.user);
    toast.ok('Cuenta creada');
    return { ok: true };
  }

  function logout() {
    localStorage.removeItem('booked.token');
    localStorage.removeItem('booked.user');
    setUser(null);
    toast.info('Sesión cerrada');
    navigate('/login');
  }

  async function submitAppeal(email, appeal) {
    const r = await api.post('/api/auth/appeal', { email, appeal });
    if (r && r.__error) return { error: r.error };
    return { ok: true };
  }

  function rememberAccount(u) {
    try {
      const list = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
      const filtered = list.filter(x => x.email.toLowerCase() !== u.email.toLowerCase());
      const next = [{ email: u.email, display_name: u.display_name }, ...filtered].slice(0, 3);
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    } catch {}
  }

  function savedAccounts() {
    try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); }
    catch { return []; }
  }

  function isAdmin()   { return user && user.role === 'admin'; }
  function isAdminFox(){ return user && user.role === 'admin' && user.is_admin_fox; }
  function isCreator() { return user && (user.role === 'creator' || user.role === 'admin'); }

  return (
    <AuthCtx.Provider value={{ user, login, register, logout, submitAppeal,
                               savedAccounts, isAdmin, isAdminFox, isCreator }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

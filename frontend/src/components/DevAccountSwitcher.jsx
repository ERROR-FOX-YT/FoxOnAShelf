import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { apiBase } from '../api/client.js';
import './DevAccountSwitcher.css';

const ACCOUNTS = [
  { email: 'adminfox@foxonashelf.app',     password: 'error_foxsam2008', label: 'Admin',        icon: '🦊' },
  { email: 'ef.samlq@gmail.com',            password: 'error_foxsam2008', label: 'lopezsanty2008', icon: '🎓' },
  { email: 'usuariocomun@foxonashelf.app',  password: 'error_foxsam2008', label: 'Usuario',      icon: '👤' },
];

const EMAILS_AUTORIZADOS = ACCOUNTS.map(a => a.email.toLowerCase().trim());

export default function DevAccountSwitcher() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!import.meta.env.DEV) return null;
  if (!user) return null;

  const currentEmail = (user.email || '').toLowerCase().trim();
  if (!EMAILS_AUTORIZADOS.includes(currentEmail)) return null;

  const others = ACCOUNTS.filter(a => a.email.toLowerCase() !== currentEmail);
  if (!others.length) return null;

  async function switchTo(acc) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch((apiBase() || '') + '/api/auth/iniciar-sesion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: acc.email, password: acc.password }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('bookshelf.token', data.token);
        localStorage.setItem('bookshelf.refreshToken', data.refreshToken);
        localStorage.setItem('bookshelf.user', JSON.stringify(data.user));
        window.location.reload();
      }
    } catch (e) {
      console.warn('[DevSwitch]', e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dev-switch-container">
      {others.map(acc => (
        <button
          key={acc.email}
          className="dev-switch-fab"
          onClick={() => switchTo(acc)}
          disabled={busy}
          title={`Cambiar a ${acc.label} (${acc.email})`}
        >
          <span className="dev-switch-fab__icon">{acc.icon}</span>
          <span className="dev-switch-fab__label">{acc.label}</span>
        </button>
      ))}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../api/client.js';

export default function AdminModeration() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [banned, setBanned] = useState([]);
  const [mods, setMods]     = useState([]);
  const [contact, setContact] = useState('');
  const [ban, setBan] = useState({ email:'', reason:'' });

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!isAdmin()) { navigate('/'); return; }
    loadAll();
    fetch('/api/users/22222222-2222-2222-2222-222222222222')
      .then(r => r.json()).then(j => setContact((j.user && j.user.contact_info) || ''));
  }, [user]);

  async function loadAll() {
    const a = await api.get('/api/moderation/banned');
    if (!a.__error) setBanned(a.banned || []);
    const b = await api.get('/api/moderation/moderators');
    if (!b.__error) setMods(b.moderators || []);
  }

  async function doBan() {
    if (!ban.email || !ban.reason) { toast.error('Email y motivo requeridos'); return; }
    const r = await api.post('/api/moderation/ban', ban);
    if (!r.__error) { setBan({email:'',reason:''}); toast.ok('Usuario baneado'); loadAll(); }
  }

  async function doUnban(email) {
    const r = await api.post('/api/moderation/unban', { email });
    if (!r.__error) { toast.ok('Usuario desbaneado'); loadAll(); }
  }

  async function exportCsv() {
    const res = await fetch('/api/moderation/export-banned', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + localStorage.getItem('booked.token') }
    });
    if (!res.ok) { toast.error('Error exportando'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'banned_users.csv';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast.ok('CSV descargado');
  }

  async function saveContact() {
    const r = await api.put('/api/moderation/contact-info', { contact_info: contact });
    if (!r.__error) toast.ok('Información actualizada');
  }

  if (!user || !isAdmin()) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <h1 className="font-serif text-2xl font-bold">Moderación / Administración</h1>
      <p className="text-sm opacity-70">
        Sólo los administradores principales (<code>admin</code> y <code>adminFox</code>) ven este panel completo.
      </p>

      <section className="card p-4 space-y-2">
        <h2 className="font-serif text-xl font-bold">Banear usuario</h2>
        <div className="flex flex-wrap gap-2">
          <input className="input flex-1 min-w-[180px]" placeholder="correo" type="email"
                 value={ban.email} onChange={e => setBan({...ban, email: e.target.value})} />
          <input className="input flex-1 min-w-[200px]" placeholder="motivo"
                 value={ban.reason} onChange={e => setBan({...ban, reason: e.target.value})} />
          <button className="btn-primary" onClick={doBan}>Banear</button>
        </div>
      </section>

      <section className="card p-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-serif text-xl font-bold">Usuarios baneados</h2>
          <button className="btn-ghost text-sm" onClick={exportCsv}>⬇ Exportar CSV</button>
        </div>
        <table className="w-full text-sm">
          <thead className="opacity-70 text-left">
            <tr><th>Email</th><th>Motivo</th><th>Apelación</th><th>Banneado</th><th>Desbaneado</th><th></th></tr>
          </thead>
          <tbody>
            {banned.length === 0 && <tr><td colSpan="6" className="opacity-70 py-3">No hay baneados.</td></tr>}
            {banned.map(b => (
              <tr key={b.email} className="border-t border-bookedBrown/15">
                <td>{b.email}</td>
                <td>{b.reason}</td>
                <td className="max-w-xs truncate">{b.appeal || '—'}</td>
                <td className="text-xs">{new Date(b.banned_at).toLocaleString()}</td>
                <td className="text-xs">{b.unbanned_at ? new Date(b.unbanned_at).toLocaleString() : '—'}</td>
                <td>{!b.unbanned_at && <button className="btn-ghost text-xs" onClick={() => doUnban(b.email)}>Desbanear</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card p-4">
        <h2 className="font-serif text-xl font-bold mb-2">Moderadores</h2>
        <ul className="text-sm space-y-1">
          {mods.map(m => (
            <li key={m.id} className="flex items-center gap-2">
              <span>{m.display_name || m.email}</span>
              <span className="opacity-60 text-xs">({m.role}{m.is_admin_fox ? ' · adminFox' : ''})</span>
              {m.can_delete && <button className="btn-ghost text-xs ml-auto">Eliminar</button>}
              {!m.can_delete && m.role === 'admin' && <span className="text-xs opacity-50 ml-auto">protegido</span>}
            </li>
          ))}
        </ul>
        <p className="text-xs opacity-70 mt-2">
          Los administradores principales (admin y adminFox) están protegidos: ninguno puede eliminar al otro
          ni a sí mismo. Los moderadores regulares sólo son visibles aquí; no pueden eliminar a otros moderadores.
        </p>
      </section>

      <section className="card p-4">
        <h2 className="font-serif text-xl font-bold mb-2">Información y contactos</h2>
        <p className="text-xs opacity-70 mb-2">Se muestra en el footer y se puede incluir el link al Discord oficial.</p>
        <textarea className="input min-h-[100px]" value={contact} onChange={e => setContact(e.target.value)} />
        <button className="btn-primary mt-2" onClick={saveContact}>Guardar</button>
      </section>
    </div>
  );
}

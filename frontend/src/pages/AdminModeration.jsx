import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api, apiBase } from '../api/client.js';

const ROLE_TABS = [
  { key: '', label: 'Todos' },
  { key: 'user', label: 'Usuarios' },
  { key: 'creator', label: 'Escritores' },
  { key: 'moderator', label: 'Moderadores' },
  { key: 'admin', label: 'Admins' },
  { key: 'banned', label: 'Baneados' },
  { key: 'deleted', label: 'Eliminados' },
];

const ROLE_COLORS = {
  admin: 'bg-amber-200/60 dark:bg-amber-600/40 text-amber-800 dark:text-amber-200',
  moderator: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  creator: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  user: 'bg-foxBrown/10 text-foxBrown/80',
};

export default function AdminModeration() {
  const { user, isAdmin, isModerator } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [allUsers, setAllUsers] = useState([]);
  const [bannedList, setBannedList] = useState([]);
  const [deletedAccounts, setDeletedAccounts] = useState([]);
  const [mods, setMods] = useState([]);
  const [modEmail, setModEmail] = useState('');
  const [uncatBooks, setUncatBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [animKey, setAnimKey] = useState(0);
  const [reordering, setReordering] = useState(false);
  const [teamView, setTeamView] = useState('moderators');
  const [movedId, setMovedId] = useState(null);

  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [banningUser, setBanningUser] = useState(null);
  const [banReason, setBanReason] = useState('');
  const [expandedBans, setExpandedBans] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteBanConfirm, setDeleteBanConfirm] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!isModerator()) { navigate('/'); return; }
    loadAll();
    loadUncategorized();
    api.get('/api/categorias').then(r => !r.__error && setCategories(r.categorias || []));
  }, [user, navigate, isModerator]);

  async function loadAll(skipLoading) {
    if (!skipLoading) setLoading(true);
    const [a, b, c, d] = await Promise.all([
      api.get('/api/moderacion/usuarios'),
      api.get('/api/moderacion/baneados'),
      api.get('/api/moderacion/moderadores'),
      api.get('/api/moderacion/cuentas-eliminadas'),
    ]);
    if (!a.__error) setAllUsers(a.users || []);
    if (!b.__error) setBannedList(b.baneados || []);
    if (!c.__error) setMods(c.moderadores || []);
    if (!d.__error) setDeletedAccounts(d.eliminados || []);
    if (!skipLoading) setLoading(false);
  }

  async function loadUncategorized() {
    const r = await api.get('/api/libros?categoria='
      + encodeURIComponent('en espera de categorización')       + '&estado=all');
    if (!r.__error) setUncatBooks(r.libros || []);
  }

  async function assignCategory(bookId, newCat) {
    const r = await api.put('/api/libros/' + bookId, { categoria: newCat });
    if (!r.__error) {
      loadUncategorized();
      toast.ok('Categoría asignada');
    } else toast.error('Error al asignar categoría');
  }

  async function doBan() {
    if (!banningUser || !banReason.trim()) { toast.error('Motivo requerido'); return; }
    const r = await api.post('/api/moderacion/banear', { email: banningUser.email, razon: banReason.trim() });
    if (!r.__error) {
      setBanningUser(null); setBanReason('');
      toast.ok('Usuario baneado'); loadAll();
    }
  }

  async function doUnban(email) {
    const r = await api.post('/api/moderacion/desbanear', { email });
    if (!r.__error) { toast.ok('Usuario desbaneado'); loadAll(); }
  }

  async function deleteBanRecord(email) {
    const r = await api.del('/api/moderacion/baneados/' + encodeURIComponent(email));
    if (!r.__error) { setDeleteBanConfirm(null); toast.ok('Registro eliminado'); loadAll(); }
  }

  async function exportCsv() {
    const token = localStorage.getItem('bookshelf.token');
    let res;
    try {
      res = await fetch((apiBase() || '') + '/api/moderacion/exportar-baneados', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token }
      });
    } catch { toast.error('Error de conexión al exportar'); return; }
    if (!res.ok) { toast.error('Error exportando'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'banned_users.csv';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast.ok('CSV descargado');
  }

  async function removeMod(id) {
    const r = await api.post('/api/moderacion/quitar-moderador', { id });
    if (!r.__error) { toast.ok('Moderador eliminado'); loadAll(); }
  }

  async function addMod() {
    if (!modEmail.trim()) { toast.error('Ingresa un correo'); return; }
    const r = await api.post('/api/moderacion/establecer-moderador', { email: modEmail });
    if (!r.__error) { setModEmail(''); loadAll(); toast.ok('Moderador añadido'); }
  }

  async function doDeleteUser(u) {
    const r = await api.del('/api/usuarios/' + u.id);
    if (!r.__error) {
      setDeleteConfirm(null);
      toast.ok('Usuario enviado a la papelera'); loadAll();
    }
  }

  const filteredUsers = allUsers.filter(u => {
    if (roleFilter === 'banned') return u.esta_baneado;
    if (roleFilter === 'deleted') return (u.historial_baneos || []).some(b => b.deleted_at);
    if (roleFilter) {
      if (roleFilter === 'admin') return u.role === 'admin';
      if (roleFilter === 'moderator') return u.role === 'moderator';
      if (roleFilter === 'creator') return u.role === 'creator';
      if (roleFilter === 'user') return u.role === 'user';
    }
    return true;
  }).filter(u => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (u.nombre_mostrado || '').toLowerCase().includes(q)
      || u.email.toLowerCase().includes(q);
  });

  function toggleBanExpand(email) {
    setExpandedBans(prev => ({ ...prev, [email]: !prev[email] }));
  }

  if (!user || !isModerator()) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <h1 className="font-serif text-2xl font-bold">Panel de moderación</h1>

      {uncatBooks.length > 0 && (
        <section className="card p-4 space-y-2">
          <h2 className="font-serif text-xl font-bold">Libros sin categoría</h2>
          <p className="text-xs opacity-70">Asigna una categoría a los libros que están en espera de categorización.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-foxBrown/15 text-xs uppercase opacity-70">
                  <th className="text-left py-2 pr-3">Título</th>
                  <th className="text-left py-2 pr-3">Autor</th>
                  <th className="text-left py-2 pr-3">Estado</th>
                  <th className="text-left py-2 pr-3">Nueva categoría</th>
                  <th className="text-right py-2"></th>
                </tr>
              </thead>
              <tbody>
                {uncatBooks.map(b => (
                  <tr key={b.id} className="border-b border-foxBrown/10 hover:bg-foxBrown/5 transition-colors">
                    <td className="py-2 pr-3 font-medium">{b.titulo}</td>
                    <td className="py-2 pr-3 text-xs opacity-80">{b.nombre_autor}</td>
                    <td className="py-2 pr-3">
                      <span className="text-[11px] uppercase px-1.5 py-0.5 rounded bg-foxBrown/10">{b.estado}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <CategorySelector book={b} categories={categories} onAssign={assignCategory} />
                    </td>
                    <td className="py-2 text-right"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card p-4 space-y-3">
        <div className="flex items-center gap-3 mb-1">
          <h2 className="font-serif text-xl font-bold">Usuarios</h2>
          <div className="flex flex-wrap gap-1">
            {ROLE_TABS.map(t => (
              <button key={t.key}
                className={'px-2.5 py-1 rounded-md text-xs font-medium transition-colors '
                  + (roleFilter === t.key
                    ? 'bg-foxBrown/15 text-foxBrown dark:text-foxBrown'
                    : 'hover:bg-foxBrown/5 opacity-60')}
                onClick={() => setRoleFilter(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <input
          className="input max-w-xs"
          placeholder="Buscar por nombre o correo..."
          value={userSearch}
          onChange={e => setUserSearch(e.target.value)}
        />

        {loading ? (
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3 py-2 border-t border-foxBrown/10">
                <div className="h-4 bg-foxBrown/10 rounded w-36"></div>
                <div className="h-4 bg-foxBrown/10 rounded w-48"></div>
                <div className="h-4 bg-foxBrown/10 rounded w-24"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-foxBrown/15 text-xs uppercase opacity-70">
                  <th className="text-left py-2 pr-3">Nombre</th>
                  <th className="text-left py-2 pr-3">Correo</th>
                  <th className="text-left py-2 pr-3">Rol</th>
                  <th className="text-left py-2 pr-3">Estado</th>
                  <th className="text-right py-2">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 && (
                  <tr><td colSpan="5" className="py-3 text-xs opacity-70">No hay usuarios que coincidan.</td></tr>
                )}
                {filteredUsers.map(u => (
                  <UserRow
                    key={u.id}
                    u={u}
                    currentUser={user}
                    isAdmin={isAdmin}
                    onBan={() => { setBanningUser(u); setBanReason(''); }}
                    onUnban={() => doUnban(u.email)}
                    onDelete={() => setDeleteConfirm(u)}
                    onRemoveMod={() => removeMod(u.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {banningUser && (
          <div className="border-t border-foxBrown/10 pt-3 mt-1 space-y-2"
               style={{ animation: 'fadeIn 0.15s ease-out' }}>
            <p className="text-sm font-medium">
              Banear a <span className="font-bold">{banningUser.nombre_mostrado || banningUser.email}</span>
              <span className="text-xs opacity-60 ml-2">({banningUser.email})</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                className="input flex-1 min-w-[200px]"
                placeholder="Motivo del baneo..."
                value={banReason}
                onChange={e => setBanReason(e.target.value)}
                autoFocus
              />
              <button className="btn-ghost text-sm" onClick={() => { setBanningUser(null); setBanReason(''); }}>
                Cancelar
              </button>
              <button
                className="btn-primary text-sm"
                disabled={!banReason.trim()}
                onClick={doBan}>
                Banear
              </button>
            </div>
          </div>
        )}
      </section>

      {deletedAccounts.length > 0 && (
        <section className="card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold">Cuentas eliminadas</h2>
            <span className="text-xs opacity-50">{deletedAccounts.length} cuenta(s)</span>
          </div>
          <p className="text-xs opacity-70">Cuentas eliminadas administrativamente. Se indica si el correo fue reutilizado por un nuevo usuario.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-foxBrown/15 text-xs uppercase opacity-70">
                  <th className="text-left py-2 pr-3">Correo eliminado</th>
                  <th className="text-left py-2 pr-3">Eliminado</th>
                  <th className="text-left py-2 pr-3">Eliminado por</th>
                  <th className="text-left py-2 pr-3">Estado actual</th>
                  {isAdmin() && <th className="text-right py-2">Acción</th>}
                </tr>
              </thead>
              <tbody>
                {deletedAccounts.map((d, idx) => (
                  <tr key={d.email + '_' + (d.deleted_at || idx)} className="border-b border-foxBrown/10 hover:bg-foxBrown/5 transition-colors">
                    <td className="py-2 pr-3 font-medium">{d.email}</td>
                    <td className="py-2 pr-3 text-xs">{d.deleted_at ? new Date(d.deleted_at).toLocaleDateString() : '—'}</td>
                    <td className="py-2 pr-3 text-xs">{d.deleted_by || '—'}</td>
                    <td className="py-2 pr-3">
                      {d.tiene_nuevo_usuario ? (
                        <span className="text-[11px] uppercase px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium">
                          Reutilizado — {d.nuevo_usuario?.nombre_mostrado || d.email} ({d.nuevo_usuario?.role})
                        </span>
                      ) : (
                        <span className="text-[11px] uppercase px-1.5 py-0.5 rounded bg-gray-300 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 font-medium">
                          Correo libre
                        </span>
                      )}
                    </td>
                    {isAdmin() && (
                      <td className="py-2 text-right">
                        <button className="btn-ghost text-xs text-red-500" onClick={() => setDeleteBanConfirm(d)}>
                          Eliminar registro
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card p-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-serif text-xl font-bold">Historial de baneos</h2>
          {isAdmin() && (
            <div className="flex gap-2">
              <button className="btn-ghost text-xs" onClick={exportCsv}>Exportar CSV</button>
              {bannedList.length > 0 && (
                <span className="text-xs opacity-50 self-center">{bannedList.length} usuario(s)</span>
              )}
            </div>
          )}
        </div>
        {loading ? (
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-foxBrown/10 rounded"></div>
            ))}
          </div>
        ) : bannedList.length === 0 ? (
          <p className="text-xs opacity-70 py-2">No hay registros de baneos.</p>
        ) : (
          <div className="space-y-2">
            {bannedList.map(group => (
              <BanAccordion
                key={group.email}
                group={group}
                isAdmin={isAdmin}
                expanded={expandedBans[group.email]}
                onToggle={() => toggleBanExpand(group.email)}
                onUnban={() => doUnban(group.email)}
                onDeleteRecord={() => deleteBanRecord(group.email)}
              />
            ))}
          </div>
        )}
      </section>

      <SeccionModeracionImagenes toast={toast} />

      <section className="card p-4">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="font-serif text-xl font-bold">Equipo FoxOnAShelf</h2>
          <div className="flex rounded-md overflow-hidden border border-foxBrown/20 text-xs font-medium">
            <button className={'px-3 py-1 transition-colors ' + (teamView === 'moderators' ? 'bg-foxBrown/15' : 'hover:bg-foxBrown/5')}
                    onClick={() => setTeamView('moderators')}>Moderadores</button>
            <button className={'px-3 py-1 transition-colors ' + (teamView === 'admins' ? 'bg-foxBrown/15' : 'hover:bg-foxBrown/5')}
                    onClick={() => setTeamView('admins')}>Admins</button>
          </div>
        </div>

        {teamView === 'moderators' ? (
          <>
            {isAdmin() && (
              <div className="flex gap-2 mb-3">
                <input className="input flex-1" placeholder="Correo del usuario" type="email" value={modEmail} onChange={e => setModEmail(e.target.value)} />
                <button className="btn-primary" onClick={addMod}>Añadir moderador</button>
              </div>
            )}
            <div className="overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-foxBrown/15 text-xs uppercase opacity-70">
                    <th className="text-left py-1 pr-1.5">Nombre</th>
                    <th className="text-left py-1 pr-1.5">Correo</th>
                    <th className="text-left py-1 pr-1.5">Rol</th>
                    {isAdmin() && <th className="text-center py-1">Orden</th>}
                    {isAdmin() && <th className="text-right py-1">Acción</th>}
                  </tr>
                </thead>
                <tbody key={animKey}>
                  {mods.filter(m => m.role !== 'admin').length === 0 && (
                    <tr><td colSpan={isAdmin() ? 5 : 3} className="py-1.5 text-xs opacity-70">No hay moderadores.</td></tr>
                  )}
                  {mods.filter(m => m.role !== 'admin').map((m, i) => (
                    <tr key={m.id} className={'border-b border-foxBrown/10 hover:bg-foxBrown/5 transition-colors ' + (movedId?.id === m.id ? (movedId.dir === 'up' ? 'anim-move-up' : 'anim-move-down') : 'anim-settle')} style={{ animationDelay: movedId?.id === m.id ? '0ms' : `${i * 30 + 80}ms` }}>
                      <td className="py-1 pr-1.5">
                        <span className="font-medium">{m.nombre_mostrado || '—'}</span>
                      </td>
                      <td className="py-1 pr-1.5">
                        <span className="text-xs opacity-60">{m.email}</span>
                      </td>
                      <td className="py-1 pr-1.5">
                        <span className="text-[11px] uppercase px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40">{m.role}</span>
                      </td>
                      {isAdmin() && (
                        <td className="py-1 text-center whitespace-nowrap">
                          <button type="button" className="btn-ghost text-xs px-1 disabled:opacity-20"
                                  disabled={i === 0 || reordering}
                                  title="Subir"
                                  onClick={async () => {
                                    setReordering(true);
                                    setMovedId({ id: m.id, dir: 'up' });
                                    const r = await api.post('/api/moderacion/moderadores/reordenar', { id: m.id, direccion: 'up' });
                                    if (r && !r.__error) {
                                      const b = await api.get('/api/moderacion/moderadores');
                                      if (!b.__error) { setMods(b.moderadores || []); setAnimKey(k => k + 1); }
                                    }
                                    setReordering(false);
                                  }}>↑</button>
                          <button type="button" className="btn-ghost text-xs px-1 disabled:opacity-20"
                                  disabled={i === mods.filter(x => x.role !== 'admin').length - 1 || reordering}
                                  title="Bajar"
                                  onClick={async () => {
                                    setReordering(true);
                                    setMovedId({ id: m.id, dir: 'down' });
                                    const r = await api.post('/api/moderacion/moderadores/reordenar', { id: m.id, direccion: 'down' });
                                    if (r && !r.__error) {
                                      const b = await api.get('/api/moderacion/moderadores');
                                      if (!b.__error) { setMods(b.moderadores || []); setAnimKey(k => k + 1); }
                                    }
                                    setReordering(false);
                                  }}>↓</button>
                        </td>
                      )}
                      {isAdmin() && (
                        <td className="py-1 text-right whitespace-nowrap">
                          {m.can_delete ? (
                            <button className="btn-ghost text-xs text-red-700" onClick={() => removeMod(m.id)}>Eliminar</button>
                          ) : (
                            <span className="text-xs opacity-50">protegido</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-foxBrown/15 text-xs uppercase opacity-70">
                  <th className="text-left py-1 pr-1.5">Nombre</th>
                  <th className="text-left py-1 pr-1.5">Rol</th>
                </tr>
              </thead>
              <tbody>
                {mods.filter(m => m.role === 'admin').length === 0 && (
                  <tr><td colSpan={2} className="py-1.5 text-xs opacity-70">No hay administradores.</td></tr>
                )}
                {mods.filter(m => m.role === 'admin').map(m => (
                  <tr key={m.id} className="border-b border-foxBrown/10 hover:bg-foxBrown/5 transition-colors bg-amber-50/40 dark:bg-amber-900/20">
                    <td className="py-1 pr-1.5 font-medium">{m.nombre_mostrado || '—'}</td>
                    <td className="py-1 pr-1.5">
                      <span className="text-[11px] uppercase px-1.5 py-0.5 rounded bg-amber-200/60 dark:bg-amber-600/40 font-semibold">{m.role}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             onClick={() => setDeleteConfirm(null)}
             style={{ backgroundColor: 'rgba(0,0,0,0.50)' }}>
          <div className="rm-card p-5 max-w-md w-full shadow-2xl"
               onClick={e => e.stopPropagation()}
               style={{ animation: 'fadeInScale 0.2s ease-out' }}>
            <h3 className="font-serif text-lg font-bold mb-1">Eliminar usuario</h3>
            <div className="text-sm space-y-2">
              <p>Se eliminará la cuenta de <strong>{deleteConfirm.nombre_mostrado || deleteConfirm.email}</strong>.</p>
              <p className="text-xs opacity-70">El usuario será enviado a la papelera. Período de recuperación: 30 días.</p>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="btn-ghost text-sm" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button className="btn-primary text-sm bg-red-600 hover:bg-red-700" onClick={() => doDeleteUser(deleteConfirm)}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteBanConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             onClick={() => setDeleteBanConfirm(null)}
             style={{ backgroundColor: 'rgba(0,0,0,0.50)' }}>
          <div className="rm-card p-5 max-w-md w-full shadow-2xl"
               onClick={e => e.stopPropagation()}
               style={{ animation: 'fadeInScale 0.2s ease-out' }}>
            <h3 className="font-serif text-lg font-bold mb-1">Eliminar registro de ban</h3>
            <div className="text-sm space-y-2">
              <p>Se eliminará permanentemente el registro de <strong>{deleteBanConfirm.email}</strong>.</p>
              <p className="text-xs opacity-70">Esta acción no se puede deshacer. El usuario no está afectado, solo el registro histórico.</p>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="btn-ghost text-sm" onClick={() => setDeleteBanConfirm(null)}>Cancelar</button>
              <button className="btn-primary text-sm bg-red-600 hover:bg-red-700" onClick={() => deleteBanRecord(deleteBanConfirm.email)}>
                Eliminar registro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UserRow({ u, isAdmin, currentUser, onBan, onUnban, onDelete, onRemoveMod }) {
  const isSelf = currentUser?.id === u.id;
  const isTargetAdmin = u.role === 'admin';
  const isTargetMod = u.role === 'moderator';

  const canBan = !u.pre_baneado && !isSelf && !isTargetAdmin && !(isTargetMod && !isAdmin());
  const canDelete = !u.pre_baneado && isAdmin() && !isSelf && !isTargetAdmin;
  const canRemoveMod = !u.pre_baneado && isAdmin() && isTargetMod;

  return (
    <tr className="border-b border-foxBrown/10 hover:bg-foxBrown/5 transition-colors">
      <td className="py-2 pr-3 font-medium">{u.pre_baneado ? '(sin registro)' : (u.nombre_mostrado || '—')}</td>
      <td className="py-2 pr-3 text-xs opacity-60">{u.email}</td>
      <td className="py-2 pr-3">
        {u.pre_baneado ? (
          <span className="text-[11px] uppercase px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700/40 text-gray-500 dark:text-gray-400 font-medium">
            Sin registrar
          </span>
        ) : (
          <span className={'text-[11px] uppercase px-1.5 py-0.5 rounded font-medium ' + (ROLE_COLORS[u.role] || ROLE_COLORS.user)}>
            {u.role === 'creator' ? 'escritor' : u.role}
          </span>
        )}
      </td>
      <td className="py-2 pr-3">
        {u.esta_baneado ? (
          <span className="text-[11px] uppercase px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-medium">
            Baneado
          </span>
        ) : (u.historial_baneos || []).some(b => b.deleted_at) ? (
          <span className="text-[11px] uppercase px-1.5 py-0.5 rounded bg-gray-300 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 font-medium">
            Anteriormente eliminado
          </span>
        ) : (u.historial_baneos || []).some(b => b.unbanned_at) ? (
          <span className="text-[11px] uppercase px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium">
            Desbaneado
          </span>
        ) : null}
      </td>
      <td className="py-2 text-right whitespace-nowrap">
        {canBan && !u.esta_baneado && (
          <button className="btn-ghost text-xs text-orange-700" onClick={onBan}>Banear</button>
        )}
        {canBan && u.esta_baneado && (
          <button className="btn-ghost text-xs text-emerald-700" onClick={onUnban}>Desbanear</button>
        )}
        {canRemoveMod && (
          <button className="btn-ghost text-xs text-red-700 ml-1" onClick={onRemoveMod}>Quitar mod</button>
        )}
        {canDelete && (
          <button className="btn-ghost text-xs text-red-700 ml-1" onClick={onDelete}>Eliminar</button>
        )}
      </td>
    </tr>
  );
}

function BanAccordion({ group, isAdmin, expanded, onToggle, onUnban, onDeleteRecord }) {
  const activeBan = group.bans.find(b => !b.unbanned_at);
  const hasUnban = group.bans.some(b => b.unbanned_at && !b.deleted_at);
  const hasDelete = group.bans.some(b => b.deleted_at);

  return (
    <div className="border border-foxBrown/10 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-foxBrown/5 transition-colors text-left"
        onClick={onToggle}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-medium truncate">{group.email}</span>
          {activeBan && (
            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-medium flex-shrink-0">
              Activo
            </span>
          )}
          {!activeBan && hasDelete && (
            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-gray-300 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 font-medium flex-shrink-0">
              Anteriormente eliminado
            </span>
          )}
          {!activeBan && hasUnban && !hasDelete && (
            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium flex-shrink-0">
              Desbaneado
            </span>
          )}
          {group.bans.length > 1 && (
            <span className="text-[10px] opacity-50 flex-shrink-0">
              {group.bans.length} baneo(s)
            </span>
          )}
        </div>
        <span className="text-xs opacity-40 flex-shrink-0 ml-2">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="border-t border-foxBrown/10 px-3 py-3 space-y-3 text-sm"
             style={{ animation: 'fadeIn 0.15s ease-out' }}>
          {group.bans.map((ban, idx) => (
            <BanDetail key={ban.id ?? idx} ban={ban} />
          ))}

          <div className="flex gap-2 pt-1">
            {activeBan && (
              <button className="btn-ghost text-xs text-emerald-700" onClick={onUnban}>Desbanear</button>
            )}
            {isAdmin() && !activeBan && (
              <button className="btn-ghost text-xs text-red-500" onClick={onDeleteRecord}>Eliminar registro</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BanDetail({ ban }) {
  const isActive = !ban.unbanned_at;
  const isDeleted = !!ban.deleted_at;

  const statusText = isActive ? 'Baneado' : isDeleted ? 'Anteriormente eliminado' : 'Desbaneado';
  const statusColor = isActive ? 'text-red-700 dark:text-red-300'
    : isDeleted ? 'text-gray-600 dark:text-gray-400'
    : 'text-emerald-700 dark:text-emerald-300';

  return (
    <div className={'rounded-lg border p-3 ' + (isActive ? 'border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-900/10' : isDeleted ? 'border-gray-300 dark:border-gray-700/60 bg-gray-50/40 dark:bg-gray-800/30' : 'border-foxBrown/10')}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <div>
          <span className="opacity-50">Estado: </span>
          <span className={'font-medium ' + statusColor}>
            {statusText}
          </span>
        </div>
        <div>
          <span className="opacity-50">Fecha: </span>
          <span>{ban.banned_at ? new Date(ban.banned_at).toLocaleString() : '—'}</span>
        </div>
        <div>
          <span className="opacity-50">Motivo: </span>
          <span>{ban.razon || '—'}</span>
        </div>
        {ban.banned_by && (
          <div>
            <span className="opacity-50">Baneado por: </span>
            <span>{ban.banned_by}</span>
          </div>
        )}
        {ban.unbanned_at && (
          <div>
            <span className="opacity-50">Desbaneado: </span>
            <span>{new Date(ban.unbanned_at).toLocaleString()}</span>
          </div>
        )}
        {ban.unbanned_by && (
          <div>
            <span className="opacity-50">Desbaneado por: </span>
            <span>{ban.unbanned_by}</span>
          </div>
        )}
      </div>
      {ban.apelacion && (
        <div className="mt-2 p-2 rounded bg-foxBrown/5 border border-foxBrown/10">
          <span className="opacity-50 text-[10px] uppercase tracking-wider">Apelación</span>
          <p className="mt-1 whitespace-pre-wrap text-xs">{ban.apelacion}</p>
        </div>
      )}
    </div>
  );
}

function CategorySelector({ book, categories, onAssign }) {
  const [selected, setSelected] = useState('');
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

  return (
    <div className="flex gap-2 items-center">
      <select className="input text-xs" value={selected}
              onChange={e => setSelected(e.target.value)}>
        <option value="">—</option>
        {categories.map(c => <option key={c} value={c}>{cap(c)}</option>)}
      </select>
      <button className="btn-primary text-xs"
              disabled={!selected}
              onClick={() => onAssign(book.id, selected)}>Asignar</button>
    </div>
  );
}

function SeccionModeracionImagenes({ toast }) {
  const [imagenes, setImagenes] = useState([]);
  const [total, setTotal] = useState(0);
  const [paginas, setPaginas] = useState(1);
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaInput, setBusquedaInput] = useState('');
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState('galeria');

  useEffect(() => { cargar(); }, [pagina, busqueda]);

  async function cargar() {
    setCargando(true);
    const params = new URLSearchParams({ pagina: pagina });
    if (busqueda) params.set('q', busqueda);
    const r = await api.get('/api/imagenes-usuario/moderacion?' + params);
    if (!r.__error) {
      setImagenes(r.imagenes || []);
      setTotal(r.total || 0);
      setPaginas(r.paginas || 1);
    }
    setCargando(false);
  }

  function buscar(e) {
    e.preventDefault();
    setPagina(1);
    setBusqueda(busquedaInput.trim());
  }

  async function moderar(id) {
    const r = await api.put('/api/imagenes-usuario/' + id + '/moderar');
    if (!r.__error) { toast.ok('Imagen moderada'); await cargar(); }
    else toast.error(r.error || 'Error al moderar');
  }

  async function desmoderar(id) {
    const r = await api.put('/api/imagenes-usuario/' + id + '/desmoderar');
    if (!r.__error) { toast.ok('Moderación removida'); await cargar(); }
    else toast.error(r.error || 'Error');
  }

  const normales = imagenes.filter(i => !i.moderada);
  const moderadas = imagenes.filter(i => i.moderada);

  return (
    <section className="card p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-serif text-xl font-bold">Imágenes de usuarios</h2>
          <p className="text-xs opacity-60">{total} imagen(es) en total</p>
        </div>
        <div className="flex rounded-md overflow-hidden border border-foxBrown/20 text-xs font-medium">
          <button className={'px-3 py-1 transition-colors ' + (vista === 'galeria' ? 'bg-foxBrown/15' : 'hover:bg-foxBrown/5')}
                  onClick={() => setVista('galeria')}>Galería</button>
          <button className={'px-3 py-1 transition-colors relative ' + (vista === 'moderadas' ? 'bg-foxBrown/15' : 'hover:bg-foxBrown/5')}
                  onClick={() => setVista('moderadas')}>
            Moderadas
            {moderadas.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 text-[9px] font-bold rounded-full bg-red-500 text-white flex items-center justify-center">{moderadas.length}</span>}
          </button>
        </div>
      </div>

      <form onSubmit={buscar} className="flex gap-2">
        <input className="input flex-1" placeholder="Buscar por nombre de usuario o correo..."
               value={busquedaInput} onChange={e => setBusquedaInput(e.target.value)} />
        <button className="btn-primary text-sm" type="submit">Buscar</button>
        {busqueda && <button className="btn-ghost text-sm" type="button" onClick={() => { setBusquedaInput(''); setBusqueda(''); setPagina(1); }}>Limpiar</button>}
      </form>

      {cargando ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="animate-pulse rounded-lg overflow-hidden border border-foxBrown/10">
              <div className="aspect-square bg-foxBrown/10"></div>
              <div className="p-2 space-y-1">
                <div className="h-3 bg-foxBrown/10 rounded w-3/4"></div>
                <div className="h-2 bg-foxBrown/10 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : vista === 'galeria' ? (
        <>
          {normales.length === 0 ? (
            <div className="text-center py-8 opacity-50 text-sm">
              <div className="text-2xl mb-1">🖼</div>
              {busqueda ? 'No se encontraron imágenes con esa búsqueda.' : 'No hay imágenes para moderar.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {normales.map(img => (
                <div key={img.id} className="rounded-lg overflow-hidden border border-foxBrown/10 bg-white/50 dark:bg-slate-800/30 group">
                  <div className="aspect-square overflow-hidden bg-foxBrown/5">
                    <img src={img.url} alt={img.nombre_personalizado} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="p-2 space-y-1">
                    <div className="text-xs font-semibold truncate" title={img.nombre_personalizado}>{img.nombre_personalizado}</div>
                    <div className="text-[10px] opacity-60 truncate" title={img.nombre_usuario}>👤 {img.nombre_usuario || '—'}</div>
                    <div className="text-[10px] opacity-50 truncate" title={img.email_usuario}>✉ {img.email_usuario}</div>
                    <div className="text-[10px] opacity-40">{img.created_at ? new Date(img.created_at).toLocaleDateString() : ''}</div>
                    <button className="w-full mt-1 text-[10px] py-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 font-semibold hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                            onClick={() => moderar(img.id)}>
                      🚩 Moderar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {moderadas.length === 0 ? (
            <div className="text-center py-8 opacity-50 text-sm">
              <div className="text-2xl mb-1">✅</div>
              No hay imágenes moderadas.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {moderadas.map(img => (
                <div key={img.id} className="rounded-lg overflow-hidden border-2 border-red-300 dark:border-red-700 bg-white/50 dark:bg-slate-800/30">
                  <div className="aspect-square overflow-hidden bg-foxBrown/5 relative">
                    <img src={img.url} alt={img.nombre_personalizado} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center">
                      <span className="text-xs font-bold bg-red-500 text-white px-2 py-0.5 rounded">MODERADA</span>
                    </div>
                  </div>
                  <div className="p-2 space-y-1">
                    <div className="text-xs font-semibold truncate" title={img.nombre_personalizado}>{img.nombre_personalizado}</div>
                    <div className="text-[10px] opacity-60 truncate" title={img.nombre_usuario}>👤 {img.nombre_usuario || '—'}</div>
                    <div className="text-[10px] opacity-50 truncate" title={img.email_usuario}>✉ {img.email_usuario}</div>
                    <div className="text-[10px] opacity-40">
                      Moderada {img.moderada_en ? new Date(img.moderada_en).toLocaleDateString() : ''}
                    </div>
                    <button className="w-full mt-1 text-[10px] py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 font-semibold hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                            onClick={() => desmoderar(img.id)}>
                      ✅ Desmoderar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {paginas > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button className="btn-ghost text-xs px-3 py-1.5" onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}>← Anterior</button>
          <span className="text-xs opacity-60">Página {pagina} de {paginas}</span>
          <button className="btn-ghost text-xs px-3 py-1.5" onClick={() => setPagina(p => Math.min(paginas, p + 1))} disabled={pagina === paginas}>Siguiente →</button>
        </div>
      )}
    </section>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../api/client.js';

function ConfirmModal({ isOpen, title, children, confirmLabel, confirmClass, onConfirm, onCancel }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         onClick={onCancel}
         style={{ backgroundColor: 'rgba(0,0,0,0.50)' }}>
      <div className="rm-card p-5 max-w-md w-full shadow-2xl"
           onClick={e => e.stopPropagation()}
           style={{ transform: 'translateY(0)', animation: 'fadeInScale 0.2s ease-out' }}>
        <h3 className="font-serif text-lg font-bold mb-1">{title}</h3>
        <div className="text-sm space-y-2">{children}</div>
        <div className="flex justify-end gap-2 mt-4">
          <button className="btn-ghost text-sm" onClick={onCancel}>Cancelar</button>
          <button className={(confirmClass || 'btn-primary') + ' text-sm'} onClick={onConfirm}>
            {confirmLabel || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

  const [metrics, setM] = useState({});
  const [categories, setCategories] = useState([]);
  const [newCat, setNewCat] = useState('');
  const [announcements, setAnn] = useState([]);
  const [editPub, setEditPub] = useState(null);
  const [pubText, setPubText] = useState('');
  const [editAnn, setEditAnn] = useState(null);
  const [editAnnTitle, setEditAnnTitle] = useState('');
  const [editAnnContent, setEditAnnContent] = useState('');
  const [contact, setContact] = useState('');

  // User table state
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersRoleFilter, setUsersRoleFilter] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);

  // Trash state
  const [trash, setTrash] = useState([]);
  const [trashLoading, setTrashLoading] = useState(false);

  // Changelog state
  const [frontVersions, setFrontVersions] = useState([]);
  const [frontOpen, setFrontOpen] = useState(null);
  const [frontForm, setFrontForm] = useState({ version: '', date: '', added: '', fixed: '', modified: '', removed: '', notas: '', author: '' });
  const [frontEditIdx, setFrontEditIdx] = useState(null);
  const [frontPreview, setFrontPreview] = useState(false);
  const [frontSaving, setFrontSaving] = useState(false);

  // Easter egg state
  const [easterEggs, setEasterEggs] = useState([]);
  const [eggOpen, setEggOpen] = useState(null);

  // Confirm modal state
  const [confirm, setConfirm] = useState({ open: false, target: null });

  function loadCategories() {
    api.get('/api/categories').then(r => !r.__error && setCategories(r.categories || []));
  }
  function loadAnnouncements() {
    api.get('/api/announcements').then(r => !r.__error && setAnn(r.announcements || []));
  }
  function loadTrash() {
    setTrashLoading(true);
    api.get('/api/users/trash/list').then(r => {
      if (!r.__error) setTrash(r.trash || []);
      setTrashLoading(false);
    });
  }

  function loadChangelogs() {
    api.get('/api/changelogs/front').then(r => !r.__error && setFrontVersions(r.versions || []));
  }

  function loadEasterEggs() {
    api.get('/api/easter-eggs').then(r => !r.__error && setEasterEggs(r.easter_eggs || []));
  }

  const loadUsers = useCallback(async (page, q, role) => {
    setUsersLoading(true);
    const params = new URLSearchParams();
    if (page) params.set('page', page);
    if (q) params.set('q', q);
    if (role) params.set('role', role);
    const r = await api.get('/api/users?' + params.toString());
    if (!r.__error) {
      setUsers(r.users || []);
      setUsersTotal(r.total || 0);
    }
    setUsersLoading(false);
  }, []);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!isAdmin()) { navigate('/'); return; }
    api.get('/api/metrics').then(r => !r.__error && setM(r));
    loadCategories();
    loadAnnouncements();
    loadTrash();
    api.get('/api/moderation/contact-info').then(j => !j.__error && setContact(j.contact_info || ''));
    loadChangelogs();
    loadEasterEggs();
  }, [user, navigate, isAdmin]);

  useEffect(() => {
    loadUsers(usersPage, usersSearch, usersRoleFilter);
  }, [usersPage, usersSearch, usersRoleFilter, loadUsers]);

  async function addCategory() {
    if (!newCat.trim()) { toast.error('Ingresa un nombre'); return; }
    const r = await api.post('/api/categories', { name: newCat.trim() });
    if (!r.__error) { setNewCat(''); loadCategories(); toast.ok('Categoría añadida'); }
  }

  async function deleteCategory(name) {
    const r = await api.del('/api/categories/' + encodeURIComponent(name));
    if (!r.__error) { loadCategories(); toast.ok('Categoría eliminada'); }
  }

  async function toggleFeatured(id) {
    const r = await api.put('/api/announcements/' + id + '/feature');
    if (!r.__error) { loadAnnouncements(); toast.ok('Anuncio destacado actualizado'); }
  }

  async function savePublishedBy(id) {
    const r = await api.put('/api/announcements/' + id + '/published-by', { published_by: pubText });
    if (!r.__error) { setEditPub(null); loadAnnouncements(); toast.ok('Texto actualizado'); }
  }

  async function saveEditAnn(id) {
    if (!editAnnTitle.trim() || !editAnnContent.trim()) { toast.error('Completa todos los campos'); return; }
    const r = await api.put('/api/announcements/' + id, { title: editAnnTitle, content: editAnnContent });
    if (!r.__error) { setEditAnn(null); loadAnnouncements(); toast.ok('Anuncio actualizado'); }
  }

  async function saveContact() {
    const r = await api.put('/api/moderation/contact-info', { contact_info: contact });
    if (!r.__error) toast.ok('Información actualizada');
  }

  // --- User actions ---

  function openDeleteConfirm(u) {
    setConfirm({ open: true, target: u, action: 'delete' });
  }

  async function executeDelete() {
    const u = confirm.target;
    setConfirm({ open: false, target: null });
    const delR = await api.del('/api/users/' + u.id);
    if (delR.__error) return;
    toast.ok('Usuario ' + u.email + ' enviado a la papelera');
    loadUsers(usersPage, usersSearch, usersRoleFilter);
    loadTrash();
  }

  function openRestoreConfirm(entry) {
    setConfirm({ open: true, target: entry, action: 'restore' });
  }

  async function executeRestore() {
    const entry = confirm.target;
    setConfirm({ open: false, target: null });
    const r = await api.post('/api/users/trash/' + entry.id + '/restore');
    if (r.__error) return;
    toast.ok('Usuario restaurado');
    loadTrash();
    loadUsers(usersPage, usersSearch, usersRoleFilter);
  }

  function openPermanentDeleteConfirm(entry) {
    setConfirm({ open: true, target: entry, action: 'permadelete' });
  }

  async function executePermanentDelete() {
    const entry = confirm.target;
    setConfirm({ open: false, target: null });
    const r = await api.del('/api/users/trash/' + entry.id);
    if (r.__error) return;
    toast.ok('Usuario eliminado permanentemente');
    loadTrash();
  }

  function openCleanupConfirm() {
    setConfirm({ open: true, target: null, action: 'cleanup' });
  }

  async function executeCleanup() {
    setConfirm({ open: false, target: null });
    const r = await api.post('/api/users/trash/cleanup');
    if (r.__error) return;
    toast.ok(r.message || 'Papelera limpiada');
    loadTrash();
  }

  // --- Front changelog helpers ---

  function sectionsFromVersion(v) {
    const m = (name) => {
      const sec = (v.sections || []).find(s => s.name === name);
      return sec ? sec.items.join('\n') : '';
    };
    return { added: m('Añadido'), fixed: m('Corregido'), modified: m('Modificado'), removed: m('Eliminado'), notas: m('Notas'), author: v.author || '' };
  }

  function resetFrontForm() {
    setFrontForm({ version: '', date: '', added: '', fixed: '', modified: '', removed: '', notas: '', author: '' });
    setFrontEditIdx(null);
    setFrontPreview(false);
  }

  function frontHasContent(f) {
    return f.version.trim() && f.date.trim() && (f.added.trim() || f.fixed.trim() || f.modified.trim() || f.removed.trim() || f.notas.trim());
  }

  async function saveFrontVersion() {
    const f = frontForm;
    if (!frontHasContent(f)) { toast.error('Completa versión, fecha y al menos una sección'); return; }
    setFrontSaving(true);
    const sections = [];
    if (f.added.trim())    sections.push({ name: 'Añadido', items: f.added.trim().split('\n') });
    if (f.fixed.trim())    sections.push({ name: 'Corregido', items: f.fixed.trim().split('\n') });
    if (f.modified.trim()) sections.push({ name: 'Modificado', items: f.modified.trim().split('\n') });
    if (f.removed.trim())  sections.push({ name: 'Eliminado', items: f.removed.trim().split('\n') });
    if (f.notas.trim())    sections.push({ name: 'Notas', items: f.notas.trim().split('\n') });
    const entry = { version: f.version.trim(), date: f.date.trim(), author: f.author.trim(), sections };
    let updated;
    if (frontEditIdx >= 0) {
      updated = frontVersions.map((v, i) => i === frontEditIdx ? entry : v);
    } else {
      updated = [entry, ...frontVersions];
    }
    const r = await api.put('/api/changelogs/front', { versions: updated });
    if (!r.__error) { resetFrontForm(); loadChangelogs(); toast.ok('Versión guardada'); }
    else { toast.error('Error al guardar la versión'); }
    setFrontSaving(false);
  }

  function startFrontEdit(idx) {
    const v = frontVersions[idx];
    setFrontForm({ version: v.version, date: v.date, ...sectionsFromVersion(v) });
    setFrontEditIdx(idx);
    setFrontOpen(null);
    setFrontPreview(false);
  }

  async function deleteFrontVersion(idx) {
    const updated = frontVersions.filter((_, i) => i !== idx);
    const r = await api.put('/api/changelogs/front', { versions: updated });
    if (!r.__error) { loadChangelogs(); toast.ok('Versión eliminada'); }
  }

  async function moveVersion(idx, dir) {
    const updated = [...frontVersions];
    const target = idx + dir;
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    const r = await api.put('/api/changelogs/front', { versions: updated });
    if (!r.__error) { setFrontOpen(null); loadChangelogs(); }
  }

  const usersPerPage = 15;
  const totalPages = Math.ceil(usersTotal / usersPerPage);

  function handleSearch(val) {
    setUsersSearch(val);
    setUsersPage(1);
  }

  function handleRoleFilter(val) {
    setUsersRoleFilter(val);
    setUsersPage(1);
  }

  if (!user || !isAdmin()) return null;

  const confirmTarget = confirm.target;
  const isDelete = confirm.action === 'delete';

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <h1 className="font-serif text-2xl font-bold">Panel BookShelf</h1>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Autores" value={metrics.authors_total ?? 0} />
        <Stat label="Libros"  value={metrics.books_total ?? 0} />
        <Stat label="Vistas"  value={metrics.views_total ?? 0} />
      </section>

      {/* --- USER TABLE --- */}
      <section className="card p-4 space-y-3">
        <h2 className="font-serif text-xl font-bold">Usuarios ({usersTotal})</h2>

        <div className="flex flex-wrap gap-2 items-center">
          <input className="input flex-1 min-w-[200px]"
                 placeholder="Buscar por nombre o correo..."
                 value={usersSearch}
                 onChange={e => handleSearch(e.target.value)} />
          <select className="input w-auto"
                  value={usersRoleFilter}
                  onChange={e => handleRoleFilter(e.target.value)}>
            <option value="">Todos los roles</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderador</option>
            <option value="user">Usuario</option>
          </select>
          <span className="text-xs opacity-60">
            Pág {usersPage} de {totalPages || 1}
          </span>
        </div>

        {usersLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bookshelfBrown/15 text-xs uppercase opacity-70">
                  <th className="text-left py-2 pr-2 w-10"></th>
                  <th className="text-left py-2 pr-3">Nombre</th>
                  <th className="text-left py-2 pr-3">Correo</th>
                  <th className="text-left py-2 pr-3">Rol</th>
                  <th className="text-left py-2 pr-3 whitespace-nowrap">Registro</th>
                  <th className="text-right py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({length: 5}).map((_, i) => (
                  <tr key={i} className="border-b border-bookshelfBrown/10 animate-pulse">
                    <td className="py-2 pr-2"><div className="w-8 h-8 rounded-full bg-bookshelfBrown/10"></div></td>
                    <td className="py-2 pr-3"><div className="h-4 bg-bookshelfBrown/10 rounded w-24"></div></td>
                    <td className="py-2 pr-3"><div className="h-3 bg-bookshelfBrown/10 rounded w-32"></div></td>
                    <td className="py-2 pr-3"><div className="h-4 bg-bookshelfBrown/10 rounded w-16"></div></td>
                    <td className="py-2 pr-3"><div className="h-3 bg-bookshelfBrown/10 rounded w-20"></div></td>
                    <td className="py-2"><div className="h-3 bg-bookshelfBrown/10 rounded w-12 ml-auto"></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : users.length === 0 ? (
          <div className="text-sm opacity-70 py-4">No se encontraron usuarios.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bookshelfBrown/15 text-xs uppercase opacity-70">
                  <th className="text-left py-2 pr-2 w-10"></th>
                  <th className="text-left py-2 pr-3">Nombre</th>
                  <th className="text-left py-2 pr-3">Correo</th>
                  <th className="text-left py-2 pr-3">Rol</th>
                  <th className="text-left py-2 pr-3 whitespace-nowrap">Registro</th>
                  <th className="text-right py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const initials = (u.display_name || u.email).charAt(0).toUpperCase();
                  const avatarUrl = u.avatar_url;
                  const isSelf = user && u.id === user.id;
                  return (
                    <tr key={u.id} className="border-b border-bookshelfBrown/10 hover:bg-bookshelfBrown/5 transition-colors">
                      <td className="py-2 pr-2">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt=""
                               className="w-8 h-8 rounded-full object-cover"
                               onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                          />
                        ) : null}
                        <div className={'w-8 h-8 rounded-full bg-bookshelfBrown/20 text-bookshelfBrown text-xs font-bold items-center justify-center ' + (avatarUrl ? 'hidden' : 'flex')}>
                          {initials}
                        </div>
                      </td>
                      <td className="py-2 pr-3 font-medium">{u.display_name || '—'}</td>
                      <td className="py-2 pr-3 text-xs opacity-80">{u.email}</td>
                      <td className="py-2 pr-3">
                        <span className={'text-[11px] uppercase px-1.5 py-0.5 rounded ' + (
                          u.role === 'admin' ? 'bg-amber-200/60 dark:bg-amber-600/40 font-semibold' :
                          u.role === 'moderator' ? 'bg-blue-100 dark:bg-blue-900/40' :
                          u.role === 'creator' ? 'bg-purple-100 dark:bg-purple-900/40' :
                          'bg-transparent opacity-70'
                        )}>
                          {cap(u.role)}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-xs opacity-70 whitespace-nowrap">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-2 text-right whitespace-nowrap">
                        {isSelf ? (
                          <span className="text-xs opacity-50">(tú)</span>
                        ) : u.role === 'admin' ? (
                          <span className="text-xs opacity-50">protegido</span>
                        ) : (
                          <button className="btn-ghost text-xs text-red-700"
                                  onClick={() => openDeleteConfirm(u)}>
                            Eliminar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 pt-2">
            <button className="btn-ghost text-xs"
                    disabled={usersPage <= 1}
                    onClick={() => setUsersPage(p => p - 1)}>
              ← Anterior
            </button>
            <span className="text-xs opacity-70 self-center">
              {usersPage} / {totalPages}
            </span>
            <button className="btn-ghost text-xs"
                    disabled={usersPage >= totalPages}
                    onClick={() => setUsersPage(p => p + 1)}>
              Siguiente →
            </button>
          </div>
        )}
      </section>

      {/* --- ANNOUNCEMENTS --- */}
      <div className="card p-4">
        <h2 className="font-serif text-xl font-bold mb-2">Anuncios</h2>
        <p className="text-xs opacity-70 mb-3">Gestiona los anuncios destacados y personaliza el texto de publicación.</p>
        <ul className="text-sm space-y-2">
          {announcements.map(a => (
            <li key={a.id} className="flex items-center gap-2 flex-wrap">
              <span className={a.featured ? 'font-bold' : ''}>
                {a.featured ? '★ ' : ''}{a.title}
              </span>
              <span className={"text-[10px] uppercase px-1.5 py-0.5 rounded " + (a.created_by_role === 'admin' ? 'bg-amber-200/60 dark:bg-amber-600/40' : 'bg-blue-100 dark:bg-blue-900/40')}>
                {a.created_by_role === 'admin' ? 'Admin' : 'Mod'}
              </span>
              <button className="btn-ghost text-xs" onClick={() => toggleFeatured(a.id)}>
                {a.featured ? 'Quitar destacado' : 'Destacar'}
              </button>
              {editAnn === a.id ? (
                <div className="flex gap-1 items-center">
                  <input className="input text-xs w-20" value={editAnnTitle}
                         onChange={e => setEditAnnTitle(e.target.value)}
                         placeholder="Título" />
                  <button className="btn-ghost text-xs" onClick={() => saveEditAnn(a.id)}>OK</button>
                  <button className="btn-ghost text-xs" onClick={() => setEditAnn(null)}>✕</button>
                </div>
              ) : (
                <>
                  <button className="btn-ghost text-xs" title="Editar anuncio"
                          onClick={() => { setEditAnn(a.id); setEditAnnTitle(a.title); setEditAnnContent(a.content); }}>
                    Editar
                  </button>
                  {a.created_by_role === 'admin' && (
                    editPub === a.id ? (
                      <div className="flex gap-1 items-center">
                        <input className="input text-xs w-28" value={pubText}
                               onChange={e => setPubText(e.target.value)}
                               placeholder="Publicado por..." />
                        <button className="btn-ghost text-xs" onClick={() => savePublishedBy(a.id)}>OK</button>
                      </div>
                    ) : (
                      <button className="btn-ghost text-xs" title="Personalizar autor"
                              onClick={() => { setEditPub(a.id); setPubText(a.published_by ?? ''); }}>
                        ✏ Publicado por
                      </button>
                    )
                  )}
                </>
              )}
            </li>
          ))}
          {announcements.length === 0 && <li className="opacity-70">No hay anuncios.</li>}
        </ul>
      </div>

      {/* --- CATEGORIES --- */}
      <div className="card p-4 space-y-3">
        <h2 className="font-serif text-xl font-bold">Categorías</h2>
        <div className="flex gap-2">
          <input className="input flex-1" placeholder="Nombre de la categoría"
                 value={newCat} onChange={e => setNewCat(e.target.value)} />
          <button className="btn-primary" onClick={addCategory}>Añadir</button>
        </div>
        <ul className="text-sm space-y-1">
          {categories.map(c => (
            <li key={c} className="flex gap-2 items-center">
              <span>{cap(c)}</span>
              <button className="btn-ghost text-xs ml-auto text-red-700" onClick={() => deleteCategory(c)}>Eliminar</button>
            </li>
          ))}
        </ul>
      </div>

      {/* --- CONTACT INFO --- */}
      <div className="card p-4">
        <h2 className="font-serif text-xl font-bold mb-2">Información y contactos</h2>
        <p className="text-xs opacity-70 mb-2">Se muestra en el footer y se puede incluir el link al Discord oficial.</p>
        <textarea className="input min-h-[100px]" value={contact} onChange={e => setContact(e.target.value)} />
        <button className="btn-primary mt-2" onClick={saveContact}>Guardar</button>
      </div>

      {/* --- FRONT CHANGELOGS (editable) --- */}
      <div className="card p-4 space-y-3">
        <h2 className="font-serif text-xl font-bold">Novedades (CHANGELOGfront.md)</h2>
        <p className="text-xs opacity-70">Versiones visibles en la página /changelog para todos los usuarios.</p>

        {/* Form */}
        {frontEditIdx !== null && (
          <div className="border border-accent-main/30 rounded-lg p-3 space-y-2">
            <div className="flex gap-2 flex-wrap">
              <input className="input flex-1 min-w-[80px]" placeholder="Ej: Desarrollo/Parche 10.A"
                     value={frontForm.version} onChange={e => setFrontForm(p => ({ ...p, version: e.target.value }))} />
              <input className="input w-32" placeholder="Fecha (YYYY-MM-DD)"
                     value={frontForm.date} onChange={e => setFrontForm(p => ({ ...p, date: e.target.value }))} />
              <input className="input w-28" placeholder="Autor"
                     value={frontForm.author} onChange={e => setFrontForm(p => ({ ...p, author: e.target.value }))} />
              <button className={'btn-ghost text-xs ' + (frontPreview ? 'bg-accent-main/20' : '')}
                      onClick={() => setFrontPreview(p => !p)}>
                {frontPreview ? 'Editar' : 'Vista previa'}
              </button>
            </div>

            {frontPreview ? (
              <div className="min-h-[200px] rounded-lg border border-black/10 dark:border-white/10 p-3 text-sm whitespace-pre-wrap leading-relaxed">
                {['added','fixed','modified','removed','notas'].map(k => {
                  const labels = { added: 'Añadido', fixed: 'Corregido', modified: 'Modificado', removed: 'Eliminado', notas: 'Notas' };
                  const txt = frontForm[k].trim();
                  if (!txt) return null;
                  return (
                    <div key={k} className="mb-3">
                      <div className="font-bold mb-1 opacity-80">{labels[k]}</div>
                      {txt.split('\n').map((line, i) => {
                        const trimmed = line.trim();
                        if (!trimmed) return <div key={i} className="h-2" />;
                        if (trimmed.startsWith('- **')) {
                          const rest = trimmed.replace(/^-\s*\*\*(.+?)\*\*/, '');
                          const bold = trimmed.match(/^-\s*\*\*(.+?)\*\*/);
                          return <div key={i} className="ml-3">• <strong>{bold?.[1]}</strong>{rest}</div>;
                        }
                        if (trimmed.startsWith('- ')) return <div key={i} className="ml-3">• {trimmed.slice(2)}</div>;
                        return <div key={i}>{trimmed}</div>;
                      })}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-1 flex-wrap">
                  {[
                    { label: 'B', tag: '**', title: 'Negrita' },
                    { label: '•', tag: '- ', title: 'Lista' },
                    { label: '`', tag: '`', title: 'Código' },
                    { label: 'H', tag: '### ', title: 'Encabezado' },
                  ].map(btn => (
                    <button key={btn.label}
                      className="px-2 py-1 text-xs rounded border border-black/20 dark:border-white/20 hover:bg-black/10 dark:hover:bg-white/10 transition-colors font-mono"
                      title={btn.title}
                      onMouseDown={e => {
                        e.preventDefault();
                        const ta = document.activeElement;
                        if (!ta || ta.tagName !== 'TEXTAREA') return;
                        const sec = ta.dataset.section;
                        if (!sec || !frontForm[sec]) return;
                        const start = ta.selectionStart, end = ta.selectionEnd;
                        const sel = frontForm[sec].substring(start, end);
                        const insert = btn.tag === '- ' ? (sel ? '- ' + sel : '- ') : btn.tag + sel + btn.tag;
                        setFrontForm(p => ({
                          ...p,
                          [sec]: p[sec].substring(0, start) + insert + p[sec].substring(end)
                        }));
                        setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = start + (btn.tag === '- ' && !sel ? 2 : insert.length - (sel ? btn.tag.length : 0)); }, 0);
                      }}>
                      {btn.label}
                    </button>
                  ))}
                </div>
                {[
                  { key: 'added', label: 'Añadido', ph: 'Novedades de esta versión...', color: 'border-l-green-500' },
                  { key: 'fixed', label: 'Corregido', ph: 'Errores solucionados...', color: 'border-l-red-500' },
                  { key: 'modified', label: 'Modificado', ph: 'Cambios en funcionalidad existente...', color: 'border-l-amber-500' },
                  { key: 'removed', label: 'Eliminado', ph: 'Funcionalidades retiradas...', color: 'border-l-gray-500' },
                  { key: 'notas', label: 'Notas', ph: 'Notas adicionales de esta versión...', color: 'border-l-blue-500' },
                ].map(sec => (
                  <div key={sec.key} className="flex gap-2 items-start">
                    <span className="text-xs font-bold w-20 pt-2 shrink-0 opacity-70">{sec.label}</span>
                    <textarea data-section={sec.key}
                      className={'input min-h-[60px] text-xs border-l-4 ' + sec.color}
                      placeholder={sec.ph}
                      value={frontForm[sec.key]}
                      onChange={e => setFrontForm(p => ({ ...p, [sec.key]: e.target.value }))} />
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button className="btn-primary text-sm" onClick={saveFrontVersion} disabled={frontSaving}>
                {frontSaving ? 'Guardando…' : frontEditIdx >= 0 ? 'Actualizar versión' : 'Añadir versión'}
              </button>
              <button className="btn-ghost text-sm" onClick={resetFrontForm} disabled={frontSaving}>Cancelar</button>
            </div>
          </div>
        )}

        {/* Add button */}
        {frontEditIdx === null && (
          <button className="btn-primary text-sm"
                  onClick={() => { setFrontForm({ version: '', date: '', added: '', fixed: '', modified: '', removed: '', notas: '', author: '' }); setFrontEditIdx(-1); setFrontPreview(false); }}>
            + Añadir versión
          </button>
        )}

        {/* List */}
        {frontVersions.length === 0 ? (
          <p className="text-xs opacity-70">No hay versiones registradas.</p>
        ) : (
          <div className="space-y-1">
            {frontVersions.map((v, idx) => (
              <div key={v.version + idx} className="border border-black/10 dark:border-white/10 rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 p-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <button
                    onClick={() => setFrontOpen(frontOpen === idx ? null : idx)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    <span className={`shrink-0 transition-transform ${frontOpen === idx ? 'rotate-90' : ''}`}>▸</span>
                    <span className="font-mono font-bold text-accent-main">{v.version}</span>
                    <span className="text-xs opacity-60">{v.date}</span>
                    {v.author && <span className="text-xs opacity-50 italic">por {v.author}</span>}
                    <span className="hidden sm:inline text-xs opacity-60 ml-2 truncate">
                      {v.sections.map(s => s.name).join(', ')}
                    </span>
                  </button>
                  <button className="btn-ghost text-xs" onClick={() => startFrontEdit(idx)}>✏</button>
                  {idx > 0 && <button className="btn-ghost text-xs" onClick={() => moveVersion(idx, -1)}>↑</button>}
                  {idx < frontVersions.length - 1 && <button className="btn-ghost text-xs" onClick={() => moveVersion(idx, 1)}>↓</button>}
                  <button className="btn-ghost text-xs text-red-700" onClick={() => deleteFrontVersion(idx)}>✕</button>
                </div>
                {frontOpen === idx && (
                  <div className="px-3 pb-2 text-xs space-y-2 border-t border-black/10 dark:border-white/10 pt-2">
                    {v.sections.map((sec, si) => (
                      <div key={si}>
                        <div className="font-bold opacity-80 mb-0.5">{sec.name}</div>
                        <ul className="list-disc list-inside space-y-0.5 opacity-80">
                          {sec.items.map((item, ii) => {
                            const bold = item.match(/^-\s*\*\*(.+?)\*\*/);
                            if (bold) {
                              const rest = item.slice(bold[0].length).replace(/^:\s*/, '');
                              return <li key={ii}><strong>{bold[1]}</strong>{rest ? ': ' + rest : ''}</li>;
                            }
                            return <li key={ii}>{item.replace(/^- /, '').trim()}</li>;
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- EASTER EGGS --- */}
      <div className="card p-4 space-y-3">
        <h2 className="font-serif text-xl font-bold">Easter eggs</h2>
        <p className="text-xs opacity-70">Si alguien intenta registrarse como "ERROR_FOX", se rechazará y aparecerá <strong>ERROR 418: &lt;mensaje&gt;</strong>. Puedes personalizar el mensaje aquí.</p>
        <div className="space-y-1">
          {easterEggs.map((egg, idx) => (
            <div key={egg.id} className="border border-black/10 dark:border-white/10 rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 p-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                <button
                  onClick={() => setEggOpen(eggOpen === idx ? null : idx)}
                  className="flex items-center gap-2 flex-1 text-left"
                >
                  <span className={`shrink-0 transition-transform ${eggOpen === idx ? 'rotate-90' : ''}`}>▸</span>
                  <span className="font-mono font-bold text-accent-main">{egg.message}</span>
                  <span className="text-xs opacity-60 ml-2">{egg.id}</span>
                </button>
              </div>
              {eggOpen === idx && (
                <div className="px-3 pb-2 text-xs space-y-2 border-t border-black/10 dark:border-white/10 pt-2">
                  <div className="opacity-80">{egg.description}</div>
                  <div className="flex gap-2 items-center">
                    <span className="opacity-70 shrink-0">Mensaje de error:</span>
                    <input className="input text-xs flex-1" value={egg.message}
                           onChange={e => {
                             const updated = [...easterEggs];
                             updated[idx] = { ...updated[idx], message: e.target.value };
                             setEasterEggs(updated);
                           }} />
                    <button className="btn-primary text-xs"
                            onClick={async () => {
                              const r = await api.put('/api/easter-eggs', { easter_eggs: easterEggs });
                              if (!r.__error) toast.ok('Easter egg actualizado');
                            }}>
                      Guardar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {easterEggs.length === 0 && <p className="text-xs opacity-70">No hay easter eggs configurados.</p>}
        </div>
      </div>

      {/* --- PAPELERA --- */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-serif text-xl font-bold">Papelera ({trash.length})</h2>
          {trash.length > 0 && (
            <button className="btn-ghost text-xs text-red-700" onClick={openCleanupConfirm}>
              Limpiar expirados
            </button>
          )}
        </div>
        <p className="text-xs opacity-70">Usuarios eliminados. Se pueden recuperar dentro de los 30 días posteriores a la eliminación.</p>
        {trashLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bookshelfBrown/15 text-xs uppercase opacity-70">
                  <th className="text-left py-2 pr-3">Usuario</th>
                  <th className="text-left py-2 pr-3">Email</th>
                  <th className="text-left py-2 pr-3">Rol</th>
                  <th className="text-left py-2 pr-3">Libros</th>
                  <th className="text-left py-2 pr-3">Eliminado</th>
                  <th className="text-left py-2 pr-3">Expira</th>
                  <th className="text-left py-2 pr-3">Por</th>
                  <th className="text-right py-2">Acción</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({length: 3}).map((_, i) => (
                  <tr key={i} className="border-b border-bookshelfBrown/10 animate-pulse">
                    <td className="py-2 pr-3"><div className="h-4 bg-bookshelfBrown/10 rounded w-20"></div></td>
                    <td className="py-2 pr-3"><div className="h-3 bg-bookshelfBrown/10 rounded w-28"></div></td>
                    <td className="py-2 pr-3"><div className="h-3 bg-bookshelfBrown/10 rounded w-12"></div></td>
                    <td className="py-2 pr-3"><div className="h-3 bg-bookshelfBrown/10 rounded w-8"></div></td>
                    <td className="py-2 pr-3"><div className="h-3 bg-bookshelfBrown/10 rounded w-16"></div></td>
                    <td className="py-2 pr-3"><div className="h-3 bg-bookshelfBrown/10 rounded w-16"></div></td>
                    <td className="py-2 pr-3"><div className="h-3 bg-bookshelfBrown/10 rounded w-16"></div></td>
                    <td className="py-2"><div className="h-3 bg-bookshelfBrown/10 rounded w-20 ml-auto"></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : trash.length === 0 ? (
          <p className="text-sm opacity-70">La papelera está vacía.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bookshelfBrown/15 text-xs uppercase opacity-70">
                  <th className="text-left py-2 pr-3">Usuario</th>
                  <th className="text-left py-2 pr-3">Email</th>
                  <th className="text-left py-2 pr-3">Rol</th>
                  <th className="text-left py-2 pr-3">Libros</th>
                  <th className="text-left py-2 pr-3">Eliminado</th>
                  <th className="text-left py-2 pr-3">Expira</th>
                  <th className="text-left py-2 pr-3">Por</th>
                  <th className="text-right py-2">Acción</th>
                </tr>
              </thead>
              <tbody>
                {trash.map(t => {
                  const daysLeft = Math.ceil((new Date(t.expires_at) - new Date()) / (1000*60*60*24));
                  return (
                    <tr key={t.id} className="border-b border-bookshelfBrown/10 hover:bg-bookshelfBrown/5 transition-colors">
                      <td className="py-2 pr-3 font-medium">{t.user?.display_name || '—'}</td>
                      <td className="py-2 pr-3 text-xs opacity-80">{t.user_email}</td>
                      <td className="py-2 pr-3 text-xs">{t.user?.role || '—'}</td>
                      <td className="py-2 pr-3 text-xs">{t.book_count || 0}</td>
                      <td className="py-2 pr-3 text-xs whitespace-nowrap">
                        {new Date(t.trashed_at).toLocaleDateString()}
                      </td>
                      <td className="py-2 pr-3 text-xs whitespace-nowrap">
                        <span className={daysLeft <= 3 ? 'text-red-600 font-semibold' : daysLeft <= 7 ? 'text-amber-600' : ''}>
                          {daysLeft > 0 ? daysLeft + ' días' : 'Expirado'}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-xs opacity-70">{t.trashed_by}</td>
                      <td className="py-2 text-right whitespace-nowrap">
                        <button className="btn-ghost text-xs text-emerald-700 mr-1"
                                onClick={() => openRestoreConfirm(t)}
                                disabled={daysLeft <= 0}>
                          Restaurar
                        </button>
                        <button className="btn-ghost text-xs text-red-700"
                                onClick={() => openPermanentDeleteConfirm(t)}>
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- CONFIRM MODAL --- */}
      <ConfirmModal
        isOpen={confirm.open}
        title={isDelete ? 'Eliminar usuario' : confirm.action === 'restore' ? 'Restaurar usuario' : confirm.action === 'permadelete' ? 'Eliminar permanentemente' : 'Limpiar papelera'}
        confirmLabel={isDelete ? 'Enviar a papelera' : confirm.action === 'restore' ? 'Restaurar' : confirm.action === 'permadelete' ? 'Eliminar para siempre' : 'Limpiar'}
        confirmClass={isDelete || confirm.action === 'permadelete' || confirm.action === 'cleanup' ? 'px-4 py-2 rounded-md font-medium transition-all bg-red-700 text-white border-none font-semibold shadow-md cursor-pointer hover:brightness-110 hover:-translate-y-0.5' : 'btn-primary'}
        onConfirm={isDelete ? executeDelete : confirm.action === 'restore' ? executeRestore : confirm.action === 'permadelete' ? executePermanentDelete : executeCleanup}
        onCancel={() => setConfirm({ open: false, target: null })}
      >
        {isDelete && confirmTarget && (
          <>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <span className="text-2xl">⚠️</span>
              <div>
                <div className="font-semibold">{confirmTarget.display_name || 'Usuario'}</div>
                <div className="text-xs opacity-80">{confirmTarget.email}</div>
              </div>
            </div>
            <div className="text-xs opacity-80 space-y-1 mt-2">
              <div className="flex justify-between"><span>Rol:</span><span className="font-medium">{cap(confirmTarget.role)}</span></div>
              <div className="flex justify-between"><span>Registro:</span><span className="font-medium">{new Date(confirmTarget.created_at).toLocaleDateString()}</span></div>
            </div>
            <p className="text-xs mt-3">Esta acción eliminará los siguientes datos del sistema activo:</p>
            <ul className="text-xs space-y-0.5 ml-4 list-disc opacity-80">
              <li>Cuenta y perfil</li>
              <li>Comentarios</li>
              <li>Calificaciones</li>
              <li>Historial de lectura y favoritos</li>
              <li>Libros y capítulos propios</li>
              <li>Vistas y notificaciones</li>
            </ul>
            <p className="text-xs mt-2 font-semibold text-amber-700 dark:text-amber-400">
              Los datos se conservan en la papelera por 30 días.
            </p>
          </>
        )}

        {confirm.action === 'restore' && confirmTarget && (
          <>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <span className="text-2xl">♻️</span>
              <div>
                <div className="font-semibold">{confirmTarget.user?.display_name || confirmTarget.user_email}</div>
                <div className="text-xs opacity-80">{confirmTarget.user_email}</div>
              </div>
            </div>
            <p className="text-xs mt-2">Se restaurará la cuenta con todos sus datos: perfil, comentarios, calificaciones, libros, favoritos y más.</p>
          </>
        )}

        {confirm.action === 'permadelete' && confirmTarget && (
          <>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <span className="text-2xl">🗑️</span>
              <div>
                <div className="font-semibold">{confirmTarget.user?.display_name || confirmTarget.user_email}</div>
                <div className="text-xs opacity-80">{confirmTarget.user_email}</div>
              </div>
            </div>
            <p className="text-xs mt-2 font-semibold text-red-700 dark:text-red-400">
              Esta acción NO se puede deshacer. Todos los datos se perderán permanentemente.
            </p>
          </>
        )}

        {confirm.action === 'cleanup' && (
          <p className="text-sm">Se eliminarán permanentemente todas las entradas expiradas de la papelera.</p>
        )}
      </ConfirmModal>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase opacity-70">{label}</div>
      <div className="text-3xl font-serif font-bold text-bookshelfBrown">{value}</div>
    </div>
  );
}

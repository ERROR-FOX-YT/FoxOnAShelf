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

function AddNameInline({ onAdd }) {
  const [val, setVal] = useState('');
  return (
    <div className="flex gap-1">
      <input className="input text-xs flex-1" placeholder="Nuevo nombre exclusivo..."
             value={val} onChange={e => setVal(e.target.value)}
             onKeyDown={e => { if (e.key === 'Enter' && val.trim()) { onAdd(val.trim()); setVal(''); } }} />
      <button className="btn-primary text-xs" onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(''); } }}>+</button>
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
  const [anuncios, setAnuncios] = useState([]);
  const [editandoPublicado, setEditandoPublicado] = useState(null);
  const [textoPublicado, setTextoPublicado] = useState('');
  const [editandoAnuncio, setEditandoAnuncio] = useState(null);
  const [tituloEdicion, setTituloEdicion] = useState('');
  const [contenidoEdicion, setContenidoEdicion] = useState('');
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

  // Changelog config state (footer)
  const [footerVersion, setFooterVersion] = useState('');
  const [footerLinkText, setFooterLinkText] = useState('');

  // Easter egg state
  const [easterEggs, setEasterEggs] = useState([]);
  const [eggOpen, setEggOpen] = useState(null);

  // Confirm modal state
  const [confirm, setConfirm] = useState({ open: false, target: null });

  function loadCategories() {
    api.get('/api/categorias').then(r => !r.__error && setCategories(r.categorias || []));
  }
  function cargarAnuncios() {
    api.get('/api/anuncios').then(r => !r.__error && setAnuncios(r.anuncios || []));
  }
  function loadTrash() {
    setTrashLoading(true);
    api.get('/api/usuarios/papelera/listar').then(r => {
      if (!r.__error) setTrash(r.papelera || []);
      setTrashLoading(false);
    });
  }

  function loadChangelogs() {
    api.get('/api/historiales/frontend').then(r => !r.__error && setFrontVersions(r.versiones || []));
  }

  function loadChangelogConfig() {
    api.get('/api/historiales/configuracion').then(r => {
      if (!r.__error) {
        setFooterVersion(r.version_actual || '');
        setFooterLinkText(r.texto_enlace || '');
      }
    });
  }

  async function saveChangelogConfig() {
    if (!footerVersion.trim() || !footerLinkText.trim()) { toast.error('Versión y texto del link requeridos'); return; }
    const r = await api.put('/api/historiales/configuracion', { version_actual: footerVersion.trim(), texto_enlace: footerLinkText.trim() });
    if (!r.__error) toast.ok('Configuración del footer actualizada');
  }

  function loadEasterEggs() {
    api.get('/api/huevos-pascua').then(r => !r.__error && setEasterEggs(r.huevos_pascua || []));
  }

  const loadUsers = useCallback(async (page, q, role) => {
    setUsersLoading(true);
    const params = new URLSearchParams();
    if (page) params.set('page', page);
    if (q) params.set('q', q);
    if (role) params.set('role', role);
    const r = await api.get('/api/usuarios?' + params.toString());
    if (!r.__error) {
      setUsers(r.usuarios || []);
      setUsersTotal(r.total || 0);
    }
    setUsersLoading(false);
  }, []);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!isAdmin()) { navigate('/'); return; }
    api.get('/api/metricas').then(r => !r.__error && setM(r));
    loadCategories();
    cargarAnuncios();
    loadTrash();
    api.get('/api/moderacion/informacion-contacto').then(j => !j.__error && setContact(j.informacion_contacto || ''));
    loadChangelogs();
    loadChangelogConfig();
    loadEasterEggs();
  }, [user, navigate, isAdmin]);

  useEffect(() => {
    loadUsers(usersPage, usersSearch, usersRoleFilter);
  }, [usersPage, usersSearch, usersRoleFilter, loadUsers]);

  async function addCategory() {
    if (!newCat.trim()) { toast.error('Ingresa un nombre'); return; }
    const r = await api.post('/api/categorias', { nombre: newCat.trim() });
    if (!r.__error) { setNewCat(''); loadCategories(); toast.ok('Categoría añadida'); }
  }

  async function deleteCategory(name) {
    const r = await api.del('/api/categorias/' + encodeURIComponent(name));
    if (!r.__error) { loadCategories(); toast.ok('Categoría eliminada'); }
  }

  async function alternarDestacado(id) {
    const r = await api.put('/api/anuncios/' + id + '/destacado');
    if (!r.__error) { cargarAnuncios(); toast.ok('Anuncio destacado actualizado'); }
  }

  async function guardarPublicadoPor(id) {
    const r = await api.put('/api/anuncios/' + id + '/publicado-por', { publicado_por: textoPublicado });
    if (!r.__error) { setEditandoPublicado(null); cargarAnuncios(); toast.ok('Texto actualizado'); }
  }

  async function guardarEdicionAnuncio(id) {
    if (!tituloEdicion.trim() || !contenidoEdicion.trim()) { toast.error('Completa todos los campos'); return; }
    const r = await api.put('/api/anuncios/' + id, { titulo: tituloEdicion, contenido: contenidoEdicion });
    if (!r.__error) { setEditandoAnuncio(null); cargarAnuncios(); toast.ok('Anuncio actualizado'); }
  }

  async function saveContact() {
    const r = await api.put('/api/moderacion/informacion-contacto', { informacion_contacto: contact });
    if (!r.__error) toast.ok('Información actualizada');
  }

  // --- User actions ---

  function openDeleteConfirm(u) {
    setConfirm({ open: true, target: u, action: 'delete' });
  }

  async function executeDelete() {
    const u = confirm.target;
    setConfirm({ open: false, target: null });
    const delR = await api.del('/api/usuarios/' + u.id);
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
    const r = await api.post('/api/usuarios/papelera/' + entry.id + '/restaurar');
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
    const r = await api.del('/api/usuarios/papelera/' + entry.id);
    if (r.__error) return;
    toast.ok('Usuario eliminado permanentemente');
    loadTrash();
  }

  function openCleanupConfirm() {
    setConfirm({ open: true, target: null, action: 'cleanup' });
  }

  async function executeCleanup() {
    setConfirm({ open: false, target: null });
    const r = await api.post('/api/usuarios/papelera/limpiar');
    if (r.__error) return;
    toast.ok(r.message || 'Papelera limpiada');
    loadTrash();
  }

  // --- Front changelog helpers ---

  function sectionsFromVersion(v) {
    const m = (name) => {
      const sec = (v.secciones || []).find(s => s.nombre === name);
      return sec ? sec.elementos.join('\n') : '';
    };
    return { added: m('Añadido'), fixed: m('Corregido'), modified: m('Modificado'), removed: m('Eliminado'), notas: m('Notas'), author: v.autor || '' };
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
    if (f.added.trim())    sections.push({ nombre: 'Añadido', elementos: f.added.trim().split('\n') });
    if (f.fixed.trim())    sections.push({ nombre: 'Corregido', elementos: f.fixed.trim().split('\n') });
    if (f.modified.trim()) sections.push({ nombre: 'Modificado', elementos: f.modified.trim().split('\n') });
    if (f.removed.trim())  sections.push({ nombre: 'Eliminado', elementos: f.removed.trim().split('\n') });
    if (f.notas.trim())    sections.push({ nombre: 'Notas', elementos: f.notas.trim().split('\n') });
    const entry = { version: f.version.trim(), fecha: f.date.trim(), autor: f.author.trim(), secciones: sections };
    let updated;
    if (frontEditIdx >= 0) {
      updated = frontVersions.map((v, i) => i === frontEditIdx ? entry : v);
    } else {
      updated = [entry, ...frontVersions];
    }
    const r = await api.put('/api/historiales/frontend', { versiones: updated });
    if (!r.__error) { resetFrontForm(); loadChangelogs(); toast.ok('Versión guardada'); }
    else { toast.error('Error al guardar la versión'); }
    setFrontSaving(false);
  }

  function startFrontEdit(idx) {
    const v = frontVersions[idx];
    setFrontForm({ version: v.version, date: v.fecha, ...sectionsFromVersion(v) });
    setFrontEditIdx(idx);
    setFrontOpen(null);
    setFrontPreview(false);
  }

  async function deleteFrontVersion(idx) {
    const updated = frontVersions.filter((_, i) => i !== idx);
    const r = await api.put('/api/historiales/frontend', { versiones: updated });
    if (!r.__error) { loadChangelogs(); toast.ok('Versión eliminada'); }
  }

  async function moveVersion(idx, dir) {
    const updated = [...frontVersions];
    const target = idx + dir;
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    const r = await api.put('/api/historiales/frontend', { versiones: updated });
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
      <h1 className="font-serif text-2xl font-bold">Panel FoxOnAShelf</h1>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Autores" value={metrics.autores_total ?? 0} />
        <Stat label="Libros"  value={metrics.libros_total ?? 0} />
        <Stat label="Vistas"  value={metrics.vistas_total ?? 0} />
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
                <tr className="border-b border-foxBrown/15 text-xs uppercase opacity-70">
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
                  <tr key={i} className="border-b border-foxBrown/10 animate-pulse">
                    <td className="py-2 pr-2"><div className="w-8 h-8 rounded-full bg-foxBrown/10"></div></td>
                    <td className="py-2 pr-3"><div className="h-4 bg-foxBrown/10 rounded w-24"></div></td>
                    <td className="py-2 pr-3"><div className="h-3 bg-foxBrown/10 rounded w-32"></div></td>
                    <td className="py-2 pr-3"><div className="h-4 bg-foxBrown/10 rounded w-16"></div></td>
                    <td className="py-2 pr-3"><div className="h-3 bg-foxBrown/10 rounded w-20"></div></td>
                    <td className="py-2"><div className="h-3 bg-foxBrown/10 rounded w-12 ml-auto"></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : users.length === 0 ? (
          <div className="text-sm opacity-70 py-4">No se encontraron usuarios.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm admin-table">
              <thead>
                <tr className="border-b border-foxBrown/15 text-xs uppercase opacity-70">
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
                  const initials = (u.nombre_mostrado || u.email).charAt(0).toUpperCase();
                  const avatarUrl = u.url_avatar;
                  const isSelf = user && u.id === user.id;
                  return (
                    <tr key={u.id} className="border-b border-foxBrown/10 hover:bg-foxBrown/5 transition-colors">
                      <td className="py-2 pr-2">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt=""
                               className="w-8 h-8 rounded-full object-cover"
                               onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                          />
                        ) : null}
                        <div className={'w-8 h-8 rounded-full bg-foxBrown/20 text-foxBrown text-xs font-bold items-center justify-center ' + (avatarUrl ? 'hidden' : 'flex')}>
                          {initials}
                        </div>
                      </td>
                      <td className="py-2 pr-3 font-medium" data-label="Nombre">{u.nombre_mostrado || '—'}</td>
                      <td className="py-2 pr-3 text-xs opacity-80" data-label="Correo">{u.email}</td>
                      <td className="py-2 pr-3" data-label="Rol">
                        <span className={'text-[11px] uppercase px-1.5 py-0.5 rounded ' + (
                          u.role === 'admin' ? 'bg-amber-200/60 dark:bg-amber-600/40 font-semibold' :
                          u.role === 'moderator' ? 'bg-blue-100 dark:bg-blue-900/40' :
                          u.role === 'creator' ? 'bg-purple-100 dark:bg-purple-900/40' :
                          'bg-transparent opacity-70'
                        )}>
                          {cap(u.role)}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-xs opacity-70 whitespace-nowrap" data-label="Registro">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-2 text-right whitespace-nowrap" data-label="Acciones">
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

      {/* --- ANUNCIOS --- */}
      <div className="card p-4">
        <h2 className="font-serif text-xl font-bold mb-2">Anuncios</h2>
        <p className="text-xs opacity-70 mb-3">Gestiona los anuncios destacados y personaliza el texto de publicación.</p>
        <ul className="text-sm space-y-2">
          {anuncios.map(a => (
            <li key={a.id} className="flex items-center gap-2 flex-wrap">
              <span className={a.destacado ? 'font-bold' : ''}>
                {a.destacado ? '★ ' : ''}{a.titulo}
              </span>
              <span className={"text-[10px] uppercase px-1.5 py-0.5 rounded " + (a.autorRol === 'admin' ? 'bg-amber-200/60 dark:bg-amber-600/40' : 'bg-blue-100 dark:bg-blue-900/40')}>
                {a.autorRol === 'admin' ? 'Admin' : 'Mod'}
              </span>
              <button className="btn-ghost text-xs" onClick={() => alternarDestacado(a.id)}>
                {a.destacado ? 'Quitar destacado' : 'Destacar'}
              </button>
              {editandoAnuncio === a.id ? (
                <div className="flex gap-1 items-center">
                  <input className="input text-xs w-20" value={tituloEdicion}
                         onChange={e => setTituloEdicion(e.target.value)}
                         placeholder="Título" />
                  <button className="btn-ghost text-xs" onClick={() => guardarEdicionAnuncio(a.id)}>OK</button>
                  <button className="btn-ghost text-xs" onClick={() => setEditandoAnuncio(null)}>✕</button>
                </div>
              ) : (
                <>
                  <button className="btn-ghost text-xs" title="Editar anuncio"
                          onClick={() => { setEditandoAnuncio(a.id); setTituloEdicion(a.titulo); setContenidoEdicion(a.contenido); }}>
                    Editar
                  </button>
                  {a.autorRol === 'admin' && (
                    editandoPublicado === a.id ? (
                      <div className="flex gap-1 items-center">
                        <input className="input text-xs w-28" value={textoPublicado}
                               onChange={e => setTextoPublicado(e.target.value)}
                               placeholder="Publicado por..." />
                        <button className="btn-ghost text-xs" onClick={() => guardarPublicadoPor(a.id)}>OK</button>
                      </div>
                    ) : (
                      <button className="btn-ghost text-xs" title="Personalizar autor"
                              onClick={() => { setEditandoPublicado(a.id); setTextoPublicado(a.publicadoPor ?? ''); }}>
                        ✏ Publicado por
                      </button>
                    )
                  )}
                </>
              )}
            </li>
          ))}
          {anuncios.length === 0 && <li className="opacity-70">No hay anuncios.</li>}
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

      {/* --- CHANGELOG CONFIG (footer version) --- */}
      <div className="card p-4 space-y-3">
        <h2 className="font-serif text-xl font-bold">Versión del footer</h2>
        <p className="text-xs opacity-70">Controla qué versión se muestra en el pie de página y el texto del enlace.</p>
        <div className="flex gap-2 flex-wrap">
          <input className="input flex-1 min-w-[120px]" placeholder="Ej: Desarrollo - 12"
                 value={footerVersion} onChange={e => setFooterVersion(e.target.value)} />
          <input className="input flex-1 min-w-[120px]" placeholder="Ej: Ver historial de versiones"
                 value={footerLinkText} onChange={e => setFooterLinkText(e.target.value)} />
          <button className="btn-primary text-sm" onClick={saveChangelogConfig}>Guardar</button>
        </div>
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
                    <span className="text-xs opacity-60">{v.fecha}</span>
                    {v.autor && <span className="text-xs opacity-50 italic">por {v.autor}</span>}
                    <span className="hidden sm:inline text-xs opacity-60 ml-2 truncate">
                      {v.secciones.map(s => s.nombre).join(', ')}
                    </span>
                  </button>
                  <button className="btn-ghost text-xs" onClick={() => startFrontEdit(idx)}>✏</button>
                  {idx > 0 && <button className="btn-ghost text-xs" onClick={() => moveVersion(idx, -1)}>↑</button>}
                  {idx < frontVersions.length - 1 && <button className="btn-ghost text-xs" onClick={() => moveVersion(idx, 1)}>↓</button>}
                  <button className="btn-ghost text-xs text-red-700" onClick={() => deleteFrontVersion(idx)}>✕</button>
                </div>
                {frontOpen === idx && (
                  <div className="px-3 pb-2 text-xs space-y-2 border-t border-black/10 dark:border-white/10 pt-2">
                    {v.secciones.map((sec, si) => (
                      <div key={si}>
                        <div className="font-bold opacity-80 mb-0.5">{sec.nombre}</div>
                        <ul className="list-disc list-inside space-y-0.5 opacity-80">
                          {sec.elementos.map((item, ii) => {
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
        <h2 className="font-serif text-xl font-bold">Easter eggs — Nombres exclusivos</h2>
        <p className="text-xs opacity-70">Si alguien intenta registrarse con uno de estos nombres, se rechazará y aparecerá <strong>ERROR 418: &lt;mensaje&gt;</strong>. La comparación no distingue mayúsculas y acepta variaciones (0=O, _=-, etc.).</p>
        <div className="space-y-1">
          {easterEggs.map((egg, idx) => {
            const names = egg.nombres || ['ERROR_FOX'];
            return (
              <div key={egg.id} className="border border-black/10 dark:border-white/10 rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 p-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <button
                    onClick={() => setEggOpen(eggOpen === idx ? null : idx)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    <span className={`shrink-0 transition-transform ${eggOpen === idx ? 'rotate-90' : ''}`}>▸</span>
                    <span className="text-lg">{egg.emoji || '🦊'}</span>
                    <span className="font-mono font-bold text-accent-main">{names.length} nombre{names.length !== 1 ? 's' : ''}</span>
                    <span className="text-xs opacity-60 ml-2">{egg.id}</span>
                  </button>
                </div>
                {eggOpen === idx && (
                  <div className="px-3 pb-3 text-xs space-y-3 border-t border-black/10 dark:border-white/10 pt-2">
                    <div className="opacity-80">{egg.descripcion}</div>

                    {/* Emoji */}
                    <div className="flex gap-2 items-center">
                      <span className="opacity-70 shrink-0">Emoji:</span>
                      <input className="input text-sm w-20 text-center" maxLength={10}
                             value={egg.emoji || '🦊'}
                             onChange={e => {
                               const updated = [...easterEggs];
                               updated[idx] = { ...updated[idx], emoji: e.target.value.slice(0, 10) };
                               setEasterEggs(updated);
                             }} />
                      <span className="text-xs opacity-50">(máx. 10 caracteres)</span>
                    </div>

                    {/* Mensaje */}
                    <div className="flex gap-2 items-center">
                      <span className="opacity-70 shrink-0">Mensaje:</span>
                      <input className="input text-xs flex-1" value={egg.mensaje}
                             onChange={e => {
                               const updated = [...easterEggs];
                               updated[idx] = { ...updated[idx], mensaje: e.target.value };
                               setEasterEggs(updated);
                             }} />
                    </div>

                    {/* Nombres exclusivos */}
                    <div>
                      <span className="opacity-70 block mb-1">Nombres exclusivos:</span>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {names.map((n, ni) => (
                          <span key={ni} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-mono">
                            {n}
                            <button className="hover:text-red-900 dark:hover:text-red-200 ml-0.5"
                                    onClick={() => {
                                      const updated = [...easterEggs];
                                      const newNames = names.filter((_, i) => i !== ni);
                                      updated[idx] = { ...updated[idx], nombres: newNames.length ? newNames : ['ERROR_FOX'] };
                                      setEasterEggs(updated);
                                    }}>×</button>
                          </span>
                        ))}
                      </div>
                      <AddNameInline onAdd={(name) => {
                        const updated = [...easterEggs];
                        const newNames = [...names, name];
                        updated[idx] = { ...updated[idx], nombres: newNames };
                        setEasterEggs(updated);
                      }} />
                    </div>

                    <button className="btn-primary text-xs"
                            onClick={async () => {
                              const r = await api.put('/api/huevos-pascua', { huevos_pascua: easterEggs });
                              if (!r.__error) toast.ok('Easter egg actualizado');
                            }}>
                      Guardar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
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
                <tr className="border-b border-foxBrown/15 text-xs uppercase opacity-70">
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
                  <tr key={i} className="border-b border-foxBrown/10 animate-pulse">
                    <td className="py-2 pr-3"><div className="h-4 bg-foxBrown/10 rounded w-20"></div></td>
                    <td className="py-2 pr-3"><div className="h-3 bg-foxBrown/10 rounded w-28"></div></td>
                    <td className="py-2 pr-3"><div className="h-3 bg-foxBrown/10 rounded w-12"></div></td>
                    <td className="py-2 pr-3"><div className="h-3 bg-foxBrown/10 rounded w-8"></div></td>
                    <td className="py-2 pr-3"><div className="h-3 bg-foxBrown/10 rounded w-16"></div></td>
                    <td className="py-2 pr-3"><div className="h-3 bg-foxBrown/10 rounded w-16"></div></td>
                    <td className="py-2 pr-3"><div className="h-3 bg-foxBrown/10 rounded w-16"></div></td>
                    <td className="py-2"><div className="h-3 bg-foxBrown/10 rounded w-20 ml-auto"></div></td>
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
                <tr className="border-b border-foxBrown/15 text-xs uppercase opacity-70">
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
                  const daysLeft = Math.ceil((new Date(t.expira_en) - new Date()) / (1000*60*60*24));
                  return (
                    <tr key={t.id} className="border-b border-foxBrown/10 hover:bg-foxBrown/5 transition-colors">
                      <td className="py-2 pr-3 font-medium">{t.user?.nombre_mostrado || '—'}</td>
                      <td className="py-2 pr-3 text-xs opacity-80">{t.email_usuario}</td>
                      <td className="py-2 pr-3 text-xs">{t.user?.role || '—'}</td>
                      <td className="py-2 pr-3 text-xs">{t.conteo_libros || 0}</td>
                      <td className="py-2 pr-3 text-xs whitespace-nowrap">
                        {new Date(t.deleted_at).toLocaleDateString()}
                      </td>
                      <td className="py-2 pr-3 text-xs whitespace-nowrap">
                        <span className={daysLeft <= 3 ? 'text-red-600 font-semibold' : daysLeft <= 7 ? 'text-amber-600' : ''}>
                          {daysLeft > 0 ? daysLeft + ' días' : 'Expirado'}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-xs opacity-70">{t.deleted_by}</td>
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
                <div className="font-semibold">{confirmTarget.nombre_mostrado || 'Usuario'}</div>
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
                <div className="font-semibold">{confirmTarget.user?.nombre_mostrado || confirmTarget.email_usuario}</div>
                <div className="text-xs opacity-80">{confirmTarget.email_usuario}</div>
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
                <div className="font-semibold">{confirmTarget.user?.nombre_mostrado || confirmTarget.email_usuario}</div>
                <div className="text-xs opacity-80">{confirmTarget.email_usuario}</div>
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
      <div className="text-3xl font-serif font-bold text-foxBrown">{value}</div>
    </div>
  );
}

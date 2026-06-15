import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { safeUrl } from '../api/safe.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Announcements() {
  const { user, isAdmin, isModerator } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [t, setT] = useState(''); const [c, setC] = useState('');
  const [imgFile, setImgFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editingPub, setEditingPub] = useState(null);
  const [pubText, setPubText] = useState('');
  const [editingAnn, setEditingAnn] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(true);
  const fileRef = useRef(null);

  async function load() {
    setLoading(true);
    const r = await api.get('/api/announcements');
    if (!r.__error) setItems(r.announcements || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    document.body.classList.add('has-main-bg');
    return () => { document.body.classList.remove('has-main-bg'); };
  }, []);

  // Determine which announcements to always show
  const byDate = (a, b) => {
    const da = a.created_at ? new Date(a.created_at) : new Date(0);
    const db = b.created_at ? new Date(b.created_at) : new Date(0);
    return db - da;
  };
  const sorted = [...items].sort(byDate);

  const featured = sorted.find(a => a.featured);

  const adminItems = items.filter(a => a.created_by_role === 'admin').sort(byDate);
  const modItems   = items.filter(a => a.created_by_role !== 'admin').sort(byDate);

  const latestAdmin = adminItems[0] || null;
  const latestMod   = modItems[0] || null;

  // Always show up to 3: featured + latestAdmin + latestMod (by ID, no duplicates)
  const alwaysIds   = new Set();
  if (featured)     alwaysIds.add(featured.id);
  if (latestAdmin)  alwaysIds.add(latestAdmin.id);
  if (latestMod)    alwaysIds.add(latestMod.id);

  const alwaysShow = sorted.filter(a => alwaysIds.has(a.id))
    .sort((a, b) => {
      if (a.featured) return -1;
      if (b.featured) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  const rest       = sorted.filter(a => !alwaysIds.has(a.id));

  async function create() {
    if (!t.trim() || !c.trim()) { toast.error('Completa título y contenido'); return; }
    let image_path = null;
    if (imgFile) {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', imgFile);
      const up = await api.form('/api/upload', fd);
      if (up.__error) { toast.error('Error al subir imagen'); setUploading(false); return; }
      image_path = up.file.url;
      setUploading(false);
    }
    const r = await api.post('/api/announcements', { title: t, content: c, image_path });
    if (!r.__error) { setT(''); setC(''); setImgFile(null); if (fileRef.current) fileRef.current.value = ''; load(); toast.ok('Anuncio publicado'); }
  }

  async function del(id) {
    const r = await api.del('/api/announcements/' + id);
    if (!r.__error) { load(); toast.ok('Anuncio eliminado'); }
  }

  async function toggleFeatured(id) {
    const r = await api.put('/api/announcements/' + id + '/feature');
    if (!r.__error) { load(); toast.ok('Anuncio destacado actualizado'); }
  }

  async function savePublishedBy(id) {
    const r = await api.put('/api/announcements/' + id + '/published-by', { published_by: pubText });
    if (!r.__error) { setEditingPub(null); load(); toast.ok('Texto actualizado'); }
  }

  async function saveEdit(id) {
    if (!editTitle.trim() || !editContent.trim()) { toast.error('Completa todos los campos'); return; }
    const r = await api.put('/api/announcements/' + id, { title: editTitle, content: editContent });
    if (!r.__error) { setEditingAnn(null); load(); toast.ok('Anuncio actualizado'); }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <h1 className="font-serif text-2xl font-bold">Tablón de anuncios</h1>

      {(isAdmin() || isModerator()) && (
        <div className="card p-4 space-y-2">
          <input className="input" placeholder="Título" value={t} onChange={e => setT(e.target.value)} />
          <textarea className="input min-h-[100px]" placeholder="Contenido" value={c} onChange={e => setC(e.target.value)} />
          <input ref={fileRef} type="file" accept="image/*" className="text-sm" onChange={e => setImgFile(e.target.files[0] || null)} />
          <button className="btn-primary" onClick={create} disabled={uploading}>{uploading ? 'Subiendo...' : 'Publicar anuncio'}</button>
        </div>
      )}

      {/* Always-shown announcements: featured + latest admin + latest mod */}
      {loading ? (
        <>
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse rounded-xl p-5 border border-bookshelfBrown/10 bg-white/50 dark:bg-slate-800/30">
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-bookshelfBrown/10 rounded w-3/4"></div>
                  <div className="h-3 bg-bookshelfBrown/10 rounded w-1/3"></div>
                  <div className="h-4 bg-bookshelfBrown/10 rounded w-full"></div>
                  <div className="h-4 bg-bookshelfBrown/10 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          ))}
        </>
      ) : alwaysShow.map(a => (
        <AnnouncementCard
          key={a.id} a={a} user={user} isAdmin={isAdmin}
          onDelete={del} onToggleFeatured={toggleFeatured}
          editingPub={editingPub} setEditingPub={setEditingPub}
          pubText={pubText} setPubText={setPubText}
          onSavePub={savePublishedBy} featured={a.featured}
          editingAnn={editingAnn} setEditingAnn={setEditingAnn}
          editTitle={editTitle} setEditTitle={setEditTitle}
          editContent={editContent} setEditContent={setEditContent}
          onSaveEdit={saveEdit}
        />
      ))}

      {/* Previous announcements */}
      {rest.length > 0 && (
        <details className="text-sm cursor-pointer">
          <summary className="opacity-70">Anuncios anteriores ({rest.length})</summary>
          <div className="mt-2 space-y-3">
            {rest.map(a => (
              <AnnouncementCard
                key={a.id} a={a} user={user} isAdmin={isAdmin}
                onDelete={del} onToggleFeatured={toggleFeatured}
                editingPub={editingPub} setEditingPub={setEditingPub}
                pubText={pubText} setPubText={setPubText}
                onSavePub={savePublishedBy} featured={false}
                editingAnn={editingAnn} setEditingAnn={setEditingAnn}
                editTitle={editTitle} setEditTitle={setEditTitle}
                editContent={editContent} setEditContent={setEditContent}
                onSaveEdit={saveEdit}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function AnnouncementCard({ a, user, isAdmin, onDelete, onToggleFeatured, editingPub, setEditingPub, pubText, setPubText, onSavePub, featured, editingAnn, setEditingAnn, editTitle, setEditTitle, editContent, setEditContent, onSaveEdit }) {
  const isAdminAnn = a.created_by_role === 'admin';
  const authorLabel = a.created_by_name || 'BookShelf';

  let pubBy;
  if (isAdminAnn) {
    if (a.published_by === '') {
      pubBy = null;
    } else if (a.published_by) {
      pubBy = a.published_by;
    } else {
      pubBy = 'Administrador';
    }
  } else {
    pubBy = authorLabel;
  }

  return (
    <div className={
      'rounded-xl p-5 shadow-sm border ' + (isAdminAnn && featured
        ? 'bg-gradient-to-br from-amber-900/30 via-yellow-900/20 to-amber-800/20 border-amber-700/50'
        : isAdminAnn
        ? 'bg-gradient-to-br from-amber-900/20 to-yellow-900/10 border-amber-700/30'
        : 'card')
    }>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-serif text-lg font-bold">{a.title}</h3>
            {featured && <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-semibold">★ Destacado</span>}
            {isAdminAnn
              ? <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-600/40 text-amber-200 font-semibold">Admin</span>
              : <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-200 font-semibold">Moderador</span>
            }
          </div>
          <div className="text-xs opacity-60 flex items-center gap-2 mt-0.5">
            <span>{a.created_at ? new Date(a.created_at).toLocaleString() : ''}</span>
            {pubBy && <span>· Publicado por {pubBy}</span>}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          {editingAnn === a.id ? (
            <button className="btn-ghost text-xs" onClick={() => setEditingAnn(null)}>Cancelar</button>
          ) : (
            <>
              {isAdmin() && (
                <>
                  <button className="btn-ghost text-xs" title={featured ? 'Quitar destacado' : 'Destacar'}
                          onClick={() => onToggleFeatured(a.id)}>
                    {featured ? '★' : '☆'}
                  </button>
                  {isAdminAnn && (
                    editingPub === a.id ? (
                      <div className="flex gap-1 items-center">
                        <input className="input text-xs w-28" value={pubText}
                               onChange={e => setPubText(e.target.value)}
                               placeholder="Publicado por..." />
                        <button className="btn-ghost text-xs" onClick={() => onSavePub(a.id)}>OK</button>
                      </div>
                    ) : (
                      <button className="btn-ghost text-xs" title="Personalizar autor"
                              onClick={() => { setEditingPub(a.id); setPubText(a.published_by ?? ''); }}>
                        ✏
                      </button>
                    )
                  )}
                </>
              )}
              {(isAdmin() || user?.id === a.admin_id) && (
                <>
                  <button className="btn-ghost text-xs" title="Editar"
                          onClick={() => { setEditingAnn(a.id); setEditTitle(a.title); setEditContent(a.content); }}>
                    Editar
                  </button>
                  <button className="btn-ghost text-xs text-red-700" onClick={() => onDelete(a.id)}>Eliminar</button>
                </>
              )}
            </>
          )}
        </div>
      </div>
      {editingAnn === a.id ? (
        <div className="mt-3 space-y-2 border-t border-black/10 dark:border-white/10 pt-3">
          <input className="input text-sm" value={editTitle}
                 onChange={e => setEditTitle(e.target.value)} placeholder="Título" />
          <textarea className="input min-h-[80px] text-sm" value={editContent}
                    onChange={e => setEditContent(e.target.value)} placeholder="Contenido" />
          <button className="btn-primary text-sm" onClick={() => onSaveEdit(a.id)}>Guardar</button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          {a.image_path && (
            <img src={safeUrl(a.image_path)} alt=""
                 className="sm:max-w-48 sm:min-w-32 max-h-64 w-full object-contain rounded sm:object-top" />
          )}
          <div className="whitespace-pre-wrap flex-1 min-w-0">{a.content}</div>
        </div>
      )}
    </div>
  );
}

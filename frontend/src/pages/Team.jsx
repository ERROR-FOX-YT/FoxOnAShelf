import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../api/client.js';

export default function Team() {
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const [profiles, setProfiles] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [title, setTitle] = useState('Nuestro Equipo');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  useEffect(() => {
    api.get('/api/team').then(r => {
      if (!r.__error) {
        setProfiles(r.profiles || []);
        if (r.title) setTitle(r.title);
      }
    });
    document.body.classList.add('has-main-bg');
    return () => { document.body.classList.remove('has-main-bg'); };
  }, []);

  function startEdit(p) {
    setEditId(p.id);
    setEditForm({ ...p });
  }

  async function moveProfile(idx, dir) {
    const newProfiles = [...profiles];
    const target = idx + dir;
    if (target < 0 || target >= newProfiles.length) return;
    [newProfiles[idx], newProfiles[target]] = [newProfiles[target], newProfiles[idx]];
    setProfiles(newProfiles);
    const r = await api.put('/api/team/reorder', { orderedIds: newProfiles.map(p => p.id) });
    if (r.__error) {
      setProfiles(profiles);
      toast.error('Error al reordenar');
    } else {
      toast.ok('Orden actualizado');
    }
  }

  async function saveEdit() {
    const r = await api.put('/api/team/' + editId, editForm);
    if (!r.__error) {
      setProfiles(prev => prev.map(p => p.id === editId ? r.profile : p));
      setEditId(null);
      toast.ok('Perfil actualizado');
    } else {
      toast.error('Error al guardar');
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {editingTitle ? (
        <div className="flex justify-center gap-2 mb-8">
          <input className="input text-center font-serif text-3xl font-bold w-auto min-w-[300px]"
                 value={titleDraft} onChange={e => setTitleDraft(e.target.value)} />
          <button className="btn-primary text-sm" onClick={async () => {
            const r = await api.put('/api/team/title', { title: titleDraft });
            if (!r.__error) { setTitle(titleDraft); setEditingTitle(false); toast.ok('Título actualizado'); }
            else toast.error('Error al guardar');
          }}>Guardar</button>
          <button className="btn-ghost text-sm" onClick={() => setEditingTitle(false)}>Cancelar</button>
        </div>
      ) : (
        <h1 className="font-serif text-3xl font-bold mb-8 text-center">
          {title}
          {isAdmin() && (
            <button className="btn-ghost text-xs ml-3 align-middle" onClick={() => { setTitleDraft(title); setEditingTitle(true); }}>✏️</button>
          )}
        </h1>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {profiles.map((p, idx) => (
          <div key={p.id} className="card p-8 flex flex-col items-center text-center min-h-[500px]">
            <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-amber-500/40">
              <img src={p.photo_url} alt={p.name}
                   className="w-full h-full object-cover"
                   onError={e => { e.target.src = ''; e.target.style.display = 'none'; }} />
            </div>

            {editId === p.id ? (
              <div className="w-full space-y-2 text-left">
                <label className="text-xs opacity-70">Nombre completo</label>
                <input className="input text-sm w-full" value={editForm.name || ''}
                       onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                <label className="text-xs opacity-70">Cargo</label>
                <input className="input text-sm w-full" value={editForm.role || ''}
                       onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} />
                <label className="text-xs opacity-70">Edad</label>
                <input className="input text-sm w-full" value={editForm.age || ''}
                       onChange={e => setEditForm(f => ({ ...f, age: e.target.value }))} />
                <label className="text-xs opacity-70">Contacto</label>
                <input className="input text-sm w-full" value={editForm.contact || ''}
                       onChange={e => setEditForm(f => ({ ...f, contact: e.target.value }))} />
                <label className="text-xs opacity-70">Correo admin</label>
                <input className="input text-sm w-full" value={editForm.admin_email || ''}
                       onChange={e => setEditForm(f => ({ ...f, admin_email: e.target.value }))} />
                <label className="text-xs opacity-70">Información</label>
                <textarea className="input text-sm w-full min-h-[80px]" value={editForm.info || ''}
                          onChange={e => setEditForm(f => ({ ...f, info: e.target.value }))} />
                <label className="text-xs opacity-70">URL de foto</label>
                <input className="input text-sm w-full" value={editForm.photo_url || ''}
                       onChange={e => setEditForm(f => ({ ...f, photo_url: e.target.value }))} />
                <div className="flex gap-2 pt-2">
                  <button className="btn-primary text-sm" onClick={saveEdit}>Guardar</button>
                  <button className="btn-ghost text-sm" onClick={() => setEditId(null)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="font-serif text-xl font-bold mt-4">{p.name}</h2>
                {p.role && <p className="text-sm font-semibold -mt-1 text-amber-500">{p.role}</p>}
                {p.age && <p className="text-sm opacity-70 mt-4">{p.age} años</p>}
                {p.contact && <p className="text-sm opacity-70">{p.contact}</p>}
                {p.admin_email && <p className="text-xs opacity-60">{p.admin_email}</p>}
                {p.info && <p className="text-sm opacity-80 mt-2">{p.info}</p>}
                {isAdmin() && (
                  <div className="flex gap-2 mt-2">
                    <button className="btn-ghost text-xs" onClick={() => moveProfile(idx, -1)} disabled={idx === 0}>←</button>
                    <button className="btn-ghost text-xs" onClick={() => moveProfile(idx, 1)} disabled={idx === profiles.length - 1}>→</button>
                    <button className="btn-ghost text-xs" onClick={() => startEdit(p)}>Editar perfil</button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

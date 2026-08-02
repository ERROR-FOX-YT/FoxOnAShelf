import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../api/client.js';

function FotoPerfil({ perfil }) {
  const [imagenRota, setImagenRota] = useState(false);
  const tieneImagen = perfil.urlFoto && !imagenRota;
  return (
    <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-amber-500/40 bg-parchment dark:bg-nightGray flex items-center justify-center">
      {tieneImagen ? (
        <img src={perfil.urlFoto} alt={perfil.nombre}
             className="w-full h-full object-cover"
             onError={() => setImagenRota(true)} />
      ) : (
        <span className="text-sm opacity-50">-vacio-</span>
      )}
    </div>
  );
}

export default function Equipo() {
  const { isAdmin: esAdmin } = useAuth();
  const toast = useToast();
  const [perfiles, setPerfiles] = useState([]);
  const [idEdicion, setIdEdicion] = useState(null);
  const [formularioEdicion, setFormularioEdicion] = useState({});
  const [titulo, setTitulo] = useState('Nuestro Equipo');
  const [editandoTitulo, setEditandoTitulo] = useState(false);
  const [borradorTitulo, setBorradorTitulo] = useState('');

  useEffect(() => {
    api.get('/api/equipo').then(r => {
      if (!r.__error) {
        setPerfiles(r.perfiles || []);
        if (r.titulo) setTitulo(r.titulo);
      }
    });
    document.body.classList.add('has-main-bg');
    return () => { document.body.classList.remove('has-main-bg'); };
  }, []);

  function empezarEdicion(perfil) {
    setIdEdicion(perfil.id);
    setFormularioEdicion({ ...perfil });
  }

  async function moverPerfil(indice, direccion) {
    const nuevosPerfiles = [...perfiles];
    const destino = indice + direccion;
    if (destino < 0 || destino >= nuevosPerfiles.length) return;
    const perfilesPrevios = [...perfiles];
    [nuevosPerfiles[indice], nuevosPerfiles[destino]] = [nuevosPerfiles[destino], nuevosPerfiles[indice]];
    setPerfiles(nuevosPerfiles);
    const respuesta = await api.put('/api/equipo/reordenar', { idsOrdenados: nuevosPerfiles.map(p => p.id) });
    if (respuesta.__error) {
      setPerfiles(perfilesPrevios);
      toast.error('Error al reordenar');
    } else {
      toast.ok('Orden actualizado');
    }
  }

  async function guardarEdicion() {
    const respuesta = await api.put('/api/equipo/' + idEdicion, formularioEdicion);
    if (!respuesta.__error) {
      setPerfiles(prev => prev.map(p => p.id === idEdicion ? respuesta.perfil : p));
      setIdEdicion(null);
      toast.ok('Perfil actualizado');
    } else {
      toast.error('Error al guardar');
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {editandoTitulo ? (
        <div className="flex justify-center gap-2 mb-8">
          <input className="input text-center font-serif text-3xl font-bold w-auto min-w-[300px]"
                 value={borradorTitulo} onChange={e => setBorradorTitulo(e.target.value)} />
          <button className="btn-primary text-sm" onClick={async () => {
            const respuesta = await api.put('/api/equipo/titulo', { titulo: borradorTitulo });
            if (!respuesta.__error) { setTitulo(borradorTitulo); setEditandoTitulo(false); toast.ok('Título actualizado'); }
            else toast.error('Error al guardar');
          }}>Guardar</button>
          <button className="btn-ghost text-sm" onClick={() => setEditandoTitulo(false)}>Cancelar</button>
        </div>
      ) : (
        <h1 className="font-serif text-3xl font-bold mb-8 text-center">
          {titulo}
          {esAdmin() && (
            <button className="btn-ghost text-xs ml-3 align-middle" onClick={() => { setBorradorTitulo(titulo); setEditandoTitulo(true); }}>✏️</button>
          )}
        </h1>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {perfiles.map((perfil, indice) => (
          <div key={perfil.id} className="card p-8 flex flex-col items-center text-center min-h-[500px]">
            <FotoPerfil perfil={perfil} />

            {idEdicion === perfil.id ? (
              <div className="w-full space-y-2 text-left">
                <label className="text-xs opacity-70">Nombre completo</label>
                <input className="input text-sm w-full" value={formularioEdicion.nombre || ''}
                       onChange={e => setFormularioEdicion(f => ({ ...f, nombre: e.target.value }))} />
                <label className="text-xs opacity-70">Cargo</label>
                <input className="input text-sm w-full" value={formularioEdicion.role || ''}
                       onChange={e => setFormularioEdicion(f => ({ ...f, role: e.target.value }))} />
                <label className="text-xs opacity-70">Edad</label>
                <input className="input text-sm w-full" value={formularioEdicion.edad || ''}
                       onChange={e => setFormularioEdicion(f => ({ ...f, edad: e.target.value }))} />
                <label className="text-xs opacity-70">Contacto</label>
                <input className="input text-sm w-full" value={formularioEdicion.contacto || ''}
                       onChange={e => setFormularioEdicion(f => ({ ...f, contacto: e.target.value }))} />
                <label className="text-xs opacity-70">Correo admin</label>
                <input className="input text-sm w-full" value={formularioEdicion.admin_email || ''}
                       onChange={e => setFormularioEdicion(f => ({ ...f, admin_email: e.target.value }))} />
                <label className="text-xs opacity-70">Información</label>
                <textarea className="input text-sm w-full min-h-[80px]" value={formularioEdicion.informacion || ''}
                          onChange={e => setFormularioEdicion(f => ({ ...f, informacion: e.target.value }))} />
                <label className="text-xs opacity-70">URL de foto</label>
                <input className="input text-sm w-full" value={formularioEdicion.urlFoto || ''}
                       onChange={e => setFormularioEdicion(f => ({ ...f, urlFoto: e.target.value }))} />
                <div className="flex gap-2 pt-2">
                  <button className="btn-primary text-sm" onClick={guardarEdicion}>Guardar</button>
                  <button className="btn-ghost text-sm" onClick={() => setIdEdicion(null)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="font-serif text-xl font-bold mt-4">{perfil.nombre}</h2>
                {perfil.role && <p className="text-sm font-semibold -mt-1 text-amber-500">{perfil.role}</p>}
                {perfil.edad && <p className="text-sm opacity-70 mt-4">{perfil.edad} años</p>}
                {perfil.contacto && <p className="text-sm opacity-70">{perfil.contacto}</p>}
                {perfil.admin_email && <p className="text-xs opacity-60">{perfil.admin_email}</p>}
                {perfil.informacion && <p className="text-sm opacity-80 mt-2">{perfil.informacion}</p>}
                {esAdmin() && (
                  <div className="flex gap-2 mt-2">
                    <button className="btn-ghost text-xs" onClick={() => moverPerfil(indice, -1)} disabled={indice === 0}>←</button>
                    <button className="btn-ghost text-xs" onClick={() => moverPerfil(indice, 1)} disabled={indice === perfiles.length - 1}>→</button>
                    <button className="btn-ghost text-xs" onClick={() => empezarEdicion(perfil)}>Editar perfil</button>
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

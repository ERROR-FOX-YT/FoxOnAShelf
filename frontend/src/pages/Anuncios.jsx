import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { safeUrl } from '../api/safe.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Anuncios() {
  const { user, isAdmin, isModerator } = useAuth();
  const toast = useToast();
  const [anuncios, setAnuncios] = useState([]);
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [archivoImg, setArchivoImg] = useState(null);
  const [vistaPrevia, setVistaPrevia] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [editandoPublicado, setEditandoPublicado] = useState(null);
  const [textoPublicado, setTextoPublicado] = useState('');
  const [editandoAnuncio, setEditandoAnuncio] = useState(null);
  const [tituloEdicion, setTituloEdicion] = useState('');
  const [contenidoEdicion, setContenidoEdicion] = useState('');
  const [cargando, setCargando] = useState(true);
  const [mostrarVista, setMostrarVista] = useState(false);
  const refArchivo = useRef(null);

  async function cargar() {
    setCargando(true);
    const r = await api.get('/api/anuncios');
    if (!r.__error) setAnuncios(r.anuncios || []);
    setCargando(false);
  }
  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    document.body.classList.add('has-main-bg');
    return () => { document.body.classList.remove('has-main-bg'); };
  }, []);

  const porFecha = (a, b) => {
    const da = a.created_at ? new Date(a.created_at) : new Date(0);
    const db = b.created_at ? new Date(b.created_at) : new Date(0);
    return db - da;
  };

  const ordenados = [...anuncios].sort(porFecha);
  const destacado = ordenados.find(a => a.destacado);
  const adminItems = ordenados.filter(a => a.autorRol === 'admin' && !a.destacado);
  const ultimoAdmin = adminItems[0] || null;

  const idsVisibles = new Set();
  const visibles = [];
  if (destacado) { visibles.push(destacado); idsVisibles.add(destacado.id); }
  if (ultimoAdmin && !idsVisibles.has(ultimoAdmin.id)) { visibles.push(ultimoAdmin); idsVisibles.add(ultimoAdmin.id); }
  for (const a of ordenados) {
    if (idsVisibles.size >= 5) break;
    if (!idsVisibles.has(a.id)) { visibles.push(a); idsVisibles.add(a.id); }
  }
  const resto = ordenados.filter(a => !idsVisibles.has(a.id));

  function alSeleccionarImagen(e) {
    const file = e.target.files[0] || null;
    setArchivoImg(file);
    if (vistaPrevia) URL.revokeObjectURL(vistaPrevia);
    if (file) {
      const url = URL.createObjectURL(file);
      setVistaPrevia(url);
    } else {
      setVistaPrevia(null);
    }
  }

  async function crear() {
    if (!titulo.trim() || !contenido.trim()) { toast.error('Completa título y contenido'); return; }
    let rutaImagen = null;
    if (archivoImg) {
      setSubiendo(true);
      const fd = new FormData();
      fd.append('file', archivoImg);
      const up = await api.form('/api/subida', fd);
      if (up.__error) { toast.error('Error al subir imagen'); setSubiendo(false); return; }
      rutaImagen = up.archivo.url;
      setSubiendo(false);
    }
    const r = await api.post('/api/anuncios', { titulo, contenido, rutaImagen });
    if (!r.__error) {
      setTitulo(''); setContenido(''); setArchivoImg(null); setVistaPrevia(null); setMostrarVista(false);
      if (refArchivo.current) refArchivo.current.value = '';
      cargar(); toast.ok('Anuncio publicado');
    }
  }

  async function eliminar(id) {
    const r = await api.del('/api/anuncios/' + id);
    if (!r.__error) { cargar(); toast.ok('Anuncio eliminado'); }
  }

  async function alternarDestacado(id) {
    const r = await api.put('/api/anuncios/' + id + '/destacado');
    if (!r.__error) { cargar(); toast.ok('Anuncio destacado actualizado'); }
  }

  async function guardarPublicadoPor(id) {
    const r = await api.put('/api/anuncios/' + id + '/publicado-por', { publicadoPor: textoPublicado });
    if (!r.__error) { setEditandoPublicado(null); cargar(); toast.ok('Texto actualizado'); }
  }

  async function guardarEdicion(id) {
    if (!tituloEdicion.trim() || !contenidoEdicion.trim()) { toast.error('Completa todos los campos'); return; }
    const r = await api.put('/api/anuncios/' + id, { titulo: tituloEdicion, contenido: contenidoEdicion });
    if (!r.__error) { setEditandoAnuncio(null); cargar(); toast.ok('Anuncio actualizado'); }
  }

  const puedeCrear = isAdmin() || isModerator();

  return (
    <div className="page-bg max-w-3xl mx-auto px-4 py-6 space-y-4">
      <h1 className="font-serif text-2xl font-bold">Tablón de anuncios</h1>

      {puedeCrear && (
        <div className="card p-4 space-y-3">
          <input className="input" placeholder="Título" value={titulo} onChange={e => setTitulo(e.target.value)} />
          <textarea className="input min-h-[100px]" placeholder="Contenido" value={contenido} onChange={e => setContenido(e.target.value)} />
          <input ref={refArchivo} type="file" accept="image/*" className="text-sm" onChange={alSeleccionarImagen} />
          {vistaPrevia && (
            <div className="relative inline-block">
              <img src={vistaPrevia} alt="Vista previa" className="max-h-32 rounded border border-black/10 dark:border-white/10" />
              <button className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center"
                      onClick={() => { setArchivoImg(null); setVistaPrevia(null); if (refArchivo.current) refArchivo.current.value = ''; }}>×</button>
            </div>
          )}
          <div className="flex gap-2">
            <button className="btn-ghost text-xs" onClick={() => setMostrarVista(!mostrarVista)}>
              {mostrarVista ? 'Ocultar preview' : '👁 Ver preview'}
            </button>
            <button className="btn-primary" onClick={crear} disabled={subiendo}>
              {subiendo ? 'Subiendo...' : 'Publicar anuncio'}
            </button>
          </div>

          {mostrarVista && (titulo.trim() || contenido.trim()) && (
            <div className="border-t border-black/10 dark:border-white/10 pt-3 mt-2">
              <div className="text-[10px] uppercase tracking-widest opacity-50 mb-2">Preview</div>
              <VistaPreviaAnuncio titulo={titulo} contenido={contenido} rutaImagen={vistaPrevia ? vistaPrevia : null} usuario={user} />
            </div>
          )}
        </div>
      )}

      {cargando ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse rounded-xl p-5 border border-foxBrown/10 bg-white/50 dark:bg-slate-800/30">
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-foxBrown/10 rounded w-3/4"></div>
                  <div className="h-3 bg-foxBrown/10 rounded w-1/3"></div>
                  <div className="h-4 bg-foxBrown/10 rounded w-full"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {visibles.map(a => (
            <TarjetaAnuncio
              key={a.id} a={a} usuario={user} esAdmin={isAdmin}
              onEliminar={eliminar} onAlternarDestacado={alternarDestacado}
              editandoPublicado={editandoPublicado} setEditandoPublicado={setEditandoPublicado}
              textoPublicado={textoPublicado} setTextoPublicado={setTextoPublicado}
              onGuardarPublicado={guardarPublicadoPor} destacado={a.destacado}
              editandoAnuncio={editandoAnuncio} setEditandoAnuncio={setEditandoAnuncio}
              tituloEdicion={tituloEdicion} setTituloEdicion={setTituloEdicion}
              contenidoEdicion={contenidoEdicion} setContenidoEdicion={setContenidoEdicion}
              onGuardarEdicion={guardarEdicion}
            />
          ))}
        </div>
      )}

      {resto.length > 0 && (
        <details className="text-sm cursor-pointer">
          <summary className="opacity-70">Anuncios anteriores ({resto.length})</summary>
          <div className="mt-2 space-y-3">
            {resto.map(a => (
              <TarjetaAnuncio
                key={a.id} a={a} usuario={user} esAdmin={isAdmin}
                onEliminar={eliminar} onAlternarDestacado={alternarDestacado}
                editandoPublicado={editandoPublicado} setEditandoPublicado={setEditandoPublicado}
                textoPublicado={textoPublicado} setTextoPublicado={setTextoPublicado}
                onGuardarPublicado={guardarPublicadoPor} destacado={false}
                editandoAnuncio={editandoAnuncio} setEditandoAnuncio={setEditandoAnuncio}
                tituloEdicion={tituloEdicion} setTituloEdicion={setTituloEdicion}
                contenidoEdicion={contenidoEdicion} setContenidoEdicion={setContenidoEdicion}
                onGuardarEdicion={guardarEdicion}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function VistaPreviaAnuncio({ titulo, contenido, rutaImagen, usuario }) {
  const esAdminAnn = usuario?.role === 'admin';
  const esDorado = esAdminAnn;

  return (
    <div className={
      'rounded-xl p-5 shadow-sm border ' +
      (esDorado
        ? 'ann-card ann-card--gold'
        : 'ann-card')
    }>
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0 leading-none mt-0.5">📢</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className={'font-bold text-lg ' + (esDorado ? 'text-amber-800 dark:text-amber-200' : 'text-slate-800 dark:text-slate-200')}>{titulo || 'Sin título'}</div>
            {esAdminAnn && <span className="ann-badge ann-badge--admin">Admin</span>}
          </div>
          <div className="text-xs opacity-70 mt-0.5">
            {new Date().toLocaleString()} · Publicado por {usuario?.nombre_mostrado || 'Tú'}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            {rutaImagen && (
              <img src={safeUrl(rutaImagen)} alt=""
                   className="sm:max-w-48 sm:min-w-32 max-h-64 w-full object-contain rounded sm:object-top" />
            )}
            <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap flex-1 min-w-0">{contenido}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TarjetaAnuncio({ a, usuario, esAdmin, onEliminar, onAlternarDestacado, editandoPublicado, setEditandoPublicado, textoPublicado, setTextoPublicado, onGuardarPublicado, destacado, editandoAnuncio, setEditandoAnuncio, tituloEdicion, setTituloEdicion, contenidoEdicion, setContenidoEdicion, onGuardarEdicion }) {
  const esAdminAnn = a.autorRol === 'admin';
  const etiquetaAutor = a.autorNombre || 'FoxOnAShelf';
  const esDestacado = !!destacado;
  const esDorado = esAdminAnn || esDestacado;

  let publicadoPor;
  if (esAdminAnn) {
    if (a.publicadoPor === '') publicadoPor = null;
    else if (a.publicadoPor) publicadoPor = a.publicadoPor;
    else publicadoPor = 'Administrador';
  } else {
    publicadoPor = etiquetaAutor;
  }

  return (
    <div className={
      'rounded-xl p-5 shadow-sm border transition-all ' +
      (esDorado
        ? 'ann-card ann-card--gold'
        : 'ann-card')
    }>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={'font-serif text-lg font-bold ' + (esDorado ? 'text-amber-800 dark:text-amber-200' : '')}>{a.titulo}</h3>
            {esDestacado && <span className="ann-badge ann-badge--featured">★ Destacado</span>}
            {esAdminAnn
              ? <span className="ann-badge ann-badge--admin">Admin</span>
              : <span className="ann-badge ann-badge--mod">Moderador</span>
            }
          </div>
          <div className="text-xs opacity-60 flex items-center gap-2 mt-0.5">
            <span>{a.created_at ? new Date(a.created_at).toLocaleString() : ''}</span>
            {publicadoPor && <span>· Publicado por {publicadoPor}</span>}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          {editandoAnuncio === a.id ? (
            <button className="btn-ghost text-xs" onClick={() => setEditandoAnuncio(null)}>Cancelar</button>
          ) : (
            <>
              {esAdmin() && (
                <>
                  <button className="btn-ghost text-xs" title={esDestacado ? 'Quitar destacado' : 'Destacar'}
                          onClick={() => onAlternarDestacado(a.id)}>
                    {esDestacado ? '★' : '☆'}
                  </button>
                  {esAdminAnn && (
                    editandoPublicado === a.id ? (
                      <div className="flex gap-1 items-center">
                        <input className="input text-xs w-28" value={textoPublicado}
                               onChange={e => setTextoPublicado(e.target.value)}
                               placeholder="Publicado por..." />
                        <button className="btn-ghost text-xs" onClick={() => onGuardarPublicado(a.id)}>OK</button>
                      </div>
                    ) : (
                      <button className="btn-ghost text-xs" title="Personalizar autor"
                              onClick={() => { setEditandoPublicado(a.id); setTextoPublicado(a.publicadoPor ?? ''); }}>
                        ✏
                      </button>
                    )
                  )}
                </>
              )}
              {(esAdmin() || usuario?.id === a.admin_id) && (
                <>
                  <button className="btn-ghost text-xs" title="Editar"
                          onClick={() => { setEditandoAnuncio(a.id); setTituloEdicion(a.titulo); setContenidoEdicion(a.contenido); }}>
                    Editar
                  </button>
                  <button className="btn-ghost text-xs text-red-700" onClick={() => onEliminar(a.id)}>Eliminar</button>
                </>
              )}
            </>
          )}
        </div>
      </div>
      {editandoAnuncio === a.id ? (
        <div className="mt-3 space-y-2 border-t border-black/10 dark:border-white/10 pt-3">
          <input className="input text-sm" value={tituloEdicion}
                 onChange={e => setTituloEdicion(e.target.value)} placeholder="Título" />
          <textarea className="input min-h-[80px] text-sm" value={contenidoEdicion}
                    onChange={e => setContenidoEdicion(e.target.value)} placeholder="Contenido" />
          <button className="btn-primary text-sm" onClick={() => onGuardarEdicion(a.id)}>Guardar</button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          {a.rutaImagen && (
            <img src={safeUrl(a.rutaImagen)} alt=""
                 className="sm:max-w-48 sm:min-w-32 max-h-64 w-full object-contain rounded sm:object-top" />
          )}
          <div className="whitespace-pre-wrap flex-1 min-w-0">{a.contenido}</div>
        </div>
      )}
    </div>
  );
}

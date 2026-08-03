import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function ForoHilo() {
  const { hiloId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isModerator } = useAuth();
  const toast = useToast();
  const [hilo, setHilo] = useState(null);
  const [respuestas, setRespuestas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [contenidoRespuesta, setContenidoRespuesta] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [contenidoEdicion, setContenidoEdicion] = useState('');
  const [historialId, setHistorialId] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [editandoSolucion, setEditandoSolucion] = useState(false);
  const [contenidoEdicionSolucion, setContenidoEdicionSolucion] = useState('');

  useEffect(() => {
    document.body.classList.add('has-main-bg');
    return () => { document.body.classList.remove('has-main-bg'); };
  }, []);

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      const [hiloRes, respRes] = await Promise.all([
        api.get('/api/foros/' + hiloId),
        api.get('/api/foros/' + hiloId + '/respuestas?page=' + pagina)
      ]);
      if (!hiloRes.__error) {
        setHilo(hiloRes.hilo || hiloRes);
      } else {
        toast.error('Hilo no encontrado');
        navigate('/foros');
        return;
      }
      if (!respRes.__error) {
        setRespuestas(respRes.respuestas || []);
        setTotalPaginas(respRes.paginacion?.total_paginas || 1);
      }
      setCargando(false);
    }
    cargar();
  }, [hiloId, pagina]);

  async function cargarRespuestas() {
    const res = await api.get('/api/foros/' + hiloId + '/respuestas?page=' + pagina);
    if (!res.__error) {
      setRespuestas(res.respuestas || []);
      setTotalPaginas(res.paginacion?.total_paginas || 1);
    }
  }

  async function enviarRespuesta() {
    if (!contenidoRespuesta.trim()) { toast.error('Escribe una respuesta'); return; }
    setEnviando(true);
    const r = await api.post('/api/foros/' + hiloId + '/respuestas', { contenido: contenidoRespuesta.trim() });
    setEnviando(false);
    if (!r.__error) {
      toast.ok('Respuesta publicada');
      setContenidoRespuesta('');
      await cargarRespuestas();
    } else {
      toast.error(r.error || 'Error al publicar');
    }
  }

  async function marcarSolucion(respuestaId) {
    const r = await api.post('/api/foros/' + hiloId + '/solucion', { respuesta_id: respuestaId });
    if (!r.__error) {
      setHilo(h => ({ ...h, resuelto: r.resuelto }));
      await cargarRespuestas();
      toast.ok(r.es_solucion ? 'Solución marcada' : 'Solución desmarcada');
    }
  }

  async function guardarEdicionSolucion(respuestaId) {
    if (!contenidoEdicionSolucion.trim()) { toast.error('El contenido no puede estar vacío'); return; }
    const r = await api.put('/api/foros/respuestas/' + respuestaId + '/solucion', { contenido: contenidoEdicionSolucion.trim() });
    if (!r.__error) {
      toast.ok('Solución editada, votación reiniciada');
      setEditandoSolucion(false);
      setContenidoEdicionSolucion('');
      await cargarRespuestas();
    } else {
      toast.error(r.error || 'Error al editar solución');
    }
  }

  async function verHistorial(respuestaId) {
    if (historialId === respuestaId) { setHistorialId(null); return; }
    setHistorialId(respuestaId);
    setCargandoHistorial(true);
    const r = await api.get('/api/foros/respuestas/' + respuestaId + '/historial');
    if (!r.__error) setHistorial(r.historial || []);
    setCargandoHistorial(false);
  }

  async function votar(respuestaId, tipo) {
    if (!user) { toast.error('Inicia sesión para votar'); return; }
    const r = await api.post('/api/foros/respuestas/' + respuestaId + '/votos', { tipo });
    if (!r.__error) {
      if (r.auto_desmarcado) toast.ok('La solución fue desmarcada por la comunidad');
      await cargarRespuestas();
    }
  }

  async function guardarEdicion(id) {
    if (!contenidoEdicion.trim()) { toast.error('El contenido no puede estar vacío'); return; }
    const r = await api.put('/api/foros/respuestas/' + id, { contenido: contenidoEdicion.trim() });
    if (!r.__error) {
      toast.ok('Respuesta editada');
      setEditandoId(null);
      setContenidoEdicion('');
      await cargarRespuestas();
    } else {
      toast.error(r.error || 'Error al editar');
    }
  }

  async function eliminarRespuesta(id) {
    if (!confirm('¿Eliminar esta respuesta?')) return;
    const r = await api.del('/api/foros/respuestas/' + id);
    if (!r.__error) {
      toast.ok('Respuesta eliminada');
      await cargarRespuestas();
      const hiloRes = await api.get('/api/foros/' + hiloId);
      if (!hiloRes.__error) setHilo(hiloRes.hilo || hiloRes);
    }
  }

  async function toggleFijar() {
    const r = await api.put('/api/foros/' + hiloId + '/fijar');
    if (!r.__error) { setHilo(h => ({ ...h, fijado: r.fijado })); toast.ok(r.fijado ? 'Hilo fijado' : 'Hilo desfijado'); }
  }

  async function toggleCerrar() {
    const r = await api.put('/api/foros/' + hiloId + '/cerrar');
    if (!r.__error) { setHilo(h => ({ ...h, cerrado: r.cerrado })); toast.ok(r.cerrado ? 'Hilo cerrado' : 'Hilo abierto'); }
  }

  async function eliminarHilo() {
    if (!confirm('¿Eliminar este hilo y todas sus respuestas?')) return;
    const r = await api.del('/api/foros/' + hiloId);
    if (!r.__error) { toast.ok('Hilo eliminado'); navigate('/foros'); }
  }

  if (cargando) {
    return (
      <div className="page-bg max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="animate-pulse rm-card p-5 space-y-3">
          <div className="h-5 bg-foxBrown/10 rounded w-2/3"></div>
          <div className="h-20 bg-foxBrown/10 rounded w-full mt-4"></div>
        </div>
        {[1, 2].map(i => (
          <div key={i} className="animate-pulse rm-card p-4 space-y-2">
            <div className="h-12 bg-foxBrown/10 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!hilo) return null;

  const esAutor = user && user.id === hilo.autor_id;
  const esModAdmin = isAdmin() || isModerator();
  const solucion = respuestas.find(r => r.es_solucion);

  return (
    <div className="page-bg max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-2 text-xs opacity-60 flex-wrap">
        <Link to="/foros" className="hover:underline">Soporte</Link>
        <span>/</span>
        <span className="truncate max-w-[200px]">{hilo.titulo}</span>
      </div>

      <div className="rm-card p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-serif text-xl font-bold">{hilo.titulo}</h1>
              {hilo.fijado && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-semibold shrink-0">📌 Fijado</span>}
              {hilo.cerrado && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 font-semibold shrink-0">🔒 Cerrado</span>}
              {hilo.resuelto && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 font-semibold shrink-0">✅ Resuelto</span>}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs opacity-60">
              <span>por <strong>{hilo.nombre_autor || 'Anónimo'}</strong></span>
              <span>{hilo.created_at ? new Date(hilo.created_at).toLocaleString() : ''}</span>
              <span>👁 {hilo.vistas || 0}</span>
            </div>
          </div>
          {esModAdmin && (
            <div className="flex gap-1 shrink-0">
              <button className={'btn-ghost text-xs px-2 py-1' + (hilo.fijado ? ' opacity-100' : ' opacity-60')} onClick={toggleFijar} title={hilo.fijado ? 'Desfijar' : 'Fijar'}>📌</button>
              <button className={'btn-ghost text-xs px-2 py-1' + (hilo.cerrado ? ' opacity-100' : ' opacity-60')} onClick={toggleCerrar} title={hilo.cerrado ? 'Abrir' : 'Cerrar'}>🔒</button>
              <button className="btn-ghost text-xs px-2 py-1 text-red-600 opacity-60 hover:opacity-100" onClick={eliminarHilo} title="Eliminar hilo">🗑</button>
            </div>
          )}
        </div>
        <div className="whitespace-pre-wrap text-sm leading-relaxed border-t border-[var(--border-subtle)] pt-3 mt-2">
          {hilo.contenido}
        </div>
      </div>

      {solucion && (
        <div className="rm-card p-4 space-y-2 border-2 border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10">
          <div className="flex items-center gap-2 text-xs font-bold text-green-700 dark:text-green-400">
            ✅ Solución
          </div>
          <div className="flex items-start gap-3">
            {solucion.url_avatar ? (
              <img src={solucion.url_avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                   style={{ backgroundColor: 'rgba(var(--accent-main-rgb), 0.15)', color: 'var(--accent-main)' }}>
                {(solucion.nombre_autor || '?')[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{solucion.nombre_autor || 'Anónimo'}</span>
                {(solucion.autor_rol === 'admin' || solucion.autor_rol === 'moderator') && (
                  <span className="text-[10px] px-1 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-semibold">🛡️ {solucion.autor_rol === 'admin' ? 'Admin' : 'Mod'}</span>
                )}
                <span className="text-[10px] opacity-50">{solucion.created_at ? new Date(solucion.created_at).toLocaleString() : ''}</span>
                {solucion.editado && <span className="text-[10px] opacity-40 italic">(editado)</span>}
              </div>

              {editandoSolucion ? (
                <div className="mt-2 space-y-2">
                  <textarea className="input min-h-[80px] text-sm" value={contenidoEdicionSolucion} onChange={e => setContenidoEdicionSolucion(e.target.value)} />
                  <div className="flex gap-2">
                    <button className="btn-primary text-xs" onClick={() => guardarEdicionSolucion(solucion.id)}>Guardar</button>
                    <button className="btn-ghost text-xs" onClick={() => { setEditandoSolucion(false); setContenidoEdicionSolucion(''); }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-sm mt-1 leading-relaxed">{solucion.contenido}</div>
              )}

              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <button className="text-xs px-2 py-0.5 rounded hover:bg-green-100 dark:hover:bg-green-900/30 border border-green-300 dark:border-green-700" onClick={() => votar(solucion.id, 'util')} title="Útil">👍 {solucion.votos_utiles || 0}</button>
                  <button className="text-xs px-2 py-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-300 dark:border-red-700" onClick={() => votar(solucion.id, 'no_util')} title="No útil">👎 {solucion.votos_no_utiles || 0}</button>
                </div>
                {(esAutor || esModAdmin) && (
                  <button className="btn-ghost text-[10px] px-1.5 py-0.5 opacity-60 hover:opacity-100" onClick={() => { setEditandoSolucion(true); setContenidoEdicionSolucion(solucion.contenido); }}>✏️ Editar</button>
                )}
                {esAutor && (
                  <button className="btn-ghost text-[10px] px-1.5 py-0.5 opacity-60 hover:opacity-100" onClick={() => marcarSolucion(solucion.id)}>❌ Quitar solución</button>
                )}
                <button className="btn-ghost text-[10px] px-1.5 py-0.5 opacity-60 hover:opacity-100" onClick={() => verHistorial(solucion.id)}>
                  📜 Historial {historialId === solucion.id ? '▲' : '▼'}
                </button>
              </div>

              {historialId === solucion.id && (
                <div className="mt-2 pl-3 border-l-2 border-green-300 dark:border-green-700 space-y-1">
                  {cargandoHistorial ? (
                    <div className="text-xs opacity-50">Cargando...</div>
                  ) : historial.length === 0 ? (
                    <div className="text-xs opacity-50">Sin ediciones previas</div>
                  ) : (
                    historial.map(h => (
                      <div key={h.id} className="text-[10px] opacity-60 space-y-0.5">
                        <div><strong>{h.usuario_nombre || 'Anónimo'}</strong> editó {h.created_at ? new Date(h.created_at).toLocaleString() : ''}</div>
                        <div className="line-through opacity-50">{h.contenido_anterior}</div>
                        <div className="text-green-600 dark:text-green-400">{h.contenido_nuevo}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="font-serif text-sm font-bold opacity-70">Respuestas ({hilo.total_respuestas || respuestas.length})</h2>

        {respuestas.filter(r => !r.es_solucion).length === 0 && !solucion ? (
          <div className="text-center py-8 opacity-50 text-sm">
            <div className="text-2xl mb-1">💬</div>
            No hay respuestas aún. ¡Sé el primero en responder!
          </div>
        ) : (
          respuestas.filter(r => !r.es_solucion).map(resp => (
            <div key={resp.id} className="rm-card p-4 space-y-2">
              <div className="flex items-start gap-3">
                {resp.url_avatar ? (
                  <img src={resp.url_avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                       style={{ backgroundColor: 'rgba(var(--accent-main-rgb), 0.15)', color: 'var(--accent-main)' }}>
                    {(resp.nombre_autor || '?')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{resp.nombre_autor || 'Anónimo'}</span>
                    {(resp.autor_rol === 'admin' || resp.autor_rol === 'moderator') && (
                      <span className="text-[10px] px-1 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-semibold">🛡️ {resp.autor_rol === 'admin' ? 'Admin' : 'Mod'}</span>
                    )}
                    <span className="text-[10px] opacity-50">{resp.created_at ? new Date(resp.created_at).toLocaleString() : ''}</span>
                    {resp.editado && <span className="text-[10px] opacity-40 italic">(editado)</span>}
                  </div>

                  {editandoId === resp.id ? (
                    <div className="mt-2 space-y-2">
                      <textarea className="input min-h-[80px] text-sm" value={contenidoEdicion} onChange={e => setContenidoEdicion(e.target.value)} />
                      <div className="flex gap-2">
                        <button className="btn-primary text-xs" onClick={() => guardarEdicion(resp.id)}>Guardar</button>
                        <button className="btn-ghost text-xs" onClick={() => { setEditandoId(null); setContenidoEdicion(''); }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap text-sm mt-1 leading-relaxed">{resp.contenido}</div>
                  )}

                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {(esAutor || esModAdmin) && !hilo.cerrado && (
                      <button className="btn-ghost text-[10px] px-2 py-0.5 opacity-60 hover:opacity-100" onClick={() => marcarSolucion(resp.id)} title="Marcar como solución">✅ Solución</button>
                    )}
                  </div>
                </div>

                <div className="flex gap-1 shrink-0">
                  {(esModAdmin || (user && user.id === resp.autor_id)) && !hilo.cerrado && (
                    <button className="btn-ghost text-[10px] px-1.5 py-0.5 opacity-50 hover:opacity-100"
                      onClick={() => { setEditandoId(resp.id); setContenidoEdicion(resp.contenido); }} title="Editar">✏</button>
                  )}
                  {(esModAdmin || (user && user.id === resp.autor_id)) && (
                    <button className="btn-ghost text-[10px] px-1.5 py-0.5 opacity-50 hover:opacity-100 text-red-600"
                      onClick={() => eliminarRespuesta(resp.id)} title="Eliminar">🗑</button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button className="btn-ghost text-xs px-3 py-1.5" onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}>← Anterior</button>
          <span className="text-xs opacity-60">Página {pagina} de {totalPaginas}</span>
          <button className="btn-ghost text-xs px-3 py-1.5" onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}>Siguiente →</button>
        </div>
      )}

      {user && !hilo.cerrado && (
        <div className="rm-card p-4 space-y-3">
          <h3 className="font-serif text-sm font-bold opacity-70">Escribir una respuesta</h3>
          <textarea className="input min-h-[100px]" placeholder="Escribe tu respuesta..." value={contenidoRespuesta} onChange={e => setContenidoRespuesta(e.target.value)} />
          <div className="flex justify-end">
            <button className="btn-primary text-sm" onClick={enviarRespuesta} disabled={enviando || !contenidoRespuesta.trim()}>
              {enviando ? 'Enviando...' : 'Publicar respuesta'}
            </button>
          </div>
        </div>
      )}

      {hilo.cerrado && <div className="text-center py-4 text-sm opacity-50">🔒 Este hilo está cerrado.</div>}
      {!user && <div className="text-center py-4 text-sm opacity-50"><Link to="/login" className="underline">Inicia sesión</Link> para responder.</div>}
    </div>
  );
}

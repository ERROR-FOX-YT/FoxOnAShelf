import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Foros() {
  const { user, isAdmin, isModerator } = useAuth();
  const [pendientes, setPendientes] = useState([]);
  const [resueltos, setResueltos] = useState([]);
  const [anuncios, setAnuncios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [pagPendientes, setPagPendientes] = useState(1);
  const [pagResueltos, setPagResueltos] = useState(1);
  const [totalPagPendientes, setTotalPagPendientes] = useState(1);
  const [totalPagResueltos, setTotalPagResueltos] = useState(1);
  const [ creandoHilo, setCreandoHilo ] = useState(false);
  const [tituloHilo, setTituloHilo] = useState('');
  const [contenidoHilo, setContenidoHilo] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    document.body.classList.add('has-main-bg');
    return () => { document.body.classList.remove('has-main-bg'); };
  }, []);

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      const [penRes, resRes, annRes] = await Promise.all([
        api.get('/api/foros/estado/pendientes?page=' + pagPendientes),
        api.get('/api/foros/estado/resueltos?page=' + pagResueltos),
        api.get('/api/foros/anuncios')
      ]);
      if (!penRes.__error) {
        setPendientes(penRes.hilos || []);
        setTotalPagPendientes(penRes.paginacion?.total_paginas || 1);
      }
      if (!resRes.__error) {
        setResueltos(resRes.hilos || []);
        setTotalPagResueltos(resRes.paginacion?.total_paginas || 1);
      }
      if (!annRes.__error) setAnuncios(annRes.anuncios || []);
      setCargando(false);
    }
    cargar();
  }, [pagPendientes, pagResueltos]);

  useEffect(() => {
    if (!busqueda.trim()) { setResultadosBusqueda(null); return; }
    const timer = setTimeout(async () => {
      setBuscando(true);
      const r = await api.get('/api/foros/buscar?q=' + encodeURIComponent(busqueda));
      if (!r.__error) setResultadosBusqueda(r.hilos || []);
      else setResultadosBusqueda([]);
      setBuscando(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [busqueda]);

  async function crearHilo() {
    if (!tituloHilo.trim() || !contenidoHilo.trim()) { return; }
    setEnviando(true);
    const r = await api.post('/api/foros', { titulo: tituloHilo.trim(), contenido: contenidoHilo.trim() });
    setEnviando(false);
    if (!r.__error) {
      setCreandoHilo(false);
      setTituloHilo('');
      setContenidoHilo('');
      const res = await api.get('/api/foros/estado/pendientes?page=1');
      if (!res.__error) { setPendientes(res.hilos || []); setPagPendientes(1); }
    }
  }

  function renderHiloCard(hilo) {
    return (
      <Link
        key={hilo.id}
        to={'/foros/hilos/' + hilo.id}
        className="rm-card p-3 hover:shadow-md transition-shadow block"
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm truncate">{hilo.titulo}</span>
              {hilo.fijado && <span className="text-[10px] px-1 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-semibold shrink-0">📌</span>}
              {hilo.cerrado && <span className="text-[10px] px-1 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 font-semibold shrink-0">🔒</span>}
              {hilo.resuelto && <span className="text-[10px] px-1 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 font-semibold shrink-0">✅</span>}
            </div>
            <div className="text-xs opacity-60 mt-1">
              {hilo.nombre_autor || 'Anónimo'} · {hilo.total_respuestas || 0} respuestas · {hilo.vistas || 0} vistas
            </div>
            {hilo.solucion_id && (
              <div className="text-[10px] mt-1 text-green-600 dark:text-green-400 font-semibold">✅ Solución disponible</div>
            )}
          </div>
        </div>
      </Link>
    );
  }

  function renderColumna(titulo, icono, hilos, pagina, setPagina, totalPaginas, vacioMsg, vacioIcono) {
    return (
      <div className="flex-1 min-w-0 space-y-2">
        <h2 className="font-serif text-sm font-bold opacity-80 flex items-center gap-2">
          <span>{icono}</span> {titulo}
          <span className="text-xs font-normal opacity-50">({hilos.length})</span>
        </h2>
        {hilos.length === 0 ? (
          <div className="text-center py-8 opacity-50 text-sm">
            <div className="text-2xl mb-1">{vacioIcono || '📭'}</div>
            {vacioMsg}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {hilos.map(renderHiloCard)}
            </div>
            {totalPaginas > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button className="btn-ghost text-xs px-2 py-1" onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}>←</button>
                <span className="text-[10px] opacity-50">{pagina}/{totalPaginas}</span>
                <button className="btn-ghost text-xs px-2 py-1" onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}>→</button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="page-bg max-w-7xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-xl font-bold">🛠️ Soporte</h1>
        {user && !creandoHilo && (
          <button className="btn-primary text-xs px-3 py-1.5" onClick={() => setCreandoHilo(true)}>
            + Nuevo hilo
          </button>
        )}
      </div>

      {creandoHilo && (
        <div className="rm-card p-4 space-y-3">
          <h3 className="font-serif text-sm font-bold opacity-70">Crear nuevo hilo</h3>
          <input
            className="input text-sm"
            placeholder="Título del problema o pregunta..."
            value={tituloHilo}
            onChange={e => setTituloHilo(e.target.value)}
            maxLength={300}
          />
          <textarea
            className="input min-h-[100px] text-sm"
            placeholder="Describe tu problema o pregunta con detalle..."
            value={contenidoHilo}
            onChange={e => setContenidoHilo(e.target.value)}
            maxLength={50000}
          />
          <div className="flex justify-end gap-2">
            <button className="btn-ghost text-xs" onClick={() => { setCreandoHilo(false); setTituloHilo(''); setContenidoHilo(''); }}>Cancelar</button>
            <button className="btn-primary text-xs" onClick={crearHilo} disabled={enviando || !tituloHilo.trim() || !contenidoHilo.trim()}>
              {enviando ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
        </div>
      )}

      <div className="relative">
        <input
          className="rm-search pl-10"
          placeholder="Buscar hilos..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
        </svg>
      </div>

      {resultadosBusqueda !== null ? (
        <div className="space-y-2">
          <div className="text-xs opacity-60">
            {buscando ? 'Buscando...' : `${resultadosBusqueda.length} resultado${resultadosBusqueda.length !== 1 ? 's' : ''}`}
          </div>
          {resultadosBusqueda.map(renderHiloCard)}
          {resultadosBusqueda.length === 0 && (
            <div className="text-center py-8 opacity-50 text-sm">
              <div className="text-2xl mb-1">🔍</div>
              No se encontraron hilos con "{busqueda}"
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4">
          {cargando ? (
            <>
              {[1, 2].map(i => (
                <div key={i} className="flex-1 space-y-2">
                  <div className="animate-pulse h-4 bg-foxBrown/10 rounded w-1/3"></div>
                  {[1, 2, 3].map(j => (
                    <div key={j} className="animate-pulse rm-card p-3 space-y-2">
                      <div className="h-3 bg-foxBrown/10 rounded w-2/3"></div>
                      <div className="h-2 bg-foxBrown/10 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ))}
            </>
          ) : (
            <>
              {renderColumna('Pendientes', '📋', pendientes, pagPendientes, setPagPendientes, totalPagPendientes, 'No hay hilos pendientes. ¡Sé el primero en pedir ayuda!', '✨')}
              {renderColumna('Resueltos', '✅', resueltos, pagResueltos, setPagResueltos, totalPagResueltos, 'Aún no hay hilos resueltos.', '🔍')}
            </>
          )}

          <div className="w-full lg:w-56 shrink-0 space-y-3">
            <div className="rm-card p-3 space-y-2">
              <h2 className="font-serif text-xs font-bold opacity-80">📢 Anuncios</h2>
              {anuncios.length === 0 ? (
                <div className="text-xs opacity-40 py-2 text-center">Sin anuncios</div>
              ) : (
                <div className="space-y-2">
                  {anuncios.slice(0, 5).map(a => (
                    <div key={a.id} className="text-xs space-y-0.5">
                      <div className="font-semibold truncate">{a.titulo}</div>
                      <div className="opacity-50 text-[10px]">{a.autor_nombre} · {new Date(a.created_at).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!user && (
              <div className="rm-card p-3 text-center space-y-2">
                <p className="text-xs opacity-60">Inicia sesión para participar.</p>
                <Link to="/login" className="btn-primary text-xs inline-block px-3 py-1.5">Iniciar sesión</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

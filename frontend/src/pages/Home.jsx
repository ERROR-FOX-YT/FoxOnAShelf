import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { safeUrl } from '../api/safe.js';
import BookList from '../components/BookList.jsx';
import { bannerEntrance, cardEntrance } from '../components/animations/animations.js';

export default function Home() {
  const [anuncios, setAnuncios] = useState([]);
  const [featured, setF]        = useState([]);
  const [metrics, setM]         = useState({ autores_total:0, libros_total:0, vistas_total:0 });
  const [loaded, setLoaded]     = useState(false);
  const heroRef = useRef(null);
  const cardsRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get('/api/anuncios').then(r => setAnuncios(r.anuncios || [])),
      api.get('/api/metricas/destacados').then(r => setF(r.destacados || [])),
      api.get('/api/metricas').then(r => setM(r)),
    ]).finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    document.body.classList.add('has-main-bg');
    return () => { document.body.classList.remove('has-main-bg'); };
  }, []);

  useEffect(() => { if (heroRef.current) bannerEntrance(heroRef.current); }, [featured]);
  useEffect(() => {
    if (cardsRef.current) cardEntrance(cardsRef.current.querySelectorAll('[data-metric]'));
  }, [metrics]);

  // Orden de anuncios: destacado > último admin > luego por fecha
  const porFecha = (a, b) => {
    const da = a.created_at ? new Date(a.created_at) : new Date(0);
    const db = b.created_at ? new Date(b.created_at) : new Date(0);
    return db - da;
  };

  const ordenados = [...anuncios].sort(porFecha);
  const destacado = ordenados.find(a => a.destacado);
  const ultimoAnuncio = ordenados[0] || null;
  const anuncioHero = destacado || ultimoAnuncio;
  const idHero = anuncioHero ? anuncioHero.id : null;

  const itemsAdmin = ordenados.filter(a => a.autorRol === 'admin' && !a.destacado);
  const ultimoAdmin = itemsAdmin[0] || null;

  const idsLaterales = new Set();
  const visiblesLaterales = [];
  if (destacado) { visiblesLaterales.push(destacado); idsLaterales.add(destacado.id); }
  if (ultimoAdmin && !idsLaterales.has(ultimoAdmin.id)) { visiblesLaterales.push(ultimoAdmin); idsLaterales.add(ultimoAdmin.id); }
  for (const a of ordenados) {
    if (visiblesLaterales.length >= 9) break;
    if (!idsLaterales.has(a.id)) { visiblesLaterales.push(a); idsLaterales.add(a.id); }
  }
  const resto = ordenados.filter(a => a.id !== idHero && !idsLaterales.has(a.id));

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* === LEFT: Main content === */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* === STATS (top) === */}
          <section ref={cardsRef} className="grid grid-cols-3 gap-3">
            <Stat label="Autores" value={metrics.autores_total} />
            <Stat label="Publicados" value={metrics.libros_total} />
            <Stat label="Vistas" value={metrics.vistas_total} />
          </section>

          {/* === FEATURED BOOKS HERO === */}
          <section ref={heroRef} className="home-hero">
            <div className="home-hero__center">
              <h1 className="font-serif text-2xl font-bold text-foxBrown">FoxOnAShelf™</h1>
              <p className="text-sm opacity-70 max-w-md">Lectura digital abierta y justa — una plataforma colombiana para leer, escribir y compartir historias.</p>
            </div>
            {!loaded ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="animate-pulse rounded-xl h-48 bg-foxBrown/10"></div>
                ))}
              </div>
            ) : featured.length > 0 ? (
              <div className="mt-3">
                <BookList books={featured} />
                <Link to="/explore" className="home-explore-bar">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                  </svg>
                  Explorar más libros
                </Link>
              </div>
            ) : (
              <div className="text-center py-8 opacity-50 text-sm mt-4">
                <p>No hay libros destacados aún.</p>
                <Link to="/explore" className="text-foxBrown hover:underline mt-1 inline-block">Explorar catálogo →</Link>
              </div>
            )}
          </section>

          {/* === HERO ANNOUNCEMENT (featured or most recent) === */}
          {!loaded ? (
            <section className="animate-pulse rounded-xl p-5 border border-foxBrown/10 bg-white/50 dark:bg-slate-800/30">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded bg-foxBrown/10 shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-foxBrown/10 rounded w-3/4"></div>
                  <div className="h-3 bg-foxBrown/10 rounded w-1/3"></div>
                  <div className="h-4 bg-foxBrown/10 rounded w-full"></div>
                </div>
              </div>
            </section>
          ) : anuncioHero ? (
            <BannerAnuncio a={anuncioHero} />
          ) : null}

          {/* Anuncios anteriores */}
          {resto.length > 0 && (
            <details className="text-xs opacity-70 cursor-pointer">
              <summary className="inline">Anuncios anteriores ({resto.length})</summary>
              <div className="mt-2 space-y-2">
                {resto.map(a => (
                  <div key={a.id} className="border-l-2 border-amber-400 dark:border-amber-600 pl-3 py-1">
                    <div className="font-semibold text-amber-900 dark:text-amber-200">{a.titulo}</div>
                    <div className="flex flex-col sm:flex-row gap-2 mt-1">
                      {a.rutaImagen && (
                        <img src={safeUrl(a.rutaImagen)} alt="" className="sm:max-w-32 max-h-24 w-full object-contain rounded" />
                      )}
                      <div className="text-xs opacity-80 whitespace-pre-wrap flex-1 min-w-0">{a.contenido}</div>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>

        {/* === DERECHA: sidebar de anuncios + espacio publicitario === */}
        <aside className="w-full lg:w-80 shrink-0 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold text-foxBrown">Anuncios</h2>
            <Link to="/anuncios" className="text-xs text-foxBrown hover:underline">Ver todos</Link>
          </div>

          {!loaded ? (
            <div className="space-y-2">
              {[1, 2].map(i => (
                <div key={i} className="animate-pulse rounded-lg p-3 border border-foxBrown/10 bg-white/50 dark:bg-slate-800/30">
                  <div className="h-4 bg-foxBrown/10 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-foxBrown/10 rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {visiblesLaterales.slice(0, 9).map((a, i) => (
                <div key={a.id}>
                  <AnuncioLateral a={a} />
                  {(i + 1) % 3 === 0 && i < 8 && (
                    <div className="my-3 rounded-xl border-2 border-dashed border-foxBrown/20 dark:border-foxBrown/10 p-4 text-center">
                      <div className="text-[10px] opacity-40 uppercase tracking-widest">Publicidad</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function BannerAnuncio({ a }) {
  const esAdminAnn = a.autorRol === 'admin';
  const esDestacado = !!a.destacado;
  let publicadoPor;
  if (esAdminAnn) {
    if (a.publicadoPor === '') publicadoPor = null;
    else if (a.publicadoPor) publicadoPor = a.publicadoPor;
    else publicadoPor = 'Administrador';
  } else {
    publicadoPor = a.autorNombre || 'Moderador';
  }

  const esDorado = esAdminAnn || esDestacado;

  return (
    <section className={
      esDorado
        ? 'ann-card ann-card--gold'
        : 'ann-card'
    }>
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0 leading-none mt-0.5">📢</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className={'font-bold text-lg ' + (esDorado ? 'text-amber-800 dark:text-amber-200' : 'text-slate-800 dark:text-slate-200')}>{a.titulo}</div>
            {esDestacado && <span className="ann-badge ann-badge--featured">★ Destacado</span>}
            {esAdminAnn
              ? <span className="ann-badge ann-badge--admin">Admin</span>
              : <span className="ann-badge ann-badge--mod">Moderador</span>
            }
          </div>
          <div className="text-xs opacity-70 mt-0.5">
            {a.created_at ? new Date(a.created_at).toLocaleString() : ''}
            {publicadoPor && <span> · Publicado por {publicadoPor}</span>}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            {a.rutaImagen && (
              <img src={safeUrl(a.rutaImagen)} alt=""
                   className="sm:max-w-48 sm:min-w-32 max-h-64 w-full object-contain rounded sm:object-top" />
            )}
            <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap flex-1 min-w-0">{a.contenido}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AnuncioLateral({ a }) {
  const esAdminAnn = a.autorRol === 'admin';
  const esDestacado = !!a.destacado;
  const esDorado = esAdminAnn || esDestacado;

  return (
    <Link to="/anuncios" className={
      'block rounded-lg p-3 border transition-all hover:shadow-sm ' +
      (esDorado
        ? 'border-amber-400/50 dark:border-amber-600/30 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/10'
        : 'border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/30')
    }>
      <div className="flex items-center gap-2 mb-1">
        {esDestacado && <span className="text-yellow-500 text-xs">★</span>}
        {esAdminAnn && <span className="text-[9px] uppercase tracking-wider px-1 py-0.5 rounded bg-amber-200/60 dark:bg-amber-600/40 text-amber-900 dark:text-amber-200 font-semibold">Admin</span>}
        <span className={'font-semibold text-sm truncate ' + (esDorado ? 'text-amber-900 dark:text-amber-200' : 'text-slate-800 dark:text-slate-200')}>{a.titulo}</span>
      </div>
      <p className="text-xs opacity-60 line-clamp-2">{a.contenido}</p>
      <div className="text-[10px] opacity-40 mt-1">
        {a.created_at ? new Date(a.created_at).toLocaleDateString() : ''}
      </div>
    </Link>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rm-card p-3 text-center" data-metric>
      <div className="text-2xl font-serif font-bold text-foxBrown">{value}</div>
      <div className="text-[11px] uppercase tracking-wide opacity-60 mt-0.5">{label}</div>
    </div>
  );
}

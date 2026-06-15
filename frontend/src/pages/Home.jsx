import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { safeUrl } from '../api/safe.js';
import BookList from '../components/BookList.jsx';
import { bannerEntrance, cardEntrance } from '../components/animations/animations.js';

export default function Home() {
  const [announcements, setAnn] = useState([]);
  const [featured, setF]        = useState([]);
  const [metrics, setM]         = useState({ authors_total:0, books_total:0, views_total:0 });
  const [loaded, setLoaded]     = useState(false);
  const annRef = useRef(null);
  const cardsRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get('/api/announcements').then(r => setAnn(r.announcements || [])),
      api.get('/api/metrics/featured').then(r => setF(r.featured || [])),
      api.get('/api/metrics').then(r => setM(r)),
    ]).finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    document.body.classList.add('has-main-bg');
    return () => { document.body.classList.remove('has-main-bg'); };
  }, []);

  useEffect(() => { if (annRef.current) bannerEntrance(annRef.current); }, [announcements]);
  useEffect(() => {
    if (cardsRef.current) cardEntrance(cardsRef.current.querySelectorAll('[data-metric]'));
  }, [metrics]);

  const featuredAnn = announcements.find(a => a.featured);

  const byDate = (a, b) => {
    const da = a.created_at ? new Date(a.created_at) : new Date(0);
    const db = b.created_at ? new Date(b.created_at) : new Date(0);
    return db - da;
  };

  const sorted = [...announcements].sort(byDate);
  const adminItems = announcements.filter(a => a.created_by_role === 'admin').sort(byDate);
  const modItems   = announcements.filter(a => a.created_by_role !== 'admin').sort(byDate);

  const latestAdmin = adminItems[0] || null;
  const latestMod   = modItems[0] || null;

  // Always show up to 3: featured + latestAdmin + latestMod (by ID, no duplicates)
  const alwaysIds = new Set();
  if (featuredAnn) alwaysIds.add(featuredAnn.id);
  if (latestAdmin) alwaysIds.add(latestAdmin.id);
  if (latestMod)   alwaysIds.add(latestMod.id);

  const alwaysShow = sorted.filter(a => alwaysIds.has(a.id))
    .sort((a, b) => {
      if (a.featured) return -1;
      if (b.featured) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  const rest       = sorted.filter(a => !alwaysIds.has(a.id));

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <section ref={annRef} className="rm-card p-6">
        <h1 className="font-serif text-3xl font-bold text-bookshelfBrown">BookShelf™ — Lectura digital abierta y justa</h1>
        <p className="opacity-80 mt-1">Una plataforma colombiana para leer, escribir y compartir historias.</p>
      </section>

      {/* Always-shown announcements: featured + latest admin + latest mod */}
      {!loaded ? (
        <>
          {[1, 2, 3].map(i => (
            <section key={i} className="animate-pulse rounded-xl p-5 border border-bookshelfBrown/10 bg-white/50 dark:bg-slate-800/30">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded bg-bookshelfBrown/10 shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-bookshelfBrown/10 rounded w-3/4"></div>
                  <div className="h-3 bg-bookshelfBrown/10 rounded w-1/3"></div>
                  <div className="h-4 bg-bookshelfBrown/10 rounded w-full"></div>
                  <div className="h-4 bg-bookshelfBrown/10 rounded w-2/3"></div>
                </div>
              </div>
            </section>
          ))}
        </>
      ) : alwaysShow.map(a => (
        <AnnBanner key={a.id} a={a} isFeatured={!!a.featured} />
      ))}

      {/* Previous announcements */}
      {rest.length > 0 && (
        <details className="text-xs opacity-70 -mt-3 cursor-pointer">
          <summary className="inline">Anuncios anteriores ({rest.length})</summary>
          <div className="mt-2 space-y-2">
            {rest.map(a => (
              <div key={a.id} className="border-l-2 border-amber-400 dark:border-amber-600 pl-3 py-1">
                <div className="font-semibold text-amber-900 dark:text-amber-200">{a.title}</div>
                <div className="flex flex-col sm:flex-row gap-2 mt-1">
                  {a.image_path && (
                    <img src={safeUrl(a.image_path)} alt="" className="sm:max-w-32 max-h-24 w-full object-contain rounded" />
                  )}
                  <div className="text-xs opacity-80 whitespace-pre-wrap flex-1 min-w-0">{a.content}</div>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      <section ref={cardsRef} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Autores registrados" value={metrics.authors_total} hint="Autores con libros publicados" />
        <Stat label="Libros publicados"   value={metrics.books_total}   hint="Con estado = publicado" />
        <Stat label="Libros vistos"       value={metrics.views_total}   hint="Suma de visitas" />
      </section>

      <section>
        <h2 className="font-serif text-xl font-bold mb-3">Libros más vistos</h2>
        {!loaded ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse card p-4 space-y-3">
                <div className="h-5 bg-bookshelfBrown/10 rounded w-3/4"></div>
                <div className="h-3 bg-bookshelfBrown/10 rounded w-1/2"></div>
                <div className="h-3 bg-bookshelfBrown/10 rounded w-full"></div>
                <div className="h-3 bg-bookshelfBrown/10 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : (
          <BookList books={featured} />
        )}
        <p className="text-xs opacity-60 mt-2">Los destacados se ordenan por número de vistas, no por favoritos.</p>
      </section>
    </div>
  );
}

function AnnBanner({ a, isFeatured }) {
  const isAdminAnn = a.created_by_role === 'admin';
  let pubBy;
  if (isAdminAnn) {
    if (a.published_by === '') pubBy = null;
    else if (a.published_by) pubBy = a.published_by;
    else pubBy = 'Administrador';
  } else {
    pubBy = a.created_by_name || 'Moderador';
  }

  return (
    <section className={
      isAdminAnn && isFeatured
        ? 'bg-gradient-to-br from-amber-100 via-amber-200 to-yellow-100 dark:from-amber-900/30 dark:via-yellow-900/20 dark:to-amber-800/20 border border-amber-400 dark:border-amber-700/50 rounded-xl p-5 shadow-sm'
        : isAdminAnn
        ? 'bg-gradient-to-br from-amber-100/70 to-yellow-100/50 dark:from-amber-900/20 dark:to-yellow-900/10 border border-amber-300/70 dark:border-amber-700/30 rounded-xl p-5 shadow-sm'
        : 'bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 shadow-sm'
    }>
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0 leading-none mt-0.5">📢</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className={'font-bold text-lg ' + (isAdminAnn ? 'text-amber-800 dark:text-amber-200' : 'text-slate-800 dark:text-slate-200')}>{a.title}</div>
            {isFeatured && <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 font-semibold">★ Destacado</span>}
            {isAdminAnn
              ? <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-200/60 dark:bg-amber-600/40 text-amber-900 dark:text-amber-200 font-semibold">Admin</span>
              : <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 font-semibold">Moderador</span>
            }
          </div>
          <div className="text-xs opacity-70 mt-0.5">
            {a.created_at ? new Date(a.created_at).toLocaleString() : ''}
            {pubBy && <span> · Publicado por {pubBy}</span>}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
{a.image_path && (
  <img src={safeUrl(a.image_path)} alt=""
       className="sm:max-w-48 sm:min-w-32 max-h-64 w-full object-contain rounded sm:object-top" />
)}
            <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap flex-1 min-w-0">{a.content}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div className="rm-card p-4" data-metric>
      <div className="text-xs uppercase opacity-70">{label}</div>
      <div className="text-3xl font-serif font-bold text-bookshelfBrown">{value}</div>
      <div className="text-xs opacity-60">{hint}</div>
    </div>
  );
}

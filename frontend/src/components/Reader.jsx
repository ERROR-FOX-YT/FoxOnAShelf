import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import ReadingMode from './ReadingMode.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import HighlightsPanel from './HighlightsPanel.jsx';
import { THEMES, FONTS, WIDTHS, FONT_SIZES, LINE_HEIGHTS, DARK_THEMES } from './readerConstants.js';

const PREFS_KEY = 'bookshelf.reader.prefs';
const DEFAULT_PREFS = {
  theme: 'parchment',
  font: 'serif',
  fontSize: 18,
  lineHeight: 'normal',
  width: 'narrow',
};

function loadPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null');
    return { ...DEFAULT_PREFS, ...(saved || {}) };
  } catch { return { ...DEFAULT_PREFS }; }
}
function savePrefs(p) { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); }

function opcionesDisponibles(book) {
  const perm = typeof book.permisos_lector === 'string'
    ? (() => { try { return JSON.parse(book.permisos_lector); } catch { return {}; } })()
    : (book.permisos_lector || {});
  return {
    fondo: perm.permitir_cambiar_fondo !== false,
    tipografia: perm.permitir_cambiar_tipografia !== false,
    tamano: perm.permitir_cambiar_tamano !== false,
    interlineado: perm.permitir_cambiar_interlineado !== false,
    ancho: perm.permitir_cambiar_ancho !== false,
    colorHoja: perm.permitir_cambiar_color_hoja !== false,
    imagenPrestablecida: perm.imagen_fondo_prestablecida || null,
    tipografiaDefecto: perm.tipografia_por_defecto || 'serif',
    tamanoDefecto: perm.tamano_por_defecto || 18,
    fondoDefecto: perm.fondo_por_defecto || 'parchment',
    notaComic: book.tipo_libro === 'comic'
      ? (perm.nota_comic || 'Este libro es ilustrado. La tipografía no aplica al contenido visual.')
      : null,
  };
}

export default function Reader({ book, chapters, bookmark }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const perm = useMemo(() => opcionesDisponibles(book), [book]);

  const [prefs, setPrefs] = useState(() => {
    const saved = loadPrefs();
    return {
      ...saved,
      font: perm.tipografiaDefecto || saved.font,
      fontSize: perm.tamanoDefecto || saved.fontSize,
      theme: perm.fondoDefecto || saved.theme,
    };
  });
  const [reading, setReading] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(bookmark?.indice_capitulo || 0);
  const [scrollPos, setScrollPos] = useState(bookmark?.posicion_desplazamiento || 0);
  const [showHighlights, setShowHighlights] = useState(false);
  const stripRef = useRef(null);

  useEffect(() => { savePrefs(prefs); }, [prefs]);

  useEffect(() => {
    if (user) return;
    try {
      const saved = JSON.parse(localStorage.getItem('bookshelf.reader.mark.' + book.id) || 'null');
      if (saved && Number.isInteger(saved.indice_capitulo)) {
        setCurrentIdx(saved.indice_capitulo);
        setScrollPos(saved.posicion_desplazamiento || 0);
      }
    } catch {}
  }, [book.id, user]);

  if (!chapters || !chapters.length) {
    return <div className="card p-6 opacity-70">Este libro todavía no tiene capítulos.</div>;
  }

  function requestFS() {
    try { document.documentElement.requestFullscreen(); } catch {}
  }
  function exitFS() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }

  function openChapter(idx) {
    if (idx < 0 || idx >= chapters.length) return;
    setCurrentIdx(idx);
    requestFS();
    setReading(true);
  }

  function closeReading() {
    persistProgress(currentIdx, scrollPos);
    exitFS();
    setReading(false);
  }

  function persistProgress(idx, scroll) {
    if (user) {
      api.post('/api/marcadores', {
        libro_id: book.id, capitulo_id: chapters[idx]?.id,
        indice_capitulo: idx, posicion_desplazamiento: scroll || 0, terminado: false
      });
    } else {
      localStorage.setItem('bookshelf.reader.mark.' + book.id,
        JSON.stringify({ indice_capitulo: idx, posicion_desplazamiento: scroll || 0, saved_at: Date.now() }));
    }
  }

  function markFinished() {
    if (!user) { toast.error('Inicia sesión para marcar como terminado'); return; }
    api.put('/api/marcadores/' + book.id + '/terminar', { terminado: true })
      .then(r => { if (!r.__error) toast.ok('Libro marcado como terminado'); });
  }

  const themeBg = (THEMES[prefs.theme] || THEMES.parchment).bg;
  const isDark = DARK_THEMES.includes(prefs.theme);

  return (
    <div className="rm-card p-6 space-y-5">
      {/* Índice de capítulos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-xl font-bold text-foxBrown">Capítulos</h3>
          <span className="text-xs opacity-70">{chapters.length} cap · toca para leer</span>
        </div>
        <div ref={stripRef} className="chapter-strip flex gap-3 overflow-x-auto pb-3">
          {chapters.map((c, i) => (
            <button key={c.id || i} onClick={() => openChapter(i)}
              className={'rm-chapter flex-shrink-0 w-44 h-56 p-4 text-left ' + (currentIdx === i ? 'border-2 shadow-md' : '')}
              style={{ backgroundColor: themeBg, color: isDark ? '#EEE' : '#1F2937', borderColor: currentIdx === i ? 'var(--accent-main)' : undefined }}>
              <div className="text-xs opacity-70">Capítulo {i + 1}</div>
              <div className="font-bold mt-1 line-clamp-3">{c.titulo || 'Sin título'}</div>
              {bookmark && currentIdx === i && bookmark.indice_capitulo === i && !bookmark.terminado && (
                <div className="text-xs mt-3 inline-block px-2 py-0.5 rounded"
                     style={{ backgroundColor: 'rgba(var(--accent-main-rgb), 0.30)' }}>📌 Continuar</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Nota de comic */}
      {perm.notaComic && (
        <div className="bg-foxBrown/10 border border-foxBrown/20 rounded-lg px-4 py-3 text-sm">
          <span className="font-bold">Nota:</span> {perm.notaComic}
        </div>
      )}

      {/* Personalización de lectura */}
      <div className="border-t border-foxBrown/15 pt-4">
        <div className="text-xs opacity-70 mb-3">Personaliza tu experiencia de lectura</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            {/* Color de la hoja */}
            {perm.colorHoja && (
              <div>
                <div className="text-xs opacity-70 mb-1">Color de la hoja</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(THEMES).map(([k, t]) => (
                    <button key={k} title={k}
                      className={'swatch ' + (prefs.theme === k ? 'active' : '')}
                      style={{ backgroundColor: t.bg }}
                      onClick={() => setPrefs({ ...prefs, theme: k })} />
                  ))}
                </div>
              </div>
            )}

            {/* Fondo de ventana */}
            {perm.fondo && (
              <div>
                <div className="text-xs opacity-70 mb-1">Imagen de fondo</div>
                <div className="flex flex-wrap items-center gap-2">
                  {perm.imagenPrestablecida && !prefs.bgImage && (
                    <div className="text-xs text-foxBrown">Fondo del autor activo</div>
                  )}
                  <label className="cursor-pointer px-3 py-1 text-xs rounded border hover:opacity-80 border-foxBrown/30">
                    {prefs.bgImage ? 'Cambiar imagen' : 'Seleccionar imagen'}
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => setPrefs({ ...prefs, bgImage: ev.target.result });
                        reader.readAsDataURL(file);
                        e.target.value = '';
                      }} />
                  </label>
                  {(prefs.bgImage || perm.imagenPrestablecida) && (
                    <button className="px-3 py-1 text-xs rounded border hover:opacity-80 border-foxBrown/30"
                      onClick={() => setPrefs({ ...prefs, bgImage: null })}>
                      Quitar
                    </button>
                  )}
                </div>
                <div className="mt-2 relative h-20 rounded overflow-hidden border border-foxBrown/20 flex items-center justify-center"
                     style={{
                       backgroundImage: prefs.bgImage
                         ? `url(${prefs.bgImage})`
                         : perm.imagenPrestablecida ? `url(${perm.imagenPrestablecida})` : 'none',
                       backgroundSize: 'cover', backgroundPosition: 'center',
                       backgroundColor: prefs.bgImage || perm.imagenPrestablecida ? 'transparent' : '#6B6258',
                     }}>
                  {!prefs.bgImage && !perm.imagenPrestablecida && (
                    <div className="text-[10px] uppercase tracking-wider text-white/60">Sin imagen de fondo</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {/* Tipografía */}
            {perm.tipografia && (
              <div>
                <div className="text-xs opacity-70 mb-1">Tipografía</div>
                <div className="flex gap-1 flex-wrap">
                  {Object.entries(FONTS).map(([k, f]) => (
                    <button key={k}
                      className={'px-3 py-1 text-xs rounded border '
                        + (prefs.font === k ? 'bg-foxBrown text-parchment border-foxBrown' : 'border-foxBrown/30')}
                      style={{ fontFamily: f.stack }}
                      onClick={() => setPrefs({ ...prefs, font: k })}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tamaño */}
            {perm.tamano && (
              <div>
                <div className="text-xs opacity-70 mb-1">Tamaño</div>
                <div className="flex gap-1">
                  {FONT_SIZES.map(s => (
                    <button key={s.value}
                      className={'px-3 py-1 text-xs rounded border min-w-[2.5rem] '
                        + (prefs.fontSize === s.value ? 'bg-foxBrown text-parchment border-foxBrown' : 'border-foxBrown/30')}
                      onClick={() => setPrefs({ ...prefs, fontSize: s.value })}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Interlineado */}
            {perm.interlineado && (
              <div>
                <div className="text-xs opacity-70 mb-1">Interlineado</div>
                <div className="flex gap-1">
                  {Object.entries(LINE_HEIGHTS).map(([k, lh]) => (
                    <button key={k}
                      className={'px-2 py-1 text-xs rounded border '
                        + (prefs.lineHeight === k ? 'bg-foxBrown text-parchment border-foxBrown' : 'border-foxBrown/30')}
                      onClick={() => setPrefs({ ...prefs, lineHeight: k })}>
                      {lh.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Ancho */}
            {perm.ancho && (
              <div>
                <div className="text-xs opacity-70 mb-1">Ancho</div>
                <div className="flex gap-1">
                  {Object.entries(WIDTHS).map(([k, w]) => (
                    <button key={k}
                      className={'px-2 py-1 text-xs rounded border '
                        + (prefs.width === k ? 'bg-foxBrown text-parchment border-foxBrown' : 'border-foxBrown/30')}
                      onClick={() => setPrefs({ ...prefs, width: k })}>
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Vista previa */}
        <div className="mt-4 rounded-lg p-4 border border-foxBrown/20 relative overflow-hidden"
             style={{
               backgroundImage: prefs.bgImage
                 ? `url(${prefs.bgImage})`
                 : perm.imagenPrestablecida ? `url(${perm.imagenPrestablecida})` : 'none',
               backgroundSize: 'cover', backgroundPosition: 'center',
               backgroundColor: prefs.bgImage || perm.imagenPrestablecida ? 'transparent' : (THEMES[prefs.theme] || THEMES.parchment).bg,
             }}>
          <div className="rounded-md p-3 border"
               style={{
                 backgroundColor: (THEMES[prefs.theme] || THEMES.parchment).bg,
                 color: isDark ? '#EEE' : '#1F2937',
                 borderColor: 'var(--border-subtle)',
                 fontFamily: FONTS[prefs.font]?.stack,
                 fontSize: prefs.fontSize + 'px',
                 lineHeight: LINE_HEIGHTS[prefs.lineHeight]?.value,
                 maxWidth: WIDTHS[prefs.width]?.value + 'rem',
               }}>
            <div className="text-[10px] uppercase tracking-wider opacity-60 mb-2">Vista previa</div>
            <strong>Capítulo 1 — {chapters[0]?.titulo}</strong>
            <p className="mt-2 whitespace-pre-wrap line-clamp-4">{chapters[0]?.contenido?.slice(0, 300)}…</p>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-foxBrown/15">
        <button className="btn-primary" onClick={() => openChapter(currentIdx)}>
          {bookmark && !bookmark.terminado ? '▶ Continuar lectura' : '▶ Empezar a leer'}
        </button>
        {bookmark && !bookmark.terminado && (
          <button className="btn-ghost text-sm" onClick={markFinished}>✓ Marcar como terminado</button>
        )}
        {bookmark && bookmark.terminado && (
          <span className="text-sm opacity-70 self-center">✓ Terminado</span>
        )}
        <button className="btn-ghost text-sm ml-auto" onClick={() => navigate(-1)}>← Volver</button>
      </div>

      {/* Highlights */}
      {showHighlights && (
        <HighlightsPanel libroId={book.id} capitulos={chapters}
          onClose={() => setShowHighlights(false)} visible={showHighlights} />
      )}

      {/* Modo lectura fullscreen */}
      {reading && (
        <ErrorBoundary fallback={(err, reset) => (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black">
            <div className="rm-card p-8 max-w-md text-center space-y-4">
              <div className="text-5xl opacity-40">📖</div>
              <h2 className="font-serif text-xl font-bold text-foxBrown">Error en el lector</h2>
              <p className="text-sm opacity-70">{err?.message || 'Ocurrió un error.'}</p>
              <button className="btn-primary text-sm" onClick={() => { reset(); closeReading(); }}>Cerrar</button>
            </div>
          </div>
        )}>
          <ReadingMode
            book={book}
            chapters={chapters}
            chapter={chapters[currentIdx]}
            chapterIndex={currentIdx}
            totalChapters={chapters.length}
            prefs={prefs}
            onPrev={() => currentIdx > 0 && setCurrentIdx(i => i - 1)}
            onNext={() => currentIdx < chapters.length - 1 && setCurrentIdx(i => i + 1)}
            onExit={closeReading}
            onGoToChapter={(idx) => { if (idx >= 0 && idx < chapters.length) setCurrentIdx(idx); }}
            onPrefsChange={(p) => setPrefs(p)}
            onMarkPage={(idx, scroll) => { setScrollPos(scroll); persistProgress(idx, scroll); }}
            onBookmark={(idx, scroll) => { persistProgress(idx, scroll); toast.ok('🔖 Página marcada'); }}
            savedScrollPos={scrollPos}
            onToggleHighlights={() => setShowHighlights(v => !v)}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}

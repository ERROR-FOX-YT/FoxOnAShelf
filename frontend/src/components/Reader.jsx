import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import ReadingMode from './ReadingMode.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import { THEMES, OUTERS, FONTS, WIDTHS, FONT_SIZES, LINE_HEIGHTS, DARK_THEMES } from './readerConstants.js';

const PREFS_KEY = 'bookshelf.reader.prefs';
const DEFAULT_PREFS = {
  theme: 'parchment',
  outer: 'walnut',
  font: 'serif',
  fontSize: 18,
  lineHeight: 'normal',
  width: 'narrow',
  pageMode: true
};

function loadPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null');
    return { ...DEFAULT_PREFS, ...(saved || {}) };
  } catch { return { ...DEFAULT_PREFS }; }
}
function savePrefs(p) { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); }

/**
 * Reader — modo pre-lectura: índice de capítulos arrastrable + personalización.
 * Al tocar un capítulo, abre ReadingMode en fullscreen.
 * Props:
 *  - book, chapters
 *  - bookmark: objeto del backend con chapter_index, scroll_position, finished
 *  - onMarkPage(idx, scroll) — para sincronizar con backend
 */
export default function Reader({ book, chapters, bookmark }) {
  function handlePrefsChange(p) { setPrefs(p); }
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast    = useToast();

  const [prefs, setPrefs] = useState(loadPrefs);
  const [reading, setReading] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(bookmark?.chapter_index || 0);
  const [scrollPos, setScrollPos]   = useState(bookmark?.scroll_position || 0);
  const [cropOpen, setCropOpen]     = useState(false);
  const stripRef = useRef(null);

  useEffect(() => { savePrefs(prefs); }, [prefs]);

  // Si el usuario NO está logueado, usamos localStorage como respaldo
  useEffect(() => {
    if (user) return;
    try {
      const saved = JSON.parse(localStorage.getItem('bookshelf.reader.mark.' + book.id) || 'null');
      if (saved && Number.isInteger(saved.chapter_index)) {
        setCurrentIdx(saved.chapter_index);
        setScrollPos(saved.scroll_position || 0);
      }
    } catch {}
  }, [book.id, user]);

  if (!chapters || !chapters.length) {
    return <div className="card p-6 opacity-70">Este libro todavía no tiene capítulos.</div>;
  }

  function requestFS() {
    try { document.documentElement.requestFullscreen(); }
    catch {}
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
      api.post('/api/bookmarks', {
        book_id: book.id, chapter_id: chapters[idx]?.id,
        chapter_index: idx, scroll_position: scroll || 0, finished: false
      });
    } else {
      localStorage.setItem('bookshelf.reader.mark.' + book.id,
        JSON.stringify({ chapter_index: idx, scroll_position: scroll || 0, saved_at: Date.now() }));
    }
  }

  function markFinished() {
    if (!user) { toast.error('Inicia sesión para marcar como terminado'); return; }
    api.put('/api/bookmarks/' + book.id + '/finish', { finished: true })
      .then(r => { if (!r.__error) toast.ok('Libro marcado como terminado'); });
  }

  const t = (THEMES[prefs.theme] || THEMES.parchment).bg;
  const isDark = DARK_THEMES.includes(prefs.theme);

  return (
    <div className="rm-card p-6 space-y-5">
      {/* Índice arrastrable de capítulos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-xl font-bold text-bookshelfBrown">Capítulos</h3>
          <span className="text-xs opacity-70">
            {chapters.length} cap · arrastra o toca para leer
          </span>
        </div>
        <div
          ref={stripRef}
          className="chapter-strip flex gap-3 overflow-x-auto pb-3"
        >
          {chapters.map((c, i) => (
            <button
              key={c.id || i}
              onClick={() => openChapter(i)}
              className={'rm-chapter flex-shrink-0 w-44 h-56 p-4 text-left '
                + (currentIdx === i ? 'border-2 shadow-md' : '')}
              style={{ backgroundColor: t, color: isDark ? '#EEE' : '#1F2937', borderColor: currentIdx === i ? 'var(--accent-main)' : undefined }}
            >
              <div className="text-xs opacity-70">Capítulo {i + 1}</div>
              <div className="font-bold mt-1 line-clamp-3">{c.title || 'Sin título'}</div>
              <div className="text-xs opacity-60 mt-3 line-clamp-4">{c.content?.slice(0, 120)}…</div>
              {bookmark && currentIdx === i && bookmark.chapter_index === i && !bookmark.finished && (
                <div className="text-xs mt-3 inline-block px-2 py-0.5 rounded"
                     style={{ backgroundColor: 'rgba(var(--accent-main-rgb), 0.30)' }}>📌 Continuar</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Personalización rápida (preview + ajustes) */}
      <div className="border-t border-bookshelfBrown/15 pt-4">
        <div className="text-xs opacity-70 mb-2">Personaliza tu experiencia de lectura</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-xs opacity-70 mb-1">Fondo de ventana</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(OUTERS).map(([k, color]) => (
                <button key={k} title={k}
                  className={'swatch ' + (prefs.outer === k ? 'active' : '')}
                  style={{ backgroundColor: color, border: '1px solid rgba(255,255,255,0.3)' }}
                  onClick={() => setPrefs({ ...prefs, outer: k, bgImage: null })} />
              ))}
            </div>
            <div className="text-xs opacity-70 mb-1 mt-3">Imagen de fondo</div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer px-3 py-1 text-xs rounded border hover:opacity-80 border-bookshelfBrown/30">
                {prefs.bgImage ? 'Cambiar imagen' : 'Seleccionar imagen'}
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => setPrefs({ ...prefs, bgImage: ev.target.result, outer: null });
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }} />
              </label>
              {prefs.bgImage && (
                <>
                  <button
                    className="px-3 py-1 text-xs rounded border hover:opacity-80 border-bookshelfBrown/30"
                    onClick={() => setCropOpen(true)}>
                    ✂ Recortar
                  </button>
                  <button
                    className="px-3 py-1 text-xs rounded border hover:opacity-80 border-bookshelfBrown/30"
                    onClick={() => setPrefs({ ...prefs, bgImage: null })}>
                    Quitar
                  </button>
                </>
              )}
            </div>
            <div className="mt-2 relative h-24 rounded overflow-hidden border border-bookshelfBrown/20 flex items-center justify-center"
                 style={{
                   backgroundColor: OUTERS[prefs.outer] || OUTERS.walnut,
                   ...(prefs.bgImage ? {
                     backgroundImage: 'url(' + prefs.bgImage + ')',
                     backgroundSize: 'cover',
                     backgroundPosition: 'center',
                     backgroundRepeat: 'no-repeat'
                   } : {})
                 }}>
              {!prefs.bgImage ? (
                <div className="text-[10px] uppercase tracking-wider text-white/60 text-center px-2">
                  Sin imagen de fondo
                </div>
              ) : (
                <div className="absolute top-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                  ✓ Imagen activa
                </div>
              )}
            </div>
            <div className="text-xs opacity-70 mb-1 mt-3">Color de la hoja</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(THEMES).map(([k, t]) => (
                <button key={k} title={k}
                  className={'swatch ' + (prefs.theme === k ? 'active' : '')}
                  style={{ backgroundColor: t.bg }}
                  onClick={() => setPrefs({ ...prefs, theme: k, bgImage: null })} />
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs opacity-70 mb-1">Tipografía</div>
            <div className="flex gap-1 flex-wrap">
              {Object.entries(FONTS).map(([k, f]) => (
                <button key={k}
                  className={'px-3 py-1 text-xs rounded border '
                    + (prefs.font === k ? 'bg-bookshelfBrown text-parchment border-bookshelfBrown' : 'border-bookshelfBrown/30')}
                  style={{ fontFamily: f.stack }}
                  onClick={() => setPrefs({ ...prefs, font: k })}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="text-xs opacity-70 mt-3 mb-1">Tamaño</div>
            <div className="flex gap-1">
              {FONT_SIZES.map(s => (
                <button key={s.value}
                  className={'px-3 py-1 text-xs rounded border min-w-[2.5rem] '
                    + (prefs.fontSize === s.value ? 'bg-bookshelfBrown text-parchment border-bookshelfBrown' : 'border-bookshelfBrown/30')}
                  onClick={() => setPrefs({ ...prefs, fontSize: s.value })}>
                  {s.label}
                </button>
              ))}
            </div>
            <div className="text-xs opacity-70 mt-3 mb-1">Interlineado</div>
            <div className="flex gap-1">
              {Object.entries(LINE_HEIGHTS).map(([k, lh]) => (
                <button key={k}
                  className={'px-2 py-1 text-xs rounded border '
                    + (prefs.lineHeight === k ? 'bg-bookshelfBrown text-parchment border-bookshelfBrown' : 'border-bookshelfBrown/30')}
                  onClick={() => setPrefs({ ...prefs, lineHeight: k })}>
                  {lh.label}
                </button>
              ))}
            </div>
            <div className="text-xs opacity-70 mt-3 mb-1">Ancho</div>
            <div className="flex gap-1">
              {Object.entries(WIDTHS).map(([k, w]) => (
                <button key={k}
                  className={'px-2 py-1 text-xs rounded border '
                    + (prefs.width === k ? 'bg-bookshelfBrown text-parchment border-bookshelfBrown' : 'border-bookshelfBrown/30')}
                  onClick={() => setPrefs({ ...prefs, width: k })}>
                  {w.label}
                </button>
              ))}
            </div>
            <div className="text-xs opacity-70 mt-3 mb-1">Modo de lectura</div>
            <div className="flex gap-1">
              <button
                className={'px-3 py-1 text-xs rounded border '
                  + (!prefs.pageMode ? 'bg-bookshelfBrown text-parchment border-bookshelfBrown' : 'border-bookshelfBrown/30')}
                onClick={() => setPrefs({ ...prefs, pageMode: false })}>
                📜 Scroll
              </button>
              <button
                className={'px-3 py-1 text-xs rounded border '
                  + (prefs.pageMode ? 'bg-bookshelfBrown text-parchment border-bookshelfBrown' : 'border-bookshelfBrown/30')}
                onClick={() => setPrefs({ ...prefs, pageMode: true })}>
                📖 Páginas
              </button>
            </div>
          </div>
        </div>

        {/* Vista previa con la elección actual */}
        <div className="mt-4 rounded-lg p-4 border border-bookshelfBrown/20 relative overflow-hidden"
             style={{
               backgroundColor: OUTERS[prefs.outer] || OUTERS.walnut,
               ...(prefs.bgImage ? {
                 backgroundImage: 'url(' + prefs.bgImage + ')',
                 backgroundSize: 'cover',
                 backgroundPosition: 'center',
                 backgroundRepeat: 'no-repeat'
               } : {})
             }}>
          {prefs.bgImage && (
            <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm">
              🖼 Imagen de fondo
            </div>
          )}
          <div className="text-[10px] uppercase tracking-wider text-white/70 mb-2">
            {prefs.bgImage ? 'Vista previa con imagen' : 'Fondo de ventana'}
          </div>
          <div className="rounded-md p-3 border"
               style={{
                 backgroundColor: t,
                 color: isDark ? '#EEE' : '#1F2937',
                 borderColor: 'var(--border-subtle)'
               }}>
            <div className="text-[10px] uppercase tracking-wider opacity-60 mb-2">Color de la hoja</div>
            <div style={{ fontFamily: FONTS[prefs.font].stack, fontSize: prefs.fontSize + 'px',
                          lineHeight: LINE_HEIGHTS[prefs.lineHeight].value, maxWidth: WIDTHS[prefs.width].value + 'rem' }}>
              <strong>Capítulo 1 — {chapters[0]?.title}</strong>
              <p className="mt-2 whitespace-pre-wrap line-clamp-6">{chapters[0]?.content?.slice(0, 400)}…</p>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-bookshelfBrown/15">
        <button className="btn-primary" onClick={() => openChapter(currentIdx)}>
          {bookmark && !bookmark.finished ? '▶ Continuar lectura' : '▶ Empezar a leer'}
        </button>
        {bookmark && !bookmark.finished && (
          <button className="btn-ghost text-sm" onClick={markFinished}>
            ✓ Marcar como terminado
          </button>
        )}
        {bookmark && bookmark.finished && (
          <span className="text-sm opacity-70 self-center">✓ Terminado</span>
        )}
        <button className="btn-ghost text-sm ml-auto" onClick={() => navigate(-1)}>
          ← Volver
        </button>
      </div>

      {/* Modo lectura (fullscreen) */}
      {reading && (
        <ErrorBoundary fallback={(err, reset) => (
          <div className="fixed inset-0 z-40 flex items-center justify-center"
               style={{ backgroundColor: OUTERS[prefs.outer] || '#3E2723' }}>
            <div className="rm-card p-8 max-w-md text-center space-y-4">
              <div className="text-5xl opacity-40">📖</div>
              <h2 className="font-serif text-xl font-bold text-bookshelfBrown">Error en el lector</h2>
              <p className="text-sm opacity-70">
                {err?.message || 'Ocurrió un error al abrir el modo lectura.'}
              </p>
              <button className="btn-primary text-sm" onClick={() => { reset(); closeReading(); }}>
                Cerrar
              </button>
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
            onPrefsChange={handlePrefsChange}
            onMarkPage={(idx, scroll) => {
              setScrollPos(scroll);
              persistProgress(idx, scroll);
            }}
            onBookmark={(idx, scroll) => {
              persistProgress(idx, scroll);
              toast.ok('🔖 Página marcada');
            }}
          />
        </ErrorBoundary>
      )}

      {/* Modal de recorte de imagen */}
      {cropOpen && prefs.bgImage && (
        <CropModal
          src={prefs.bgImage}
          onClose={() => setCropOpen(false)}
          onApply={(newDataUrl) => {
            setPrefs({ ...prefs, bgImage: newDataUrl });
            setCropOpen(false);
            toast.ok('Imagen recortada');
          }}
        />
      )}
    </div>
  );
}

function CropModal({ src, onClose, onApply }) {
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const [cropRect, setCropRect]   = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [isReady, setIsReady]     = useState(false);
  const [aspect, setAspect]       = useState('free');
  const cropImgRef  = useRef(null);
  const previewRef  = useRef(null);
  const draggingRef = useRef(null);

  function getImgRect() {
    if (!cropImgRef.current) return null;
    return cropImgRef.current.getBoundingClientRect();
  }

  const ASPECTS = {
    free:  null,
    '16:9': 16 / 9,
    '4:3':  4  / 3,
    '1:1':  1,
    '9:16': 9  / 16
  };

  function autoSelect() {
    const r = getImgRect();
    if (!r) return;
    setCropRect({ x: 0, y: 0, w: r.width, h: r.height });
    setIsReady(true);
  }

  function onImgLoad(e) {
    setImgNatural({ w: e.target.naturalWidth, h: e.target.naturalHeight });
    requestAnimationFrame(autoSelect);
  }

  useEffect(() => {
    function onMove(e) {
      if (!draggingRef.current || !cropImgRef.current) return;
      const r = getImgRect();
      if (!r) return;
      const curX = Math.max(0, Math.min(r.width,  e.clientX - r.left));
      const curY = Math.max(0, Math.min(r.height, e.clientY - r.top));
      const { startX, startY } = draggingRef.current;
      let w = Math.abs(curX - startX);
      let h = Math.abs(curY - startY);
      const ratio = ASPECTS[aspect];
      if (ratio) {
        if (w / h > ratio) w = h * ratio;
        else              h = w / ratio;
      }
      let x = curX < startX ? startX - w : startX;
      let y = curY < startY ? startY - h : startY;
      x = Math.max(0, Math.min(x, r.width  - w));
      y = Math.max(0, Math.min(y, r.height - h));
      w = Math.max(1, Math.min(w, r.width  - x));
      h = Math.max(1, Math.min(h, r.height - y));
      setCropRect({ x, y, w, h });
      setIsReady(false);
    }
    function onUp() {
      if (draggingRef.current) {
        draggingRef.current = null;
        setIsReady(true);
      }
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, [aspect]);

  useEffect(() => {
    if (!previewRef.current || imgNatural.w === 0 || !isReady) return;
    const r = getImgRect();
    if (!r) return;
    const scaleX = imgNatural.w / r.width;
    const scaleY = imgNatural.h / r.height;
    const pw = Math.max(1, Math.round(cropRect.w * scaleX));
    const ph = Math.max(1, Math.round(cropRect.h * scaleY));
    const canvas = previewRef.current;
    const maxW = 200;
    const ratio = pw / ph;
    canvas.width  = maxW;
    canvas.height = Math.round(maxW / ratio);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1A1816';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (cropRect.w > 1 && cropRect.h > 1) {
      ctx.drawImage(
        cropImgRef.current,
        Math.round(cropRect.x * scaleX),
        Math.round(cropRect.y * scaleY),
        pw, ph,
        0, 0, canvas.width, canvas.height
      );
    }
  }, [cropRect, imgNatural, isReady]);

  function apply() {
    if (imgNatural.w === 0 || cropRect.w < 4 || cropRect.h < 4) return;
    const r = getImgRect();
    if (!r) return;
    const scaleX = imgNatural.w / r.width;
    const scaleY = imgNatural.h / r.height;
    const sx = Math.max(0, Math.round(cropRect.x * scaleX));
    const sy = Math.max(0, Math.round(cropRect.y * scaleY));
    const sw = Math.max(1, Math.min(imgNatural.w  - sx, Math.round(cropRect.w * scaleX)));
    const sh = Math.max(1, Math.min(imgNatural.h - sy, Math.round(cropRect.h * scaleY)));
    const c = document.createElement('canvas');
    c.width  = sw;
    c.height = sh;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cropImgRef.current, sx, sy, sw, sh, 0, 0, sw, sh);
    onApply(c.toDataURL('image/jpeg', 0.92));
  }

  const isValid = cropRect.w >= 10 && cropRect.h >= 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         onClick={onClose}>
      <div className="rm-card p-4 max-w-3xl w-full max-h-[90vh] overflow-auto"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-lg font-bold">✂ Recortar imagen de fondo</h3>
          <button className="btn-ghost text-xs" onClick={onClose}>✕ Cerrar</button>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
          <span className="opacity-70">Proporción:</span>
          {Object.keys(ASPECTS).map(k => (
            <button key={k}
                    className={'px-2 py-0.5 rounded border transition ' + (aspect === k ? 'bg-bookshelfBrown text-parchment border-bookshelfBrown' : 'border-bookshelfBrown/30 hover:opacity-80')}
                    onClick={() => setAspect(k)}>
              {k}
            </button>
          ))}
          <span className={'ml-auto px-2 py-0.5 rounded font-semibold transition ' + (isReady && isValid ? 'bg-emerald-600 text-white' : isValid ? 'bg-amber-500 text-white' : 'bg-gray-400 text-white')}>
            {isReady && isValid ? '✓ Listo para aplicar' : isValid ? '✎ Ajustando…' : '✗ Área inválida'}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
          <div
            className="relative select-none touch-none"
            style={{ cursor: 'crosshair', lineHeight: 0 }}
            onMouseDown={e => {
              e.preventDefault();
              const r = getImgRect();
              if (!r) return;
              draggingRef.current = {
                startX: e.clientX - r.left,
                startY: e.clientY - r.top
              };
              setIsReady(false);
            }}
          >
            <img
              ref={cropImgRef}
              src={src}
              alt="Recortar"
              className="block max-w-full max-h-[55vh]"
              style={{ display: 'block' }}
              draggable={false}
              onLoad={onImgLoad}
            />
            {cropRect.w > 0 && cropRect.h > 0 && (
              <div
                className={'absolute pointer-events-none transition-colors duration-150 ' + (isReady && isValid ? 'border-emerald-400' : 'border-white')}
                style={{
                  left: cropRect.x, top: cropRect.y,
                  width: cropRect.w, height: cropRect.h,
                  borderWidth: '2px', borderStyle: 'solid'
                }}>
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-2 min-w-[210px]">
            <div className="text-[10px] uppercase tracking-wider opacity-70">Vista previa</div>
            <canvas ref={previewRef}
                    className="rounded border border-bookshelfBrown/30"
                    style={{ backgroundColor: '#1A1816', maxWidth: '200px' }} />
            <div className="text-[10px] opacity-60 text-center">
              Resultado tras recortar
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 justify-end">
          <button className="btn-ghost text-xs" onClick={autoSelect}>
            ↺ Toda la imagen
          </button>
          <button
            className={isValid ? 'rm-btn-primary' : 'btn-ghost opacity-50 cursor-not-allowed'}
            onClick={apply}
            disabled={!isValid}>
            ✓ Aplicar recorte
          </button>
        </div>
      </div>
    </div>
  );
}

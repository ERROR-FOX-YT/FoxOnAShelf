import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiBase } from '../api/client.js';
import { THEMES, OUTERS, FONTS, WIDTHS, FONT_SIZES, LINE_HEIGHTS } from './readerConstants.js';

function splitIntoPages(text) {
  if (text == null) return [''];
  return text.split(/<!--\s*page\s*-->/g);
}

const PAGE_COVER  = 'cover';
const PAGE_TITLE  = 'title';
const PAGE_TOC    = 'toc';
const PAGE_CONTENT = 'content';

function buildDisplayPages(chapter, book, chapters, showOpening) {
  if (!showOpening) {
    const contentPages = splitIntoPages(chapter?.contenido || chapter?.content || '');
    return contentPages.map((text, i) => ({
      type: PAGE_CONTENT, id: 'c-' + i, text, pageNum: i + 1
    }));
  }
  const pages = [];
  pages.push({ type: PAGE_COVER, id: 'cover', book });
  pages.push({ type: PAGE_TITLE, id: 'title', book });
  pages.push({ type: PAGE_TOC, id: 'toc', book, chapters });
  const contentPages = splitIntoPages(chapter?.contenido || chapter?.content || '');
  contentPages.forEach((text, i) => {
    pages.push({ type: PAGE_CONTENT, id: 'cp-' + i, text, pageNum: i + 1 });
  });
  return pages;
}

const IMG_PATTERN = /(!\[.*?\]\(.*?\)|@img:[a-zA-Z0-9\-_,\.\?!¿¡<>]+)/g;

function pairPages(pages) {
  const spreads = [];
  let i = 0;
  while (i < pages.length) {
    const left = pages[i];
    const right = i + 1 < pages.length ? pages[i + 1] : null;
    if (left?.type === 'content' && right?.type === 'content') {
      spreads.push({ left, right });
      i += 2;
    } else {
      spreads.push({ left, right: null });
      i++;
    }
  }
  return spreads;
}

function pageTextToHTML(text, authorId) {
  if (!text) return '';
  const parts = text.split(IMG_PATTERN).filter(Boolean);
  return parts.map(part => {
    const img = part.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (img) return `<img src="${img[2]}" alt="${img[1]}" style="max-width:100%;height:auto;margin:1em auto;display:block" />`;
    const userImg = part.match(/^@img:(.+)$/);
    if (userImg) return `<img src="${apiBase() || ''}/api/imagenes-usuario/resolver/${authorId || ''}/${encodeURIComponent(userImg[1])}" alt="${userImg[1]}" style="max-width:100%;height:auto;margin:1em auto;display:block" />`;
    const paras = part.split(/\n\n+/).filter(Boolean);
    return paras.map(p => `<p>${p.replace(/\n/g, ' ')}</p>`).join('');
  }).join('');
}

function PageContent({ content, title, pageNum, theme, font, fontSize, lineHeight, showTitle, showEndMarker, authorId, hidePageNum }) {
  const parts = content ? content.split(IMG_PATTERN).filter(Boolean) : [];

  function renderPart(p, i) {
    const img = p.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (img) {
      return <img key={i} src={img[2]} alt={img[1]} className="max-w-full h-auto my-4 mx-auto rounded" />;
    }
    const userImg = p.match(/^@img:(.+)$/);
    if (userImg) {
      const src = (apiBase() || '') + '/api/imagenes-usuario/resolver/' + (authorId || '') + '/' + encodeURIComponent(userImg[1]);
      return <img key={i} src={src} alt={userImg[1]} className="max-w-full h-auto my-4 mx-auto rounded" />;
    }
    return <span key={i}>{p}</span>;
  }

  return (
    <article className="px-8 py-10"
      style={{
        fontFamily: font.stack,
        fontSize: (fontSize || 18) + 'px',
        lineHeight
      }}
    >
      {showTitle && <h1 className="font-bold mb-6" style={{ fontSize: '1.4em' }}>{title}</h1>}
      {!hidePageNum && <div className="text-center text-xs opacity-50 mb-4 select-none" style={{ color: theme.border + 'aa' }}>
        — Página {pageNum} —
      </div>}
      <div className="whitespace-pre-wrap break-words">{parts.map(renderPart)}</div>
      {showEndMarker && (
        <div className="mt-12 pt-6 border-t text-center text-sm opacity-50"
             style={{ borderColor: theme.border + '33' }}>
          — Fin del capítulo —
        </div>
      )}
    </article>
  );
}

function CoverPage({ book, theme, children }) {
  return (
    <div className="page__cover"
      style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        position: 'relative', overflow: 'hidden'
      }}
    >
      {children}
      <div className="page__cover-content"
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '3rem 2rem', textAlign: 'center'
        }}
      >
        <h1 className="page__cover-title"
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: '2.5rem', fontWeight: 700,
            color: theme?.fg || '#2A2935',
            margin: 0, lineHeight: 1.15,
            maxWidth: '90%'
          }}
        >
          {book.titulo}
        </h1>
        <div className="page__cover-divider"
          style={{
            width: '60px', height: '1px',
            background: theme?.border || '#7B4B27',
            margin: '1.25rem auto', opacity: 0.5
          }}
        />
        <h2 className="page__cover-author"
          style={{
            fontFamily: 'Georgia, serif', fontSize: '1rem',
            fontWeight: 400, textTransform: 'uppercase',
            letterSpacing: '3px', color: theme?.border || '#7B4B27',
            margin: 0
          }}
        >
          {book.nombre_autor || ('Autor #' + (book.autor_id || '?'))}
        </h2>
        <div className="page__cover-publisher"
          style={{
            marginTop: '3rem',
            fontFamily: 'Georgia, serif', fontSize: '0.7rem',
            textTransform: 'uppercase', letterSpacing: '2px',
            opacity: 0.4, color: theme?.fg || '#2A2935'
          }}
        >
          FoxOnAShelf Edition
        </div>
      </div>
    </div>
  );
}

function TitlePage({ book, theme }) {
  return (
    <div className="page__title" style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '3rem 2.5rem', textAlign: 'center'
    }}>
      <div className="page__title-brand"
        style={{
          fontFamily: 'Georgia, serif', fontSize: '0.75rem',
          textTransform: 'uppercase', letterSpacing: '4px',
          opacity: 0.35, marginBottom: '2.5rem',
          color: theme?.fg || '#2A2935'
        }}
      >
        FoxOnAShelf Reader
      </div>
      <h1 className="page__title-book-title"
        style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '2rem', fontWeight: 700, lineHeight: 1.2,
          color: theme?.fg || '#2A2935', margin: 0
        }}
      >
        {book.titulo}
      </h1>
      <h2 className="page__title-author"
        style={{
          fontFamily: 'Georgia, serif', fontSize: '1.1rem',
          fontWeight: 400, fontStyle: 'italic',
          color: theme?.fg || '#2A2935', margin: '0.75rem 0 0',
          opacity: 0.75
        }}
      >
        {book.nombre_autor || ('Autor #' + (book.autor_id || '?'))}
      </h2>
      <div className="page__title-rule"
        style={{
          width: '40px', height: '1px',
          background: theme?.border || '#7B4B27',
          margin: '1.5rem auto', opacity: 0.4
        }}
      />
      <div className="page__title-credits"
        style={{
          fontSize: '0.7rem', textTransform: 'uppercase',
          letterSpacing: '1px', opacity: 0.45,
          color: theme?.fg || '#2A2935', maxWidth: '70%'
        }}
      >
        <span>FoxOnAShelf Digital Edition</span>
      </div>
      <div className="page__title-copyright"
        style={{
          position: 'absolute', bottom: '2rem',
          fontSize: '0.65rem', textTransform: 'uppercase',
          letterSpacing: '1px', opacity: 0.35,
          color: theme?.fg || '#2A2935'
        }}
      >
        <p style={{ margin: 0 }}>Published {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}

function TOCPage({ chapters, theme, onChapterClick, currentIdx }) {
  if (!chapters || chapters.length === 0) {
    return <div className="page__toc-empty">No hay capítulos disponibles</div>;
  }
  return (
    <div className="page__toc" style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      padding: '2.5rem 2rem'
    }}>
      <h1 className="page__toc-heading"
        style={{
          fontFamily: 'Georgia, serif', fontSize: '1.2rem',
          fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '2px', textAlign: 'center',
          color: theme?.fg || '#2A2935', margin: '0 0 1.5rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid ' + (theme?.border || '#7B4B27') + '33'
        }}
      >
        Contenido
      </h1>
      <div className="page__toc-list" style={{ flex: 1, overflowY: 'auto' }}>
        {chapters.map((ch, i) => (
          <button key={ch.id || i}
            className={'page__toc-item' + (currentIdx === i ? ' page__toc-item--active' : '')}
            onClick={() => onChapterClick?.(i)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              width: '100%', padding: '0.6rem 0.75rem',
              border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '0.85rem', fontFamily: 'Georgia, serif',
              color: currentIdx === i ? (theme?.border || '#7B4B27') : (theme?.fg || '#2A2935'),
              fontWeight: currentIdx === i ? 700 : 400,
              borderBottom: '1px solid ' + (theme?.border || '#7B4B27') + '15',
              textAlign: 'left',
              borderRadius: '4px',
              transition: 'background 0.15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = (theme?.border || '#7B4B27') + '0a'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span className="page__toc-number"
              style={{
                minWidth: '1.5rem', opacity: 0.5,
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {String(i + 1).padStart(2, '0')}.
            </span>
            <span className="page__toc-label" style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {ch.titulo || ('Capítulo ' + (i + 1))}
            </span>
            {currentIdx === i && (
              <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>— leyendo</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function renderPageArea(pageObj, isBack, opts) {
  const { theme, font, fontSize, lineHeight, authorId, book, chapters, goToChapter, chapterIndex, contentStyle, pageNum } = opts;

  switch (pageObj.type) {
    case PAGE_COVER:
      return <CoverPage book={pageObj.book || book} theme={theme} />;

    case PAGE_TITLE:
      return <TitlePage book={pageObj.book || book} theme={theme} />;

    case PAGE_TOC:
      return (
        <TOCPage chapters={pageObj.chapters || chapters} theme={theme}
          onChapterClick={goToChapter} currentIdx={chapterIndex} />
      );

    default:
      return (
        <div className="reader-book__page-content" style={contentStyle}>
          <PageContent
            content={pageObj.text || ''}
            title={pageObj.title}
            pageNum={pageNum}
            theme={theme}
            font={font}
            fontSize={fontSize}
            lineHeight={lineHeight}
            showTitle={false}
            showEndMarker={false}
            authorId={authorId}
            hidePageNum={true}
          />
        </div>
      );
  }
}

export default function ReadingMode({
  book, chapters, chapter, chapterIndex, totalChapters,
  prefs, onPrev, onNext, onExit, onMarkPage, onBookmark, onPrefsChange, onGoToChapter,
  savedScrollPos, onToggleHighlights
}) {
  const [showPrefs, setShowPrefs] = useState(false);
  const [showBookOpening, setShowBookOpening] = useState(true);
  const [scrollPct, setScrollPct] = useState(0);
  const pageRef   = useRef(null);
  const scrollFn  = useRef(null);
  const lastSavedIdx = useRef(chapterIndex);
  const exitingRef = useRef(false);
  const modeRef = useRef({ onNext, onPrev, onExit });
  const isFirstRender = useRef(true);
  const scrollRestoredRef = useRef(false);

  const pageMode = prefs.pageMode === true || prefs.pageMode === 'true';
  const [currentSpread, setCurrentSpread] = useState(0);
  const flippingRef = useRef(null);
  const bookRef = useRef(null);
  const overlayRef = useRef(null);

  const theme = THEMES[prefs.theme] || THEMES.parchment;
  const font  = FONTS[prefs.font]   || FONTS.serif;
  const outer = OUTERS[prefs.outer] || OUTERS.walnut;
  const lineHeight = LINE_HEIGHTS[prefs.lineHeight]?.value || 1.75;
  const pageWidthRem = WIDTHS[prefs.width]?.value ?? 44;

  const pages = buildDisplayPages(chapter, book, chapters, showBookOpening);
  const spreads = pageMode ? pairPages(pages) : [];
  const totalSpreads = spreads.length;

  function goToChapter(idx) {
    if (idx === chapterIndex) return;
    setShowBookOpening(false);
    onGoToChapter?.(idx);
  }

  function turnPage(dir) {
    if (flippingRef.current || !pageMode) return;
    const step = dir === 'next' ? 1 : -1;
    const next = currentSpread + step;
    if (next < 0) {
      if (chapterIndex > 0) { onPrev?.(); setCurrentSpread(0); }
      return;
    }
    if (next >= totalSpreads) {
      if (chapterIndex < totalChapters - 1) { onNext?.(); setCurrentSpread(0); }
      return;
    }

    const cur = spreads[currentSpread];
    const nxt = spreads[next];

    if (!cur?.right || !nxt?.left || cur.left?.type !== PAGE_CONTENT || nxt.left?.type !== PAGE_CONTENT) {
      setCurrentSpread(next);
      return;
    }

    flippingRef.current = true;
    const frontPage = step === 1 ? cur.right : cur.left;
    const backPage  = step === 1 ? nxt.left : nxt.right;
    const frontHTML = pageTextToHTML(frontPage?.text || '', book.autor_id);
    const backHTML = pageTextToHTML(backPage?.text || '', book.autor_id);

    const bookEl = bookRef.current;
    if (!bookEl) { flippingRef.current = false; return; }

    // Temporarily disable overflow:hidden so the 3D rotation isn't clipped
    const origOverflow = bookEl.style.overflow;
    bookEl.style.overflow = 'visible';

    if (overlayRef.current) {
      const el = overlayRef.current;
      const bookH = bookEl.offsetHeight || 400;
      el.className = 'page-turn-layer';
      el.style.cssText = '';
      el.style.display = 'block';
      el.style.top = '0';
      el.style.height = bookH + 'px';
      el.style.zIndex = '25';

      const pfFront = el.querySelector('.page-face-front');
      const pfBack  = el.querySelector('.page-face-back');
      if (pfFront) pfFront.innerHTML = '';
      if (pfBack)  pfBack.innerHTML  = '';
      if (step === 1) {
        el.style.right        = '0';
        el.style.left         = 'auto';
        el.style.transformOrigin = 'left center';
        el.style.transform    = 'rotateY(0deg)';
        if (pfFront) pfFront.innerHTML = frontHTML;
        if (pfBack)  pfBack.innerHTML  = backHTML;
        void el.offsetWidth;
        el.style.transform    = 'rotateY(-180deg)';
      } else {
        el.style.left         = '0';
        el.style.right        = 'auto';
        el.style.transformOrigin = 'right center';
        el.style.transform    = 'rotateY(-180deg)';
        if (pfFront) pfFront.innerHTML = frontHTML;
        if (pfBack)  pfBack.innerHTML  = backHTML;
        void el.offsetWidth;
        el.style.transform    = 'rotateY(0deg)';
      }
    }

    setTimeout(() => {
      setCurrentSpread(next);
      bookEl.style.overflow = origOverflow;
      if (overlayRef.current) {
        overlayRef.current.style.display = 'none';
        overlayRef.current.className = 'page-turn-layer';
      }
      flippingRef.current = false;
    }, 870);
  }

  useEffect(() => { modeRef.current = { onNext, onPrev, onExit, pageMode, turnPage }; });

  // Reset on chapter change; hide cover/title/toc after first open
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setCurrentSpread(0);
    setShowBookOpening(false);
    flippingRef.current = false;
    scrollRestoredRef.current = false;
  }, [chapterIndex, chapter]);

  // Create page-turn overlay via DOM (outside React) — matches reference HTML exactly
  useLayoutEffect(() => {
    if (!pageMode) return;
    const book = bookRef.current;
    if (!book) return;
    let overlay = book.querySelector('.page-turn-layer');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'page-turn-layer';
      overlay.style.display = 'none';

      const front = document.createElement('div');
      front.className = 'page-face page-face-front';
      overlay.appendChild(front);

      const back = document.createElement('div');
      back.className = 'page-face page-face-back';
      overlay.appendChild(back);

      book.appendChild(overlay);
    }
    overlayRef.current = overlay;
    return () => {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      overlayRef.current = null;
    };
  }, [pageMode]);

  useEffect(() => {
    function fn() {
      const el = pageRef.current;
      if (!el) return;
      const max = el.scrollHeight - el.clientHeight;
      setScrollPct(max <= 0 ? 0 : Math.round((el.scrollTop / max) * 100));
    }
    scrollFn.current = fn;
  }, []);

  useEffect(() => {
    if (!pageMode && pageRef.current) {
      if (!scrollRestoredRef.current && savedScrollPos > 0) {
        scrollRestoredRef.current = true;
        requestAnimationFrame(() => {
          if (pageRef.current) pageRef.current.scrollTop = savedScrollPos;
        });
      } else {
        pageRef.current.scrollTop = 0;
      }
    }
    scrollFn.current?.();
  }, [chapterIndex, chapter]);

  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;
    function handler() { scrollFn.current?.(); }
    el.addEventListener('scroll', handler);
    return () => el.removeEventListener('scroll', handler);
  }, [chapter]);

  useEffect(() => {
    if (lastSavedIdx.current !== chapterIndex) {
      onMarkPage?.(chapterIndex, pageRef.current?.scrollTop || 0);
      lastSavedIdx.current = chapterIndex;
    }
  }, [chapterIndex, onMarkPage]);

  useEffect(() => {
    function onKey(e) {
      const m = modeRef.current;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        if (m.pageMode) m.turnPage('next');
        else m.onNext?.();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        if (m.pageMode) m.turnPage('prev');
        else m.onPrev?.();
      } else if (e.key === 'Escape')  { if (exitingRef.current) return; exitingRef.current = true; e.preventDefault(); m.onExit?.(); }
      else if (e.key === 'p' || e.key === 'P') { setShowPrefs(p => !p); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    exitingRef.current = false;
    function onFSChange() {
      if (!document.fullscreenElement && !exitingRef.current) {
        exitingRef.current = true;
        onExit?.();
      }
    }
    document.addEventListener('fullscreenchange', onFSChange);
    return () => document.removeEventListener('fullscreenchange', onFSChange);
  }, [onExit]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    return () => { onMarkPage?.(lastSavedIdx.current, pageRef.current?.scrollTop || 0); };
  }, []);

  // Si no hay capítulo, mostrar mensaje
  if (!chapter) {
    const noChapterContent = (
      <div className="fixed inset-0 z-40 flex items-center justify-center"
        style={{ backgroundColor: outer }}
      >
        <div className="rm-card p-8 max-w-md text-center space-y-3">
          <div className="text-5xl opacity-40">📖</div>
          <h2 className="font-serif text-xl font-bold text-foxBrown">Capítulo no encontrado</h2>
          <p className="text-sm opacity-70">El capítulo solicitado no existe o no está disponible.</p>
          <button className="btn-primary text-sm" onClick={onExit}>Volver</button>
        </div>
      </div>
    );
    if (typeof document === 'undefined') return noChapterContent;
    return createPortal(noChapterContent, document.body);
  }

  // Si el contenido está vacío, mostrar aviso
  if (chapter.contenido == null || chapter.contenido === '') {
    const emptyContent = (
      <div className="fixed inset-0 z-40 flex items-center justify-center"
        style={{ backgroundColor: outer }}
      >
        <div className="rm-card p-8 max-w-md text-center space-y-3">
          <div className="text-5xl opacity-40">📖</div>
          <p className="font-serif text-xl font-bold text-foxBrown">Este libro aún no tiene contenido disponible.</p>
          <p className="text-sm opacity-70">El autor no ha agregado contenido a este capítulo.</p>
          <button className="btn-primary text-sm" onClick={onExit}>Volver</button>
        </div>
      </div>
    );
    if (typeof document === 'undefined') return emptyContent;
    return createPortal(emptyContent, document.body);
  }

  // === PAGE MODE RENDER (open-book + page turn animation) ===
  if (pageMode) {
    const spread = spreads[currentSpread] || { left: null, right: null };
    const firstContentSpread = spreads.findIndex(s => s.left?.type === PAGE_CONTENT);

    const leftHTML = pageTextToHTML(spread.left?.text || '', book.autor_id);
    const rightHTML = pageTextToHTML(spread.right?.text || '', book.autor_id);

    const chapterTitleHTML = (currentSpread === firstContentSpread && chapter?.titulo)
      ? `<h2 class="chapter-title">${chapter.titulo}</h2>`
      : '';

    const pageModeContent = (
      <div className="fixed inset-0 z-40 flex flex-col"
        style={{
          backgroundColor: outer,
          ...(prefs.bgImage ? {
            backgroundImage: 'url(' + prefs.bgImage + ')',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed'
          } : {})
        }}
      >
        {/* Header */}
        <header className="flex items-center gap-2 px-4 py-2 z-20"
          style={{
            backgroundColor: prefs.bgImage ? '#00000099' : outer,
            borderBottom: '1px solid ' + (prefs.bgImage ? 'rgba(255,255,255,0.15)' : outer)
          }}
        >
          <button onClick={onExit}
            title="Salir del modo lectura (esc también)"
            className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition"
            style={{ backgroundColor: '#00000066' }}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>✕</span>
          </button>
          <div className="flex-1 text-sm text-white/90 text-center truncate select-none px-2 flex items-center justify-center gap-2">
            <span className="font-serif text-base font-bold text-white">FoxOnAShelf<span className="text-xs align-super opacity-70">™</span></span>
            <span className="opacity-50">·</span>
            <span className="text-white truncate">{book.titulo}</span>
          </div>
          <button onClick={() => onPrefsChange?.({ ...prefs, pageMode: false })}
            title="Modo desplazamiento (scroll)"
            className="px-3 py-1 rounded text-xs text-white hover:bg-white/10 transition"
            style={{ backgroundColor: '#00000066' }}
          >
            📖 Scroll
          </button>
          <button onClick={() => onBookmark?.(chapterIndex, pageMode ? currentSpread : (pageRef.current?.scrollTop || 0))}
            title="Marcar página actual"
            className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition"
            style={{ backgroundColor: '#00000066' }}
          >
            <span style={{ fontSize: 16 }}>🔖</span>
          </button>
          <button onClick={() => onToggleHighlights?.()}
            title="Resaltados"
            className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition"
            style={{ backgroundColor: '#00000066' }}
          >
            <span style={{ fontSize: 16 }}>💡</span>
          </button>
          <button onClick={() => setShowPrefs(p => !p)}
            title="Personalización (P)"
            className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition"
            style={{ backgroundColor: '#00000066' }}
          >
            <span style={{ fontSize: 18 }}>⚙</span>
          </button>
        </header>

        {/* === Open Book with flip animation === */}
        <div className="flex-1 flex items-start justify-center p-4 md:p-8 min-h-0 overflow-auto"
          style={{ backgroundColor: '#1d1f20' }}
        >
          <section className="book-outer">
            <section className="open-book" ref={bookRef}>
              {/* Page-turn overlay is created via DOM in useLayoutEffect — not in JSX */}

              <header>
                <h1>{book.titulo}</h1>
                <h6>{book.nombre_autor || ''}</h6>
              </header>
              <article>
                {spread.left?.type === PAGE_CONTENT ? (
                  <div className="page-content-area">
                    <div className="page-left" dangerouslySetInnerHTML={{ __html: chapterTitleHTML + leftHTML }} />
                    {rightHTML ? (
                      <div className="page-right" dangerouslySetInnerHTML={{ __html: rightHTML }} />
                    ) : (
                      <div className="page-right" />
                    )}
                  </div>
                ) : (
                  renderPageArea(spread.left, false, {
                    theme, font, fontSize: prefs.fontSize, lineHeight,
                    authorId: book.autor_id, book, chapters,
                    goToChapter, chapterIndex, contentStyle: {
                      fontFamily: font.stack,
                      fontSize: (prefs.fontSize || 16) + 'px',
                      lineHeight
                    },
                    pageNum: currentSpread + 1
                  })
                )}
              </article>
              <footer>
                <ol id="page-numbers">
                  <li>{spread.left?.pageNum || currentSpread * 2 + 1}</li>
                  <li>{spread.right?.pageNum || (spread.left?.pageNum || currentSpread * 2 + 1) + 1}</li>
                </ol>
              </footer>
            </section>
          </section>
        </div>

        {/* Nav controls — exact reference styling */}
        <div className="nav-controls">
          <button className="nav-btn"
            onClick={() => turnPage('prev')}
            disabled={currentSpread === 0 && chapterIndex === 0}
            title="Página anterior"
          >
            ← Anterior
          </button>
          <span className="page-indicator">
            {spread.left
              ? (spread.right
                  ? `Páginas ${spread.left.pageNum || currentSpread * 2 + 1}–${spread.right.pageNum || currentSpread * 2 + 2} de ${pages.length}`
                  : `Pág. ${currentSpread + 1} de ${totalSpreads}`)
              : 'Sin páginas'}
          </span>
          <button className="nav-btn"
            onClick={() => turnPage('next')}
            disabled={currentSpread >= totalSpreads - 1 && chapterIndex >= totalChapters - 1}
            title="Página siguiente"
          >
            Siguiente →
          </button>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-center gap-4 px-4 py-3 z-20"
          style={{
            backgroundColor: prefs.bgImage ? '#00000099' : outer,
            borderTop: '1px solid ' + (prefs.bgImage ? 'rgba(255,255,255,0.15)' : outer)
          }}
        >
          <button onClick={onPrev}
            disabled={chapterIndex === 0}
            className="px-4 py-1.5 rounded text-sm text-white hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#00000066' }}
          >
            ← Anterior
          </button>
          <span className="text-sm text-white/80 tabular-nums select-none min-w-[3rem] text-center">
            {chapterIndex + 1} / {totalChapters}
          </span>
          <button onClick={onNext}
            disabled={chapterIndex === totalChapters - 1}
            className="px-4 py-1.5 rounded text-sm text-white hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#00000066' }}
          >
            Siguiente →
          </button>
        </footer>

        {/* Prefs overlay */}
        {showPrefs && (
          <div className="absolute top-14 right-3 z-30 rounded-lg shadow-2xl p-4 w-72 max-h-[80vh] overflow-y-auto"
            style={{ backgroundColor: theme.bg, border: '1px solid ' + theme.border + '55', color: theme.fg }}
          >
            <div className="text-sm font-bold mb-2">Personalización</div>
            <div className="text-xs opacity-70 mt-3 mb-1">Modo de lectura</div>
            <div className="flex gap-1 mb-2">
              <button
                className={'px-3 py-1 text-xs rounded border ' + (!pageMode ? 'opacity-100 ring-2 ring-white/40' : 'opacity-60')}
                style={{ borderColor: theme.border + '88' }}
                onClick={() => onPrefsChange?.({ ...prefs, pageMode: false })}
              >
                📜 Scroll
              </button>
              <button
                className={'px-3 py-1 text-xs rounded border ' + (pageMode ? 'opacity-100 ring-2 ring-white/40' : 'opacity-60')}
                style={{ borderColor: theme.border + '88' }}
                onClick={() => onPrefsChange?.({ ...prefs, pageMode: true })}
              >
                📖 Páginas
              </button>
            </div>
            <div className="text-xs opacity-70 mt-3 mb-1">Fondo (escritorio)</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(OUTERS).map(([k, color]) => (
                <button key={k} title={k}
                  className={'w-6 h-6 rounded-full border ' + (prefs.outer === k ? 'ring-2 ring-white' : 'border-white/40')}
                  style={{ backgroundColor: color }}
                  onClick={() => onPrefsChange?.({ ...prefs, outer: k, bgImage: null })} />
              ))}
            </div>
            <div className="text-xs opacity-70 mt-3 mb-1">Imagen de fondo</div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer px-3 py-1 text-xs rounded border hover:opacity-80"
                style={{ borderColor: theme.border + '88' }}>
                {prefs.bgImage ? 'Cambiar imagen' : 'Seleccionar imagen'}
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      onPrefsChange?.({ ...prefs, bgImage: ev.target.result });
                    };
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }} />
              </label>
              {prefs.bgImage && (
                <button className="px-3 py-1 text-xs rounded border hover:opacity-80"
                  style={{ borderColor: theme.border + '88' }}
                  onClick={() => onPrefsChange?.({ ...prefs, bgImage: null })}>
                  Quitar
                </button>
              )}
            </div>
            {prefs.bgImage && (
              <div className="mt-2 rounded overflow-hidden border" style={{ borderColor: theme.border + '44' }}>
                <img src={prefs.bgImage} alt="Fondo" className="w-full h-12 object-cover" />
              </div>
            )}
            <div className="text-xs opacity-70 mt-3 mb-1">Color hoja</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(THEMES).map(([k, t]) => (
                <button key={k} title={k}
                  className={'w-6 h-6 rounded-full border-2 ' + (prefs.theme === k ? 'ring-2 ring-offset-1' : '')}
                  style={{ backgroundColor: t.bg, borderColor: t.border }}
                  onClick={() => onPrefsChange?.({ ...prefs, theme: k })} />
              ))}
            </div>
            <div className="text-xs opacity-70 mt-3 mb-1">Tipografía</div>
            <div className="flex gap-1 flex-wrap">
              {Object.entries(FONTS).map(([k, f]) => (
                <button key={k}
                  className={'px-3 py-1 text-xs rounded border ' + (prefs.font === k ? 'opacity-100' : 'opacity-60')}
                  style={{ borderColor: theme.border + '88', fontFamily: f.stack }}
                  onClick={() => onPrefsChange?.({ ...prefs, font: k })}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="text-xs opacity-70 mt-3 mb-1">Tamaño</div>
            <div className="flex gap-1">
              {FONT_SIZES.map(s => (
                <button key={s.value}
                  className={'px-2 py-1 text-xs rounded border min-w-[2rem] ' + (prefs.fontSize === s.value ? 'opacity-100' : 'opacity-60')}
                  style={{ borderColor: theme.border + '88' }}
                  onClick={() => onPrefsChange?.({ ...prefs, fontSize: s.value })}>
                  {s.label}
                </button>
              ))}
            </div>
            <div className="text-xs opacity-70 mt-3 mb-1">Interlineado</div>
            <div className="flex gap-1">
              {Object.entries(LINE_HEIGHTS).map(([k, lh]) => (
                <button key={k}
                  className={'px-2 py-1 text-xs rounded border ' + (prefs.lineHeight === k ? 'opacity-100' : 'opacity-60')}
                  style={{ borderColor: theme.border + '88' }}
                  onClick={() => onPrefsChange?.({ ...prefs, lineHeight: k })}>
                  {lh.label}
                </button>
              ))}
            </div>
            <div className="text-xs opacity-70 mt-3 mb-1">Ancho hoja</div>
            <div className="flex gap-1">
              {Object.entries(WIDTHS).map(([k, w]) => (
                <button key={k}
                  className={'px-3 py-1 text-xs rounded border ' + (prefs.width === k ? 'opacity-100' : 'opacity-60')}
                  style={{ borderColor: theme.border + '88' }}
                  onClick={() => onPrefsChange?.({ ...prefs, width: k })}>
                  {w.label}
                </button>
              ))}
            </div>
            <div className="text-xs opacity-50 mt-3 pt-2 border-t" style={{ borderColor: theme.border + '22' }}>
              ← / → página · P preferencias · Esc salir
            </div>
          </div>
        )}
      </div>
    );

    if (typeof document === 'undefined') return pageModeContent;
    return createPortal(pageModeContent, document.body);
  }

  // === SCROLL MODE RENDER (existing) ===
  const content = (
    <div className="fixed inset-0 z-40 flex flex-col"
      style={{
        backgroundColor: outer,
        ...(prefs.bgImage ? {
          backgroundImage: 'url(' + prefs.bgImage + ')',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        } : {})
      }}
    >
      {/* Header */}
      <header className="flex items-center gap-2 px-4 py-2 z-20"
        style={{
          backgroundColor: prefs.bgImage ? '#00000099' : outer,
          borderBottom: '1px solid ' + (prefs.bgImage ? 'rgba(255,255,255,0.15)' : outer)
        }}
      >
        <button onClick={onExit}
          title="Salir del modo lectura (esc también)"
          className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition"
          style={{ backgroundColor: '#00000066' }}
        >
          <span style={{ fontSize: 20, lineHeight: 1 }}>✕</span>
        </button>
        <div className="flex-1 text-sm text-white/90 text-center truncate select-none px-2 flex items-center justify-center gap-2">
          <span className="font-serif text-base font-bold text-white">FoxOnAShelf<span className="text-xs align-super opacity-70">™</span></span>
          <span className="opacity-50">·</span>
          <span className="text-white truncate">{book.titulo}</span>
        </div>
        <button onClick={() => onPrefsChange?.({ ...prefs, pageMode: true })}
          title="Modo libro (páginas)"
          className="px-3 py-1 rounded text-xs text-white hover:bg-white/10 transition"
          style={{ backgroundColor: '#00000066' }}
        >
          📖 Libro
        </button>
        <button onClick={() => onBookmark?.(chapterIndex, pageMode ? currentSpread : (pageRef.current?.scrollTop || 0))}
          title="Marcar página actual"
          className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition"
          style={{ backgroundColor: '#00000066' }}
        >
          <span style={{ fontSize: 16 }}>🔖</span>
        </button>
        <button onClick={() => onToggleHighlights?.()}
          title="Resaltados"
          className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition"
          style={{ backgroundColor: '#00000066' }}
        >
          <span style={{ fontSize: 16 }}>💡</span>
        </button>
        <button onClick={() => setShowPrefs(p => !p)}
          title="Personalización (P)"
          className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition"
          style={{ backgroundColor: '#00000066' }}
        >
          <span style={{ fontSize: 18 }}>⚙</span>
        </button>
      </header>

      {/* Scroll mode — scroll continuo con separadores entre páginas */}
      <div className="flex-1 flex items-start justify-center px-4 py-3 min-h-0">
        <div className="parchment-page relative shadow-2xl rounded-2xl overflow-hidden"
             style={{
               maxWidth: pageWidthRem + 'rem',
               width: '100%',
               maxHeight: 'calc(100vh - 96px)',
               backgroundColor: theme.bg,
               color: theme.fg,
               boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 8px 20px rgba(0,0,0,0.3), inset 0 0 60px rgba(120,80,40,0.15)'
             }}>
          <div ref={pageRef}
            className="reader-page relative w-full h-full overflow-y-auto"
            style={{
              maxHeight: 'calc(100vh - 96px)',
              '--sb-thumb': theme.border + '77',
              '--sb-thumb-hover': theme.border + 'bb'
            }}
          >
            {/* Barra de progreso vertical */}
            <div className="z-50 pointer-events-none"
                 style={{
                   position: 'sticky',
                   top: '48px',
                   marginLeft: '14px',
                   width: '4px',
                   height: 'calc(100vh - 192px)',
                   marginBottom: 'calc(-100vh + 192px)',
                   backgroundColor: theme.fg + '15',
                    borderRadius: '2px'
                  }}>
              <div className="w-full rounded-full transition-all duration-150"
                   style={{ height: (scrollPct || 0) + '%', backgroundColor: theme.border, borderRadius: '2px' }} />
            </div>
            {pages.map((page, i) => (
              <div key={page.id || i}>
                <PageContent
                  content={page.text || ''}
                  title={chapter?.titulo}
                  pageNum={i + 1}
                  theme={theme} font={font}
                  fontSize={prefs.fontSize}
                  lineHeight={lineHeight}
                  showTitle={i === 0}
                  showEndMarker={i === pages.length - 1}
                  authorId={book.autor_id}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-center gap-4 px-4 py-3 z-20"
        style={{
          backgroundColor: prefs.bgImage ? '#00000099' : outer,
          borderTop: '1px solid ' + (prefs.bgImage ? 'rgba(255,255,255,0.15)' : outer)
        }}
      >
        <button onClick={onPrev}
          disabled={chapterIndex === 0}
          className="px-4 py-1.5 rounded text-sm text-white hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#00000066' }}
        >
          ← Anterior
        </button>
        <span className="text-sm text-white/80 tabular-nums select-none min-w-[3rem] text-center">
          {chapterIndex + 1} / {totalChapters}
        </span>
        <button onClick={onNext}
          disabled={chapterIndex === totalChapters - 1}
          className="px-4 py-1.5 rounded text-sm text-white hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#00000066' }}
        >
          Siguiente →
        </button>
      </footer>

      {/* Prefs overlay */}
      {showPrefs && (
        <div className="absolute top-14 right-3 z-30 rounded-lg shadow-2xl p-4 w-72 max-h-[80vh] overflow-y-auto"
          style={{ backgroundColor: theme.bg, border: '1px solid ' + theme.border + '55', color: theme.fg }}
        >
          <div className="text-sm font-bold mb-2">Personalización</div>
          <div className="text-xs opacity-70 mt-3 mb-1">Modo de lectura</div>
          <div className="flex gap-1 mb-2">
            <button
              className={'px-3 py-1 text-xs rounded border ' + (!pageMode ? 'opacity-100 ring-2 ring-white/40' : 'opacity-60')}
              style={{ borderColor: theme.border + '88' }}
              onClick={() => onPrefsChange?.({ ...prefs, pageMode: false })}
            >
              📜 Scroll
            </button>
            <button
              className={'px-3 py-1 text-xs rounded border ' + (pageMode ? 'opacity-100 ring-2 ring-white/40' : 'opacity-60')}
              style={{ borderColor: theme.border + '88' }}
              onClick={() => onPrefsChange?.({ ...prefs, pageMode: true })}
            >
              📖 Páginas
            </button>
          </div>
          <div className="text-xs opacity-70 mt-3 mb-1">Fondo (escritorio)</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(OUTERS).map(([k, color]) => (
              <button key={k} title={k}
                className={'w-6 h-6 rounded-full border ' + (prefs.outer === k ? 'ring-2 ring-white' : 'border-white/40')}
                style={{ backgroundColor: color }}
                onClick={() => onPrefsChange?.({ ...prefs, outer: k, bgImage: null })} />
            ))}
          </div>
          <div className="text-xs opacity-70 mt-3 mb-1">Imagen de fondo</div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer px-3 py-1 text-xs rounded border hover:opacity-80"
              style={{ borderColor: theme.border + '88' }}>
              {prefs.bgImage ? 'Cambiar imagen' : 'Seleccionar imagen'}
              <input type="file" accept="image/*" className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    onPrefsChange?.({ ...prefs, bgImage: ev.target.result });
                  };
                  reader.readAsDataURL(file);
                  e.target.value = '';
                }} />
            </label>
            {prefs.bgImage && (
              <button className="px-3 py-1 text-xs rounded border hover:opacity-80"
                style={{ borderColor: theme.border + '88' }}
                onClick={() => onPrefsChange?.({ ...prefs, bgImage: null })}>
                Quitar
              </button>
            )}
          </div>
          {prefs.bgImage && (
            <div className="mt-2 rounded overflow-hidden border" style={{ borderColor: theme.border + '44' }}>
              <img src={prefs.bgImage} alt="Fondo" className="w-full h-12 object-cover" />
            </div>
          )}
          <div className="text-xs opacity-70 mt-3 mb-1">Color hoja</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(THEMES).map(([k, t]) => (
              <button key={k} title={k}
                className={'w-6 h-6 rounded-full border-2 ' + (prefs.theme === k ? 'ring-2 ring-offset-1' : '')}
                style={{ backgroundColor: t.bg, borderColor: t.border }}
                onClick={() => onPrefsChange?.({ ...prefs, theme: k })} />
            ))}
          </div>
          <div className="text-xs opacity-70 mt-3 mb-1">Tipografía</div>
          <div className="flex gap-1 flex-wrap">
            {Object.entries(FONTS).map(([k, f]) => (
              <button key={k}
                className={'px-3 py-1 text-xs rounded border ' + (prefs.font === k ? 'opacity-100' : 'opacity-60')}
                style={{ borderColor: theme.border + '88', fontFamily: f.stack }}
                onClick={() => onPrefsChange?.({ ...prefs, font: k })}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="text-xs opacity-70 mt-3 mb-1">Tamaño</div>
          <div className="flex gap-1">
            {FONT_SIZES.map(s => (
              <button key={s.value}
                className={'px-2 py-1 text-xs rounded border min-w-[2rem] ' + (prefs.fontSize === s.value ? 'opacity-100' : 'opacity-60')}
                style={{ borderColor: theme.border + '88' }}
                onClick={() => onPrefsChange?.({ ...prefs, fontSize: s.value })}>
                {s.label}
              </button>
            ))}
          </div>
          <div className="text-xs opacity-70 mt-3 mb-1">Interlineado</div>
          <div className="flex gap-1">
            {Object.entries(LINE_HEIGHTS).map(([k, lh]) => (
              <button key={k}
                className={'px-2 py-1 text-xs rounded border ' + (prefs.lineHeight === k ? 'opacity-100' : 'opacity-60')}
                style={{ borderColor: theme.border + '88' }}
                onClick={() => onPrefsChange?.({ ...prefs, lineHeight: k })}>
                {lh.label}
              </button>
            ))}
          </div>
          <div className="text-xs opacity-70 mt-3 mb-1">Ancho hoja</div>
          <div className="flex gap-1">
            {Object.entries(WIDTHS).map(([k, w]) => (
              <button key={k}
                className={'px-3 py-1 text-xs rounded border ' + (prefs.width === k ? 'opacity-100' : 'opacity-60')}
                style={{ borderColor: theme.border + '88' }}
                onClick={() => onPrefsChange?.({ ...prefs, width: k })}>
                {w.label}
              </button>
            ))}
          </div>
          <div className="text-xs opacity-50 mt-3 pt-2 border-t" style={{ borderColor: theme.border + '22' }}>
            {pageMode ? '← / → página · P preferencias · Esc salir' : '← / → capítulo · Esc salir · P preferencias'}
          </div>
        </div>
      )}
    </div>
  );

  if (typeof document === 'undefined') return content;
  return createPortal(content, document.body);
}

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiBase } from '../api/client.js';
import { THEMES, FONTS, WIDTHS, FONT_SIZES, LINE_HEIGHTS, GUTTER_SPACING, DARK_THEMES } from './readerConstants.js';

function tiptapToHTML(json, authorId) {
  if (!json) return '';
  if (typeof json === 'string') {
    try { json = JSON.parse(json); } catch { return json; }
  }
  if (json.type === 'doc' && json.content) {
    return json.content.map(block => tiptapBlockToHTML(block, authorId)).join('');
  }
  return '';
}

function tiptapBlockToHTML(block, authorId) {
  if (!block) return '';
  const content = block.content ? block.content.map(n => tiptapInlineToHTML(n, authorId)).join('') : '';

  switch (block.type) {
    case 'heading': {
      const level = block.attrs?.level || 1;
      const align = block.attrs?.textAlign ? ` style="text-align:${block.attrs.textAlign}"` : '';
      return `<h${level}${align}>${content}</h${level}>`;
    }
    case 'paragraph': {
      const align = block.attrs?.textAlign ? ` style="text-align:${block.attrs.textAlign}"` : '';
      return `<p${align}>${content || '<br>'}</p>`;
    }
    case 'bulletList':
      return `<ul>${(block.content || []).map(li => `<li>${li.content ? li.content.map(n => tiptapInlineToHTML(n, authorId)).join('') : ''}</li>`).join('')}</ul>`;
    case 'orderedList':
      return `<ol>${(block.content || []).map(li => `<li>${li.content ? li.content.map(n => tiptapInlineToHTML(n, authorId)).join('') : ''}</li>`).join('')}</ol>`;
    case 'listItem':
      return `<li>${content}</li>`;
    case 'horizontalRule':
      return '<hr>';
    case 'image': {
      const src = block.attrs?.src || '';
      const alt = block.attrs?.alt || '';
      return `<img src="${src}" alt="${alt}" style="max-width:100%;height:auto;margin:1em auto;display:block;border-radius:4px" />`;
    }
    case 'blockquote':
      return `<blockquote style="border-left:3px solid #7B4B27;padding-left:1em;opacity:0.8">${content}</blockquote>`;
    default:
      return content;
  }
}

function tiptapInlineToHTML(node, authorId) {
  if (!node) return '';
  if (node.type === 'text') {
    let text = node.text || '';
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === 'bold') text = `<strong>${text}</strong>`;
        if (mark.type === 'italic') text = `<em>${text}</em>`;
        if (mark.type === 'underline') text = `<u>${text}</u>`;
        if (mark.type === 'strike') text = `<s>${text}</s>`;
        if (mark.type === 'highlight') text = `<mark style="background:${mark.attrs?.color || '#FFEB3B'}">${text}</mark>`;
        if (mark.type === 'textStyle' && mark.attrs?.color) text = `<span style="color:${mark.attrs.color}">${text}</span>`;
        if (mark.type === 'textStyle' && mark.attrs?.fontFamily) text = `<span style="font-family:${mark.attrs.fontFamily}">${text}</span>`;
      }
    }
    return text;
  }
  if (node.type === 'image') {
    const src = node.attrs?.src || '';
    const alt = node.attrs?.alt || '';
    return `<img src="${src}" alt="${alt}" style="max-width:100%;height:auto;margin:0.5em auto;display:block;border-radius:4px" />`;
  }
  return node.content ? node.content.map(n => tiptapInlineToHTML(n, authorId)).join('') : '';
}

function stripTiptapHTML(json) {
  const html = tiptapToHTML(json);
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

export default function ReadingMode({
  book, chapters, chapter, chapterIndex, totalChapters,
  prefs, onPrev, onNext, onExit, onMarkPage, onBookmark, onPrefsChange, onGoToChapter,
  savedScrollPos, onToggleHighlights
}) {
  const [scrollPct, setScrollPct] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollRef = useRef(null);
  const lastSavedIdx = useRef(chapterIndex);
  const exitingRef = useRef(false);
  const modeRef = useRef({ onNext, onPrev, onExit });
  const isRestoredRef = useRef(false);

  const theme = THEMES[prefs.theme] || THEMES.parchment;
  const font = FONTS[prefs.font] || FONTS.serif;
  const lineHeight = LINE_HEIGHTS[prefs.lineHeight]?.value || 1.75;
  const pageWidthRem = WIDTHS[prefs.width]?.value ?? 44;
  const isDark = DARK_THEMES.includes(prefs.theme);

  const modoLectura = book.modo_lectura || 'vertical';
  const contenido = chapter?.contenido || '';
  const esComic = book.tipo_libro === 'comic';

  let paneles = [];
  if (esComic) {
    try {
      const parsed = JSON.parse(contenido);
      paneles = parsed.paneles || [];
    } catch {}
  }

  const htmlContent = tiptapToHTML(contenido, book.autor_id);
  const previewText = stripTiptapHTML(contenido);

  useEffect(() => { modeRef.current = { onNext, onPrev, onExit }; }, [onNext, onPrev, onExit]);

  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    function onScroll() {
      if (!el) return;
      const max = el.scrollHeight - el.clientHeight;
      const pct = max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 0;
      setScrollPct(pct);
      const savedIdx = lastSavedIdx.current;
      if (savedIdx === chapterIndex) {
        onMarkPage?.(chapterIndex, Math.round(el.scrollTop));
      }
    }
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [chapterIndex, onMarkPage]);

  useLayoutEffect(() => {
    if (scrollRef.current && savedScrollPos && !isRestoredRef.current) {
      scrollRef.current.scrollTop = savedScrollPos;
      isRestoredRef.current = true;
    }
  }, [savedScrollPos, chapterIndex]);

  useEffect(() => {
    isRestoredRef.current = false;
  }, [chapterIndex]);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') { modeRef.current.onExit?.(); return; }
      if (modoLectura === 'lateral') {
        if (e.key === 'ArrowRight' || e.key === 'PageDown') { nextSlide(); return; }
        if (e.key === 'ArrowLeft' || e.key === 'PageUp') { prevSlide(); return; }
      } else {
        if (e.key === 'ArrowRight' || e.key === 'PageDown') {
          e.preventDefault();
          if (chapterIndex < totalChapters - 1) modeRef.current.onNext?.();
        }
        if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
          e.preventDefault();
          if (chapterIndex > 0) modeRef.current.onPrev?.();
        }
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [chapterIndex, totalChapters, modoLectura]);

  function nextSlide() {
    const total = esComic ? paneles.length : 1;
    if (currentSlide < total - 1) setCurrentSlide(s => s + 1);
    else if (chapterIndex < totalChapters - 1) { onNext?.(); setCurrentSlide(0); }
  }

  function prevSlide() {
    if (currentSlide > 0) setCurrentSlide(s => s - 1);
    else if (chapterIndex > 0) { onPrev?.(); setCurrentSlide(0); }
  }

  function exitReading() {
    if (exitingRef.current) return;
    exitingRef.current = true;
    onMarkPage?.(chapterIndex, scrollRef.current?.scrollTop || 0);
    modeRef.current.onExit?.();
  }

  const contenidoEstilos = {
    fontFamily: font.stack,
    fontSize: (prefs.fontSize || 18) + 'px',
    lineHeight,
    maxWidth: pageWidthRem + 'rem',
    color: theme.fg,
  };

  function renderContenido() {
    if (esComic && paneles.length > 0) {
      return (
        <div className="w-full">
          {paneles.map((panel, i) => (
            <div key={panel.id || i} className="w-full" style={{ marginBottom: i < paneles.length - 1 ? GUTTER_SPACING.escena + 'px' : 0 }}>
              {panel.imagen && (
                <img src={panel.imagen} alt={`Panel ${i + 1}`}
                     className="w-full h-auto" style={{ display: 'block' }} />
              )}
              {panel.texto_burbuja && (
                <div className={`text-center py-2 px-4 text-sm italic opacity-80`}
                     style={{ color: theme.fg }}>
                  {panel.texto_burbuja}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div style={contenidoEstilos} className="px-8 py-10">
        {chapterIndex === 0 && (
          <h1 className="font-bold mb-6" style={{ fontSize: '1.4em' }}>{chapter?.titulo}</h1>
        )}
        <div className="whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: htmlContent }} />
        <div className="mt-12 pt-6 border-t text-center text-sm opacity-50"
             style={{ borderColor: theme.border + '33' }}>
          — Fin del capítulo —
        </div>
      </div>
    );
  }

  if (modoLectura === 'lateral') {
    const totalSlides = esComic ? paneles.length : 1;
    return (
      <div className="fixed inset-0 z-30 flex flex-col" style={{ backgroundColor: theme.bg }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 shrink-0"
             style={{ backgroundColor: theme.bg, borderBottom: '1px solid ' + theme.border + '33' }}>
          <button onClick={exitReading} className="text-sm opacity-70 hover:opacity-100">✕ Salir</button>
          <span className="text-xs opacity-50">{chapter?.titulo || 'Capítulo ' + (chapterIndex + 1)}</span>
          <span className="text-xs opacity-50">{currentSlide + 1} / {totalSlides}</span>
        </div>

        {/* Slide area */}
        <div ref={scrollRef} className="flex-1 flex items-center justify-center overflow-hidden relative">
          <button onClick={prevSlide} className="absolute left-2 z-10 text-3xl opacity-30 hover:opacity-70 p-4">‹</button>
          <div className="max-w-2xl w-full px-16">
            {esComic && paneles[currentSlide] ? (
              <div>
                {paneles[currentSlide].imagen && (
                  <img src={paneles[currentSlide].imagen} alt="" className="w-full h-auto rounded" />
                )}
                {paneles[currentSlide].texto_burbuja && (
                  <div className="text-center py-2 text-sm italic opacity-80" style={{ color: theme.fg }}>
                    {paneles[currentSlide].texto_burbuja}
                  </div>
                )}
              </div>
            ) : (
              <div style={contenidoEstilos} dangerouslySetInnerHTML={{ __html: htmlContent }} />
            )}
          </div>
          <button onClick={nextSlide} className="absolute right-2 z-10 text-3xl opacity-30 hover:opacity-70 p-4">›</button>
        </div>

        {/* Progress */}
        <div className="h-1 shrink-0" style={{ backgroundColor: theme.border + '22' }}>
          <div className="h-full transition-all" style={{ width: ((currentSlide + 1) / totalSlides * 100) + '%', backgroundColor: theme.border }} />
        </div>

        {/* Chapter nav */}
        <div className="flex items-center justify-center gap-4 px-4 py-2 shrink-0"
             style={{ backgroundColor: theme.bg, borderTop: '1px solid ' + theme.border + '33' }}>
          <button onClick={() => { if (chapterIndex > 0) { onPrev?.(); setCurrentSlide(0); } }}
                  disabled={chapterIndex === 0}
                  className="text-xs opacity-50 hover:opacity-100 disabled:opacity-20">← Anterior</button>
          <span className="text-xs opacity-50">{chapterIndex + 1} / {totalChapters}</span>
          <button onClick={() => { if (chapterIndex < totalChapters - 1) { onNext?.(); setCurrentSlide(0); } }}
                  disabled={chapterIndex === totalChapters - 1}
                  className="text-xs opacity-50 hover:opacity-100 disabled:opacity-20">Siguiente →</button>
        </div>
      </div>
    );
  }

  // Modo vertical (default) o paneles
  return (
    <div className="fixed inset-0 z-30 flex flex-col" style={{ backgroundColor: theme.bg }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0"
           style={{ backgroundColor: theme.bg, borderBottom: '1px solid ' + theme.border + '33' }}>
        <button onClick={exitReading} className="text-sm opacity-70 hover:opacity-100">✕ Salir</button>
        <span className="text-xs opacity-50 truncate max-w-[50%]">{chapter?.titulo || 'Capítulo ' + (chapterIndex + 1)}</span>
        <div className="flex items-center gap-3">
          <button onClick={() => onToggleHighlights?.()} className="text-sm opacity-50 hover:opacity-100" title="Destacados">🎯</button>
          <button onClick={onBookmark} className="text-sm opacity-50 hover:opacity-100" title="Marcar">🔖</button>
        </div>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex justify-center">
          {renderContenido()}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 shrink-0" style={{ backgroundColor: theme.border + '22' }}>
        <div className="h-full transition-all" style={{ width: scrollPct + '%', backgroundColor: theme.border }} />
      </div>

      {/* Chapter nav */}
      <div className="flex items-center justify-center gap-4 px-4 py-2 shrink-0"
           style={{ backgroundColor: theme.bg, borderTop: '1px solid ' + theme.border + '33' }}>
        <button onClick={() => { if (chapterIndex > 0) onPrev?.(); }}
                disabled={chapterIndex === 0}
                className="text-xs opacity-50 hover:opacity-100 disabled:opacity-20">← Anterior</button>
        <span className="text-xs opacity-50">{chapterIndex + 1} / {totalChapters}</span>
        <button onClick={() => { if (chapterIndex < totalChapters - 1) onNext?.(); }}
                disabled={chapterIndex === totalChapters - 1}
                className="text-xs opacity-50 hover:opacity-100 disabled:opacity-20">Siguiente →</button>
      </div>
    </div>
  );
}

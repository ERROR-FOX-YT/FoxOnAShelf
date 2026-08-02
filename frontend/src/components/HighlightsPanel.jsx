import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const HIGHLIGHT_COLORS = [
  { hex: '#FBBF24', name: 'Amarillo' },
  { hex: '#34D399', name: 'Verde' },
  { hex: '#60A5FA', name: 'Azul' },
  { hex: '#F472B6', name: 'Rosa' },
  { hex: '#FB923C', name: 'Naranja' },
];

export default function HighlightsPanel({ libroId, capitulos = [], onClose, visible }) {
  const { user } = useAuth();
  const toast = useToast();

  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingNote, setEditingNote] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [exporting, setExporting] = useState(false);

  const noteInputRef = useRef(null);

  const fetchHighlights = useCallback(async () => {
    if (!libroId) return;
    setLoading(true);
    const r = await api.get('/api/destacados?libro_id=' + libroId);
    if (!r.__error) {
      const all = (r.capitulos || []).flatMap(c => c.destacados || []);
      setHighlights(all);
    }
    setLoading(false);
  }, [libroId]);

  useEffect(() => {
    if (visible) fetchHighlights();
  }, [visible, fetchHighlights]);

  useEffect(() => {
    if (editingId && noteInputRef.current) {
      noteInputRef.current.focus();
    }
  }, [editingId]);

  const chapterName = useCallback((capituloId) => {
    if (!capituloId) return null;
    const idx = capitulos.findIndex(c => c.id === capituloId);
    if (idx === -1) return null;
    const c = capitulos[idx];
    return c.titulo || 'Capítulo ' + (idx + 1);
  }, [capitulos]);

  const chapterIndex = useCallback((capituloId) => {
    if (!capituloId) return -1;
    return capitulos.findIndex(c => c.id === capituloId);
  }, [capitulos]);

  const groupedHighlights = useMemo(() => {
    let list = highlights;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(h =>
        (h.texto_seleccionado || '').toLowerCase().includes(q) ||
        (h.nota || '').toLowerCase().includes(q)
      );
    }
    const map = new Map();
    for (const h of list) {
      const cid = h.capitulo_id || '__unsorted';
      if (!map.has(cid)) map.set(cid, []);
      map.get(cid).push(h);
    }
    const sorted = [...map.entries()].sort((a, b) => {
      if (a[0] === '__unsorted') return 1;
      if (b[0] === '__unsorted') return -1;
      const ai = chapterIndex(a[0]);
      const bi = chapterIndex(b[0]);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
    return sorted;
  }, [highlights, search, chapterIndex]);

  const totalChapters = groupedHighlights.length;

  async function updateColor(id, color) {
    const r = await api.put('/api/destacados/' + id, { color });
    if (r.__error) {
      toast.error('Error al cambiar color');
      return;
    }
    setHighlights(prev => prev.map(h => h.id === id ? { ...h, color } : h));
    toast.ok('Color actualizado');
  }

  async function saveNote(id) {
    const r = await api.put('/api/destacados/' + id, { nota: editingNote });
    if (r.__error) {
      toast.error('Error al guardar nota');
      return;
    }
    setHighlights(prev => prev.map(h => h.id === id ? { ...h, nota: editingNote } : h));
    setEditingId(null);
    setEditingNote('');
    toast.ok('Nota guardada');
  }

  async function deleteHighlight(id) {
    const r = await api.del('/api/destacados/' + id);
    if (r.__error) {
      toast.error('Error al eliminar');
      return;
    }
    setHighlights(prev => prev.filter(h => h.id !== id));
    setConfirmDeleteId(null);
    toast.ok('Destacado eliminado');
  }

  async function exportHighlights() {
    setExporting(true);
    try {
      const r = await api.get('/api/destacados/libro/' + libroId + '/todos');
      if (r.__error) {
        toast.error('Error al exportar');
        return;
      }
      const allHighlights = r.destacados || r.highlights || [];
      if (allHighlights.length === 0) {
        toast.info('No hay destacados para exportar');
        return;
      }

      const grouped = new Map();
      for (const h of allHighlights) {
        const cid = h.capitulo_id || null;
        if (!grouped.has(cid)) grouped.set(cid, []);
        grouped.get(cid).push(h);
      }

      let text = '📚 Destacados — Mis Destacados\n\n';
      for (const [cid, items] of grouped) {
        const name = chapterName(cid) || 'Sin capítulo';
        text += '📖 ' + name + '\n';
        text += '─'.repeat(30) + '\n';
        for (const h of items) {
          text += '▸ "' + (h.texto_seleccionado || '').replace(/\n/g, ' ') + '"';
          if (h.nota) text += '\n  📝 ' + h.nota;
          text += '\n\n';
        }
      }

      await navigator.clipboard.writeText(text);
      toast.ok('Destacados copiados al portapapeles');
    } finally {
      setExporting(false);
    }
  }

  if (!visible) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      <div
        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md flex flex-col transition-transform duration-300 ease-out"
        style={{ transform: visible ? 'translateX(0)' : 'translateX(100%)' }}
      >
        <div
          className="flex-1 flex flex-col overflow-hidden rounded-l-2xl border-l border-foxBrown/15"
          style={{
            backgroundColor: 'var(--bg-surface)',
            boxShadow: '-8px 0 30px rgba(0,0,0,0.15)',
          }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-foxBrown/15">
            <div className="flex items-center gap-3">
              <span className="text-xl">🎯</span>
              <div>
                <h2 className="font-serif text-lg font-bold text-foxBrown">Destacados</h2>
                <p className="text-xs opacity-60">
                  {highlights.length} {highlights.length === 1 ? 'destacado' : 'destacados'}
                  {totalChapters > 0 && ' · ' + totalChapters + (totalChapters === 1 ? ' capítulo' : ' capítulos')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-foxBrown/10 transition-colors text-foxBrown opacity-70 hover:opacity-100"
              title="Cerrar"
            >
              ✕
            </button>
          </div>

          <div className="px-4 py-3 border-b border-foxBrown/10">
            <input
              type="text"
              className="rm-search text-sm"
              placeholder="Buscar en destacados..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-16 opacity-50">
                <div className="text-sm">Cargando destacados...</div>
              </div>
            ) : groupedHighlights.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-4xl mb-3 opacity-30">📑</div>
                <p className="text-sm opacity-60">
                  {search ? 'No se encontraron destacados para esa búsqueda' : 'Aún no tienes destacados en este libro'}
                </p>
                {!search && (
                  <p className="text-xs opacity-40 mt-1">Selecciona texto durante la lectura para crear uno</p>
                )}
              </div>
            ) : (
              groupedHighlights.map(([cid, items]) => (
                <div key={cid}>
                  <div className="flex items-center gap-2 mb-2 sticky top-0 py-1" style={{ backgroundColor: 'var(--bg-surface)', zIndex: 1 }}>
                    <span className="text-xs font-semibold opacity-70 uppercase tracking-wide">
                      {cid === '__unsorted' ? 'Sin capítulo' : (chapterName(cid) || 'Capítulo')}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-foxBrown/10 text-foxBrown font-medium">
                      {items.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {items.map(h => (
                      <div
                        key={h.id}
                        className="rm-card p-3 transition-all duration-200 hover:shadow-md"
                        style={{ borderLeft: '3px solid ' + (h.color || '#FBBF24') }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm leading-relaxed flex-1 italic opacity-85 line-clamp-4">
                            "{(h.texto_seleccionado || '').length > 120
                              ? h.texto_seleccionado.slice(0, 120) + '...'
                              : (h.texto_seleccionado || '')}"
                          </p>
                        </div>

                        {editingId === h.id ? (
                          <div className="mb-2">
                            <textarea
                              ref={noteInputRef}
                              className="input text-xs resize-none"
                              rows={2}
                              value={editingNote}
                              onChange={e => setEditingNote(e.target.value)}
                              onBlur={() => saveNote(h.id)}
                              onKeyDown={e => {
                                if (e.key === 'Escape') { setEditingId(null); setEditingNote(''); }
                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNote(h.id); }
                              }}
                              placeholder="Escribe una nota..."
                            />
                          </div>
                        ) : h.nota ? (
                          <div
                            className="mb-2 px-2 py-1.5 rounded text-xs bg-foxBrown/5 border border-foxBrown/10 cursor-pointer hover:bg-foxBrown/10 transition-colors group"
                            onClick={() => { setEditingId(h.id); setEditingNote(h.nota || ''); }}
                          >
                            <span className="opacity-60 font-medium">📝</span>{' '}
                            {h.nota}
                            <span className="opacity-0 group-hover:opacity-50 ml-1 text-[10px]">editar</span>
                          </div>
                        ) : (
                          <button
                            className="mb-2 text-xs opacity-40 hover:opacity-70 transition-opacity"
                            onClick={() => { setEditingId(h.id); setEditingNote(''); }}
                          >
                            + Agregar nota
                          </button>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {HIGHLIGHT_COLORS.map(c => (
                              <button
                                key={c.hex}
                                title={c.name}
                                className="w-5 h-5 rounded-full transition-all duration-150 hover:scale-125"
                                style={{
                                  backgroundColor: c.hex,
                                  boxShadow: h.color === c.hex
                                    ? '0 0 0 2px var(--bg-surface), 0 0 0 3.5px ' + c.hex
                                    : 'none',
                                  transform: h.color === c.hex ? 'scale(1.15)' : undefined,
                                }}
                                onClick={() => updateColor(h.id, c.hex)}
                              />
                            ))}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] opacity-40">
                              {h.created_at
                                ? new Date(h.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                                : ''}
                            </span>

                            {confirmDeleteId === h.id ? (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-red-500 font-medium">¿Eliminar?</span>
                                <button
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                                  onClick={() => deleteHighlight(h.id)}
                                >
                                  Sí
                                </button>
                                <button
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-foxBrown/10 text-foxBrown hover:bg-foxBrown/20 transition-colors"
                                  onClick={() => setConfirmDeleteId(null)}
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                className="text-xs opacity-30 hover:opacity-80 hover:text-red-500 transition-all"
                                title="Eliminar destacado"
                                onClick={() => setConfirmDeleteId(h.id)}
                              >
                                🗑
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {!loading && highlights.length > 0 && (
            <div className="px-4 py-3 border-t border-foxBrown/15">
              <button
                className="btn-primary w-full text-sm flex items-center justify-center gap-2"
                onClick={exportHighlights}
                disabled={exporting}
              >
                {exporting ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Copiando...
                  </>
                ) : (
                  <>
                    📋 Exportar todos los destacados
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function HighlightsToggle({ onClick, count }) {
  return (
    <button
      onClick={onClick}
      className="relative inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all hover:bg-foxBrown/10 text-foxBrown"
      title="Ver destacados"
    >
      <span className="text-base">🎯</span>
      <span className="hidden sm:inline">Destacados</span>
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 flex items-center justify-center text-[10px] font-bold rounded-full bg-foxBrown text-white leading-none"
              style={{ minWidth: '1.125rem', height: '1.125rem' }}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

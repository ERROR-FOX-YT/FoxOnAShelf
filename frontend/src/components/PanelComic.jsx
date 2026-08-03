import { useState, useCallback } from 'react';
import { apiBase } from '../api/client.js';
import { listUserImages } from '../api/userImages.js';
import ModalImagenes from './ModalImagenes.jsx';

export default function PanelComic({ paneles, onChange, autorId }) {
  const [modalImagenes, setModalImagenes] = useState(false);
  const [panelInsertar, setPanelInsertar] = useState(null);

  function agregarPanel() {
    const nuevos = [...(paneles || []), { id: 'panel_' + Date.now(), imagen: null, texto_burbuja: '', posicion_burbuja: 'abajo' }];
    onChange(nueves);
  }

  function eliminarPanel(index) {
    const nuevos = paneles.filter((_, i) => i !== index);
    onChange(nueves);
  }

  function actualizarPanel(index, campo, valor) {
    const nuevos = [...paneles];
    nuevos[index] = { ...nueves[index], [campo]: valor };
    onChange(nueves);
  }

  function moverPanel(index, direccion) {
    const nuevos = [...paneles];
    const nuevoIdx = index + direccion;
    if (nuevoIdx < 0 || nuevoIdx >= nuevos.length) return;
    [nuevos[index], nuevos[nuevoIdx]] = [nuevos[nuevoIdx], nuevos[index]];
    onChange(nueves);
  }

  const seleccionarImagen = useCallback((src) => {
    if (panelInsertar !== null) {
      actualizarPanel(panelInsertar, 'imagen', src);
    }
    setModalImagenes(false);
    setPanelInsertar(null);
  }, [panelInsertar, paneles]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif font-bold text-lg">Paneles del comic</h3>
        <button className="btn-primary text-sm" onClick={agregarPanel}>+ Panel</button>
      </div>

      <p className="text-xs opacity-60">
        Cada panel es una imagen a ancho completo (800px estándar webtoon). El espacio entre paneles controla el ritmo visual.
      </p>

      {(paneles || []).length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-foxBrown/20 rounded-lg">
          <div className="text-4xl opacity-30 mb-2">🖼</div>
          <p className="text-sm opacity-50">No hay paneles. Agrega el primero.</p>
        </div>
      )}

      <div className="space-y-3">
        {(paneles || []).map((panel, i) => (
          <div key={panel.id || i} className="border border-foxBrown/15 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold opacity-70">Panel {i + 1}</span>
              <div className="flex gap-1">
                <button onClick={() => moverPanel(i, -1)} disabled={i === 0}
                        className="text-xs px-1.5 py-0.5 rounded hover:bg-gray-100 disabled:opacity-30">↑</button>
                <button onClick={() => moverPanel(i, 1)} disabled={i === paneles.length - 1}
                        className="text-xs px-1.5 py-0.5 rounded hover:bg-gray-100 disabled:opacity-30">↓</button>
                <button onClick={() => eliminarPanel(i)}
                        className="text-xs px-1.5 py-0.5 rounded hover:bg-red-50 text-red-500">×</button>
              </div>
            </div>

            <div className="aspect-[8/5] bg-gray-100 dark:bg-gray-800 rounded overflow-hidden flex items-center justify-center">
              {panel.imagen ? (
                <img src={panel.imagen} alt={`Panel ${i + 1}`} className="w-full h-full object-contain" />
              ) : (
                <button onClick={() => { setPanelInsertar(i); setModalImagenes(true); }}
                        className="text-sm opacity-50 hover:opacity-80 px-4 py-2 border border-dashed border-gray-300 rounded">
                  Seleccionar imagen
                </button>
              )}
            </div>

            {panel.imagen && (
              <button onClick={() => { setPanelInsertar(i); setModalImagenes(true); }}
                      className="text-xs text-foxBrown hover:underline">
                Cambiar imagen
              </button>
            )}

            <label className="flex flex-col text-xs">
              <span className="opacity-60 mb-1">Texto de burbuja (opcional)</span>
              <textarea className="input text-xs min-h-[40px]" value={panel.texto_burbuja || ''}
                        onChange={e => actualizarPanel(i, 'texto_burbuja', e.target.value)}
                        placeholder="Texto que aparece sobre la imagen..." />
            </label>

            {panel.texto_burbuja && (
              <label className="flex items-center gap-2 text-xs">
                <span className="opacity-60">Posición burbuja:</span>
                <select className="input text-xs py-0.5 px-2" value={panel.posicion_burbuja || 'abajo'}
                        onChange={e => actualizarPanel(i, 'posicion_burbuja', e.target.value)}>
                  <option value="arriba">Arriba</option>
                  <option value="centro">Centro</option>
                  <option value="abajo">Abajo</option>
                </select>
              </label>
            )}
          </div>
        ))}
      </div>

      {modalImagenes && (
        <ModalImagenes
          autorId={autorId}
          onSelect={seleccionarImagen}
          onClose={() => { setModalImagenes(false); setPanelInsertar(null); }}
        />
      )}
    </div>
  );
}

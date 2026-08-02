import { useState, useEffect } from 'react';
import { api } from '../api/client.js';

export default function Changelog() {
  const [versions, setVersions] = useState([]);
  const [config, setConfig] = useState(null);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    api.get('/api/historiales/configuracion').then(r => { if (r && !r.__error) setConfig(r); }).catch(() => {});
    api.get('/api/historiales/frontend')
      .then(j => setVersions(j.versiones || []))
      .catch(() => {});
  }, []);

  return (
    <div className="page-bg max-w-3xl mx-auto px-4 py-10">
      <h1 className="font-serif text-3xl font-bold mb-1">Historial de versiones</h1>
      {config && (
        <p className="text-sm opacity-70 mb-8">
          Versión actual: <span className="font-bold text-accent-main">{config.version_actual}</span>
        </p>
      )}
      {!versions.length && (
        <p className="opacity-50 text-center py-10">No hay versiones registradas aún.</p>
      )}
      <div className="space-y-2">
        {versions.map((v, idx) => (
          <div key={v.version} className="card overflow-hidden">
            <button
              onClick={() => setOpen(open === idx ? null : idx)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <span className="font-mono font-bold text-accent-main shrink-0">{v.version}</span>
              <span className="text-xs opacity-60 shrink-0">{v.fecha}</span>
              {v.autor && <span className="text-xs opacity-50 italic shrink-0">por {v.autor}</span>}
              <span className="flex-1" />
              <span className={`shrink-0 transition-transform duration-200 ${open === idx ? 'rotate-90' : ''}`}>▸</span>
            </button>
            {open === idx && (
              <div className="px-4 pb-4 border-t border-black/10 dark:border-white/10 pt-3 animate-fadeIn space-y-3">
                {v.secciones?.map((sec, si) => (
                  <div key={si}>
                    <h3 className="font-bold text-sm mb-1 opacity-80">{sec.nombre}</h3>
                    <ul className="text-sm space-y-1 opacity-80 list-disc list-inside">
                      {sec.elementos.map((item, ii) => {
                        const hasBold = item.match(/^-\s*\*\*(.+?)\*\*/);
                        if (hasBold) {
                          const rest = item.slice(hasBold[0].length).replace(/^:\s*/, '');
                          return <li key={ii} className="text-sm"><strong>{hasBold[1]}</strong>{rest ? ': ' + rest : ''}</li>;
                        }
                        const clean = item.replace(/^- /, '').trim();
                        return <li key={ii} className="text-sm">{clean}</li>;
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

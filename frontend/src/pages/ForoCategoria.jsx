import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function ForoCategoria() {
  const { categoriaId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [categoria, setCategoria] = useState(null);
  const [hilos, setHilos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    document.body.classList.add('has-main-bg');
    return () => { document.body.classList.remove('has-main-bg'); };
  }, []);

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      const r = await api.get('/api/foros/' + categoriaId + '?page=' + pagina);
      if (!r.__error) {
        setCategoria(r.categoria || null);
        setHilos(r.hilos || []);
        setTotalPaginas(r.paginacion?.total_paginas || 1);
      } else {
        toast.error('Error al cargar la categoría');
        navigate('/foros');
      }
      setCargando(false);
    }
    cargar();
  }, [categoriaId, pagina]);

  async function crearHilo() {
    if (!titulo.trim() || !contenido.trim()) {
      toast.error('Completa título y contenido');
      return;
    }
    setEnviando(true);
    const r = await api.post('/api/foros', {
      categoria_id: categoriaId,
      titulo: titulo.trim(),
      contenido: contenido.trim()
    });
    setEnviando(false);
    if (!r.__error) {
      toast.ok('Hilo creado');
      setTitulo('');
      setContenido('');
      setMostrarForm(false);
      setPagina(1);
      const res = await api.get('/api/foros/' + categoriaId + '?page=1');
      if (!res.__error) {
        setHilos(res.hilos || []);
        setTotalPaginas(res.paginacion?.total_paginas || 1);
      }
    } else {
      toast.error(r.error || 'Error al crear el hilo');
    }
  }

  function ordenarHilos(lista) {
    return [...lista].sort((a, b) => {
      if (a.fijado && !b.fijado) return -1;
      if (!a.fijado && b.fijado) return 1;
      const fa = a.created_at ? new Date(a.created_at) : new Date(0);
      const fb = b.created_at ? new Date(b.created_at) : new Date(0);
      return fb - fa;
    });
  }

  return (
    <div className="page-bg max-w-4xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-2 text-xs opacity-60">
        <Link to="/foros" className="hover:underline">Foros</Link>
        <span>/</span>
        <span>{categoria?.nombre || 'Cargando...'}</span>
      </div>

      {cargando ? (
        <div className="space-y-3">
          <div className="animate-pulse rm-card p-5 space-y-3">
            <div className="h-6 bg-foxBrown/10 rounded w-1/3"></div>
            <div className="h-4 bg-foxBrown/10 rounded w-2/3"></div>
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse rm-card p-4 flex items-center gap-3">
              <div className="h-4 bg-foxBrown/10 rounded w-1/2"></div>
              <div className="h-3 bg-foxBrown/10 rounded w-1/4 ml-auto"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="rm-card p-5">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl shrink-0"
                   style={{ backgroundColor: 'rgba(var(--accent-main-rgb), 0.1)' }}>
                {categoria?.icono || '💬'}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-serif text-xl font-bold">{categoria?.nombre}</h1>
                <p className="text-sm opacity-60 mt-1">{categoria?.descripcion || 'Sin descripción'}</p>
              </div>
              {user && (
                <button
                  className="btn-primary text-sm shrink-0"
                  onClick={() => setMostrarForm(!mostrarForm)}
                >
                  {mostrarForm ? 'Cancelar' : '+ Nuevo hilo'}
                </button>
              )}
            </div>
          </div>

          {mostrarForm && (
            <div className="rm-card p-5 space-y-3">
              <h3 className="font-serif font-bold text-sm">Crear nuevo hilo</h3>
              <input
                className="input"
                placeholder="Título del hilo"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                maxLength={200}
              />
              <textarea
                className="input min-h-[120px]"
                placeholder="Contenido del hilo..."
                value={contenido}
                onChange={e => setContenido(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  className="btn-primary text-sm"
                  onClick={crearHilo}
                  disabled={enviando || !titulo.trim() || !contenido.trim()}
                >
                  {enviando ? 'Publicando...' : 'Publicar hilo'}
                </button>
                <button
                  className="btn-ghost text-sm"
                  onClick={() => { setMostrarForm(false); setTitulo(''); setContenido(''); }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {ordenarHilos(hilos).length === 0 ? (
              <div className="text-center py-10 opacity-50">
                <div className="text-3xl mb-2">📝</div>
                <p className="text-sm">No hay hilos en esta categoría.</p>
                {user && (
                  <button
                    className="btn-primary text-sm mt-3"
                    onClick={() => setMostrarForm(true)}
                  >
                    Crear el primer hilo
                  </button>
                )}
              </div>
            ) : (
              ordenarHilos(hilos).map(hilo => (
                <Link
                  key={hilo.id}
                  to={'/foros/hilos/' + hilo.id}
                  className="rm-card block p-4 hover:shadow-md transition-all hover:-translate-y-0.5"
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm truncate">{hilo.titulo}</h3>
                        {hilo.fijado && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-semibold shrink-0">
                            📌 Fijado
                          </span>
                        )}
                        {hilo.cerrado && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 font-semibold shrink-0">
                            🔒 Cerrado
                          </span>
                        )}
                      </div>
                      <div className="text-xs opacity-60 mt-1">
                        por {hilo.nombre_autor || 'Anónimo'} · {hilo.created_at ? new Date(hilo.created_at).toLocaleDateString() : ''}
                      </div>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <div className="text-xs opacity-50">
                        💬 {hilo.total_respuestas || 0}
                      </div>
                      <div className="text-xs opacity-50">
                        👁 {hilo.vistas || 0}
                      </div>
                      {hilo.ultima_actividad && (
                        <div className="text-[10px] opacity-40">
                          {new Date(hilo.ultima_actividad).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          {totalPaginas > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                className="btn-ghost text-xs px-3 py-1.5"
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={pagina === 1}
              >
                ← Anterior
              </button>
              <span className="text-xs opacity-60">
                Página {pagina} de {totalPaginas}
              </span>
              <button
                className="btn-ghost text-xs px-3 py-1.5"
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

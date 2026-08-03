import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Collection() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [coleccion, setColeccion] = useState(null);
  const [libros, setLibros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ titulo: '', descripcion: '', color: '#7B4B27' });

  useEffect(() => {
    cargar();
  }, [id]);

  async function cargar() {
    setCargando(true);
    const r = await api.get('/api/colecciones/' + id);
    if (r && !r.__error) {
      setColeccion(r.coleccion);
      setLibros(r.libros || []);
      setForm({
        titulo: r.coleccion.titulo || '',
        descripcion: r.coleccion.descripcion || '',
        color: r.coleccion.color || '#7B4B27'
      });
    }
    setCargando(false);
  }

  async function guardar() {
    const r = await api.put('/api/colecciones/' + id, form);
    if (r && r.__error) { toast.error('Error al guardar'); return; }
    setColeccion(r.coleccion);
    setEditando(false);
    toast.ok('Colección actualizada');
  }

  async function eliminarLibro(libroId) {
    const r = await api.del('/api/colecciones/' + id + '/libros/' + libroId);
    if (r && r.__error) { toast.error('Error al quitar libro'); return; }
    setLibros(prev => prev.filter(l => l.id !== libroId));
    toast.ok('Libro quitado de la colección');
  }

  const esPropietario = user && coleccion && user.id === coleccion.propietario_id;

  if (cargando) return (
    <div className="max-w-6xl mx-auto px-4 py-12 animate-pulse space-y-4">
      <div className="h-32 rounded-lg bg-foxBrown/10" />
      <div className="h-48 rounded-lg bg-foxBrown/5" />
    </div>
  );

  if (!coleccion) return (
    <div className="max-w-6xl mx-auto px-4 py-12 text-center">
      <div className="text-5xl opacity-40 mb-4">📚</div>
      <h2 className="font-serif text-xl font-bold text-foxBrown">Colección no encontrada</h2>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      {/* Header de la colección */}
      <header className="rm-card p-6" style={{ borderLeft: '4px solid ' + (coleccion.color || '#7B4B27') }}>
        {editando ? (
          <div className="space-y-3">
            <label className="flex flex-col text-sm">
              <span className="text-xs opacity-70 mb-1">Título</span>
              <input className="input" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} />
            </label>
            <label className="flex flex-col text-sm">
              <span className="text-xs opacity-70 mb-1">Descripción</span>
              <textarea className="input min-h-[60px]" value={form.descripcion}
                        onChange={e => setForm({...form, descripcion: e.target.value})} />
            </label>
            <label className="flex flex-col text-sm">
              <span className="text-xs opacity-70 mb-1">Color</span>
              <input type="color" value={form.color} className="w-10 h-8 rounded cursor-pointer"
                     onChange={e => setForm({...form, color: e.target.value})} />
            </label>
            <div className="flex gap-2">
              <button className="btn-primary text-sm" onClick={guardar}>Guardar</button>
              <button className="btn-ghost text-sm" onClick={() => setEditando(false)}>Cancelar</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="font-serif text-2xl sm:text-3xl font-bold" style={{ color: coleccion.color || '#7B4B27' }}>
                  {coleccion.titulo}
                </h1>
                {coleccion.descripcion && (
                  <p className="mt-2 opacity-70">{coleccion.descripcion}</p>
                )}
                <div className="text-xs opacity-50 mt-2">
                  por {coleccion.nombre_propietario} · {libros.length} libro{libros.length !== 1 ? 's' : ''}
                </div>
              </div>
              {esPropietario && (
                <button className="btn-ghost text-sm" onClick={() => setEditando(true)}>Editar</button>
              )}
            </div>
          </>
        )}
      </header>

      {/* Lista de libros */}
      {libros.length === 0 ? (
        <div className="text-center py-12 opacity-50">
          <div className="text-4xl mb-2">📚</div>
          <p className="text-sm">Esta colección no tiene libros aún.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {libros.map((libro, i) => (
            <Link key={libro.id} to={'/book/' + libro.id}
                  className="rm-card p-4 hover:shadow-md transition-shadow group">
              <div className="flex items-start gap-3">
                <span className="text-xs font-bold opacity-30 mt-1">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif font-bold text-foxBrown truncate group-hover:underline">
                    {libro.titulo || 'Sin título'}
                  </h3>
                  <div className="text-xs opacity-50 mt-1">
                    {libro.nombre_autor || 'Autor desconocido'}
                  </div>
                  {libro.descripcion && (
                    <p className="text-xs opacity-60 mt-2 line-clamp-2">{libro.descripcion}</p>
                  )}
                </div>
                {esPropietario && (
                  <button onClick={e => { e.preventDefault(); e.stopPropagation(); eliminarLibro(libro.id); }}
                          className="text-xs text-red-500 opacity-0 group-hover:opacity-100 transition-opacity px-1">
                    ×
                  </button>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

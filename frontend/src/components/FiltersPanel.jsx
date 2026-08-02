import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function FiltersPanel({ value = {}, onChange }) {
  const [categories, setCategories] = useState([]);
  const ages       = ['infantil', 'adolescente', 'adulto'];
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

  useEffect(() => {
    api.get('/api/categorias').then(r => !r.__error && setCategories(r.categorias || []));
  }, []);

  return (
    <div className="rm-card p-4 flex flex-wrap gap-3 text-sm">
      <label className="flex flex-col">
        <span className="opacity-70 text-xs mb-1">Categoría</span>
        <select className="input" value={value.categoria || ''}
                onChange={e => onChange({ ...value, categoria: e.target.value || undefined })}>
          <option value="">Todas</option>
          {categories.map(c => <option key={c} value={c}>{cap(c)}</option>)}
        </select>
      </label>
      <label className="flex flex-col">
        <span className="opacity-70 text-xs mb-1">Grupo de edad</span>
        <select className="input" value={value.grupo_edad || ''}
                onChange={e => onChange({ ...value, grupo_edad: e.target.value || undefined })}>
          <option value="">Todas</option>
          {ages.map(a => <option key={a} value={a}>{cap(a)}</option>)}
        </select>
      </label>
      <label className="flex flex-col flex-1 min-w-[200px]">
        <span className="opacity-70 text-xs mb-1">Buscar</span>
        <input className="rm-search" placeholder="título o descripción"
               value={value.q || ''}
               onChange={e => onChange({ ...value, q: e.target.value || undefined })} />
      </label>
    </div>
  );
}

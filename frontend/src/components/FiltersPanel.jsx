export default function FiltersPanel({ value, onChange }) {
  const categories = ['', 'fantasia', 'poesia', 'narrativa', 'educativa'];
  const ages       = ['', 'infantil', 'adolescente', 'adulto'];

  return (
    <div className="card p-4 flex flex-wrap gap-3 text-sm">
      <label className="flex flex-col">
        <span className="opacity-70 text-xs mb-1">Categoría</span>
        <select className="input" value={value.category || ''}
                onChange={e => onChange({ ...value, category: e.target.value || undefined })}>
          {categories.map(c => <option key={c} value={c}>{c || 'Todas'}</option>)}
        </select>
      </label>
      <label className="flex flex-col">
        <span className="opacity-70 text-xs mb-1">Grupo de edad</span>
        <select className="input" value={value.age_group || ''}
                onChange={e => onChange({ ...value, age_group: e.target.value || undefined })}>
          {ages.map(a => <option key={a} value={a}>{a || 'Todas'}</option>)}
        </select>
      </label>
      <label className="flex flex-col flex-1 min-w-[200px]">
        <span className="opacity-70 text-xs mb-1">Buscar</span>
        <input className="input" placeholder="título o descripción"
               value={value.q || ''}
               onChange={e => onChange({ ...value, q: e.target.value || undefined })} />
      </label>
    </div>
  );
}

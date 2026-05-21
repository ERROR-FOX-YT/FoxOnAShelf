import { useEffect, useState } from 'react';

/**
 * Notificaciones por polling cada 30s. En esta demo no hay backend de
 * notificaciones persistentes — el panel queda preparado para conectar.
 */
export default function NotificationsPanel() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const tick = () => setItems([]); // placeholder honesto
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="card p-3 text-sm">
      <div className="font-semibold mb-1">Notificaciones</div>
      {items.length === 0
        ? <div className="opacity-70">Sin notificaciones nuevas.</div>
        : <ul>{items.map(n => <li key={n.id}>{n.text}</li>)}</ul>}
    </div>
  );
}

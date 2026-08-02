import { useServerStatus } from '../context/ServerStatusContext.jsx';

export default function ServerBanner() {
  const { dbDown, lastChecked } = useServerStatus();
  if (!dbDown) return null;

  const time = lastChecked ? lastChecked.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className="server-down-banner" role="alert">
      <div className="server-down-banner__inner">
        <span className="server-down-banner__icon" aria-hidden="true">⚠️</span>
        <div className="server-down-banner__text">
          <strong>Sin acceso al servidor</strong>
          <span className="server-down-banner__sub">
            La base de datos está apagada. Los datos pueden no estar disponibles.{time && ` Última comprobación: ${time}.`}
          </span>
        </div>
        <span className="server-down-banner__pulse" aria-hidden="true" />
      </div>
    </div>
  );
}

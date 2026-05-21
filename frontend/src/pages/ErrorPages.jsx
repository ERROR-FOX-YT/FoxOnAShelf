import { Link, useNavigate } from 'react-router-dom';

function ErrorBase({ code, title, msg }) {
  const nav = useNavigate();
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="font-serif text-7xl font-bold text-bookedBrown">{code}</div>
      <h1 className="font-serif text-2xl font-bold mt-2">{title}</h1>
      <p className="opacity-80 mt-2">{msg}</p>
      <div className="mt-6 flex justify-center gap-2">
        <button className="btn-ghost" onClick={() => nav(-1)}>Reintentar</button>
        <Link className="btn-primary" to="/">Volver al inicio</Link>
      </div>
    </div>
  );
}

export const Error400 = () => <ErrorBase code="400" title="Solicitud inválida"
  msg="Algo en tu petición no estaba bien. Revisa los datos y vuelve a intentar." />;
export const Error404 = () => <ErrorBase code="404" title="Página no encontrada"
  msg="La ruta que buscas no existe (o el libro fue eliminado)." />;
export const Error500 = () => <ErrorBase code="500" title="Error del servidor"
  msg="Ocurrió un problema en el servidor. Espera unos segundos y reintenta." />;

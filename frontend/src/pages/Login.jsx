import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login, submitAppeal } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState(params.get('email') || '');
  const [password, setPassword] = useState('');
  const [banned, setBanned] = useState(null);
  const [appeal, setAppeal] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!email || !password) { toast.error('Completa email y contraseña'); return; }
    const r = await login(email, password);
    if (r.ok) navigate('/');
    else if (r.banned) setBanned(r);
    // si r.error: ya hubo toast
  }

  async function sendAppeal() {
    if (!appeal.trim()) { toast.error('Escribe tu apelación'); return; }
    const r = await submitAppeal(email, appeal);
    if (r.ok) { toast.ok('Apelación enviada'); setBanned({ ...banned, can_appeal: false }); }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className="font-serif text-2xl font-bold mb-4">Iniciar sesión</h1>
      <form onSubmit={submit} className="card p-6 space-y-3">
        <label className="block">
          <span className="text-xs opacity-70">Correo</span>
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs opacity-70">Contraseña</span>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </label>
        <button className="btn-primary w-full" type="submit">Entrar</button>
        <p className="text-sm opacity-70">
          ¿No tienes cuenta? <Link to="/register" className="underline">Regístrate</Link>
        </p>
      </form>

      {banned && (
        <div className="card p-4 mt-4 border-l-4 border-red-700">
          <div className="font-semibold">Cuenta baneada</div>
          <div className="text-sm opacity-80">Motivo: {banned.reason}</div>
          {banned.can_appeal ? (
            <>
              <p className="text-sm mt-2">Puedes enviar UNA apelación. Después no podrás volver a apelar.</p>
              <textarea className="input min-h-[80px] mt-2" value={appeal} onChange={e => setAppeal(e.target.value)} />
              <button className="btn-primary mt-2" onClick={sendAppeal}>Enviar apelación</button>
            </>
          ) : (
            <div className="text-sm opacity-80 mt-2">Tu apelación ya fue registrada.</div>
          )}
        </div>
      )}
    </div>
  );
}

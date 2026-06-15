import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useLockedBody } from '../hooks/useLockedBody.js';

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [eggError, setEggError] = useState('');
  const [locked, setLocked] = useState(false);
  const nameRef = useRef(null);
  const intervalRef = useRef(null);
  const clearEgg = useRef(null);

  useLockedBody(locked);

  useEffect(() => {
    return () => { clearInterval(intervalRef.current); clearTimeout(clearEgg.current); };
  }, []);

  async function submit(e) {
    e.preventDefault();
    setEggError('');
    if (!email || password.length < 6) { toast.error('Correo válido y contraseña ≥ 6'); return; }
    const r = await register(email, password, name);
    if (r.ok) navigate('/');
    else if (r.easter_egg) {
      setEggError(r.error);
      setLocked(true);
      nameRef.current?.focus();
      intervalRef.current = setInterval(() => {
        setName(prev => {
          if (!prev) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            clearEgg.current = setTimeout(() => { setEggError(''); setLocked(false); }, 400);
            return prev;
          }
          return prev.slice(0, -1);
        });
      }, 300);
    }
    else if (r.error) toast.error(r.error);
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className="font-serif text-2xl font-bold mb-4">Crear cuenta</h1>
      {eggError && (
        <div className="p-4 mb-4 rounded-lg text-center font-bold text-base border-2"
             style={{ animation: 'fadeInScale 0.25s ease-out',
               backgroundColor: 'var(--accent-main)', color: 'var(--bg-base)',
               borderColor: 'var(--accent-main)', boxShadow: 'var(--accent-glow-strong)' }}>
          🦊 {eggError}
        </div>
      )}
      <form onSubmit={submit} className={`card p-6 space-y-3 ${locked ? 'pointer-events-none select-none' : ''}`}>
        <label className="block">
          <span className="text-xs opacity-70">Nombre a mostrar</span>
          <input className={`input ${locked ? 'opacity-60' : ''}`} value={name}
                 onChange={e => setName(e.target.value)} ref={nameRef}
                 disabled={locked} />
        </label>
        <label className="block">
          <span className="text-xs opacity-70">Correo</span>
          <input className="input" type="email" value={email}
                 onChange={e => setEmail(e.target.value)} disabled={locked} />
        </label>
        <label className="block">
          <span className="text-xs opacity-70">Contraseña (mín. 6)</span>
          <input className="input" type="password" value={password}
                 onChange={e => setPassword(e.target.value)} disabled={locked} />
        </label>
        <button className="btn-primary w-full" type="submit" disabled={locked}>Registrarme</button>
        <p className="text-sm opacity-70">
          ¿Ya tienes cuenta? <Link to="/login" className="underline">Inicia sesión</Link>
        </p>
      </form>
    </div>
  );
}

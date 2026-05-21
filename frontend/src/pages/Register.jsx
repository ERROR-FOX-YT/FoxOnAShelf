import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!email || password.length < 6) { toast.error('Email válido y contraseña ≥ 6'); return; }
    const r = await register(email, password, name);
    if (r.ok) navigate('/');
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className="font-serif text-2xl font-bold mb-4">Crear cuenta</h1>
      <form onSubmit={submit} className="card p-6 space-y-3">
        <label className="block">
          <span className="text-xs opacity-70">Nombre a mostrar</span>
          <input className="input" value={name} onChange={e => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs opacity-70">Correo</span>
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs opacity-70">Contraseña (mín. 6)</span>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </label>
        <button className="btn-primary w-full" type="submit">Registrarme</button>
        <p className="text-sm opacity-70">
          ¿Ya tienes cuenta? <Link to="/login" className="underline">Inicia sesión</Link>
        </p>
      </form>
    </div>
  );
}

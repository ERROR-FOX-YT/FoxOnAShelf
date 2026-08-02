import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useLockedBody } from '../hooks/useLockedBody.js';

const PARTICLE_CONFIG = [...Array(20)].map((_, i) => ({
  id: i,
  left: (i * 37 + 13) % 100,
  delay: ((i * 7 + 2) % 15).toFixed(1),
  duration: (15 + ((i * 11) % 20)).toFixed(1),
  size: (2 + (i % 5)),
  opacity: (0.15 + ((i * 3) % 5) * 0.05).toFixed(2),
}));

export default function DualAuth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login, register, submitAppeal } = useAuth();
  const toast = useToast();
  const [active, setActive] = useState(null);
  const [mobileTab, setMobileTab] = useState('login');

  const [loginEmail, setLoginEmail] = useState(params.get('email') || '');
  const [loginPassword, setLoginPassword] = useState('');
  const [banned, setBanned] = useState(null);
  const [appeal, setAppeal] = useState('');

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [eggError, setEggError] = useState('');
  const [eggEmoji, setEggEmoji] = useState('🦊');
  const [locked, setLocked] = useState(false);
  const nameRef = useRef(null);
  const clearEgg = useRef(null);

  useLockedBody(locked);

  useEffect(() => {
    return () => { clearTimeout(clearEgg.current); };
  }, []);

  useEffect(() => {
    const urlEmail = params.get('email');
    if (urlEmail) { setLoginEmail(urlEmail); setActive('login'); }
  }, [params]);

  async function handleLogin(e) {
    e.preventDefault();
    if (!loginEmail || !loginPassword) { toast.error('Completa correo y contraseña'); return; }
    const r = await login(loginEmail, loginPassword);
    if (r.ok) navigate('/');
    else if (r.baneado) setBanned(r);
    else if (r.error) toast.error(r.error);
  }

  async function sendAppeal() {
    if (!appeal.trim()) { toast.error('Escribe tu apelación'); return; }
    const r = await submitAppeal(loginEmail, appeal);
    if (r.ok) { toast.ok('Apelación enviada. Espera la revisión de un administrador.'); setAppeal(''); setBanned({ ...banned, puede_apelar: false }); }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setEggError('');
    if (!regEmail || regPassword.length < 6) { toast.error('Correo válido y contraseña ≥ 6'); return; }
    const r = await register(regEmail, regPassword, regName);
    if (r.ok) navigate('/');
    else if (r.huevo_pascua) {
      setEggError(r.error);
      setEggEmoji(r.emoji || '🦊');
      setRegName('');
      setLocked(true);
      clearEgg.current = setTimeout(() => { setEggError(''); setLocked(false); }, 3000);
    }
    else if (r.error) toast.error(r.error);
  }

  const isActive = (card) => active === card;
  const isInactive = (card) => active !== null && active !== card;

  return (
    <div className={`da-page ${eggError ? 'da-page--egg-active' : ''}`}>
      <div className="da-particles" aria-hidden="true">
        {PARTICLE_CONFIG.map(p => (
          <div key={p.id} className="da-particle" style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
          }} />
        ))}
      </div>

      <div className="da-orb da-orb--1" aria-hidden="true" />
      <div className="da-orb da-orb--2" aria-hidden="true" />
      <div className="da-orb da-orb--3" aria-hidden="true" />

      <div className="da-container">

        {/* Welcome header */}
        <div className="da-welcome">
          <div className="da-welcome__icon">📚</div>
          <h1 className="da-welcome__title">FoxOnAShelf</h1>
          <p className="da-welcome__tagline">Únete a la comunidad lectora</p>
        </div>

        {/* Mobile tab bar */}
        <div className="da-mobile-tabs">
          <button
            className={`da-mobile-tab ${mobileTab === 'login' ? 'da-mobile-tab--active' : ''}`}
            onClick={() => setMobileTab('login')}
          >
            <span className="da-mobile-tab__icon">🔑</span>
            Iniciar sesión
          </button>
          <button
            className={`da-mobile-tab ${mobileTab === 'register' ? 'da-mobile-tab--active' : ''}`}
            onClick={() => setMobileTab('register')}
          >
            <span className="da-mobile-tab__icon">✨</span>
            Crear cuenta
          </button>
        </div>

        {/* Panels container */}
        <div className="da-panels">
          {/* Login panel */}
          <div
            onMouseEnter={() => !locked && setActive('login')}
            onMouseLeave={() => setActive(null)}
            className={`da-panel da-panel--login ${mobileTab === 'login' ? 'da-panel--mobile-visible' : 'da-panel--mobile-hidden'}`}
            style={{
              transform: isActive('login') ? 'scale(1.03) translateY(-4px)' : 'scale(0.98)',
              opacity: isActive('login') ? 1 : active === null ? 0.7 : 0.45,
              filter: isActive('login') ? 'none' : 'grayscale(30%)',
              zIndex: isActive('login') ? 10 : 1,
            }}
          >
            <div className="da-card-header">
              <div className="da-card-header__icon">🔑</div>
              <h2 className="da-card-header__title">Iniciar sesión</h2>
            </div>

            <form onSubmit={handleLogin} className="da-form" onClick={e => e.stopPropagation()}>
              <div className="da-field">
                <label className="da-label-static">Correo</label>
                <input className="da-input" type="email" value={loginEmail}
                       onChange={e => setLoginEmail(e.target.value)} disabled={locked} required placeholder="tu@correo.com" />
              </div>
              <div className="da-field">
                <label className="da-label-static">Contraseña</label>
                <input className="da-input" type="password" value={loginPassword}
                       onChange={e => setLoginPassword(e.target.value)} disabled={locked} required placeholder="••••••••" />
              </div>
              <button className="da-btn" type="submit" disabled={locked}>
                <span>Entrar</span>
                <svg className="da-btn__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </form>

            {banned && (
              <div className="da-banned">
                <div className="da-banned__title">Cuenta baneada</div>
                <div className="da-banned__reason">Motivo: {banned.motivo}</div>
                {banned.puede_apelar && (
                  <div className="da-banned__appeal" onClick={e => e.stopPropagation()}>
                    <textarea className="da-textarea" value={appeal}
                              onChange={e => setAppeal(e.target.value)} placeholder="Escribe tu apelación..." />
                    <button className="da-btn da-btn--small" onClick={sendAppeal}>Enviar apelación</button>
                  </div>
                )}
              </div>
            )}

            <p className="da-hint da-hint--desktop">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/>
              </svg>
              ¿No tienes cuenta? Regístrate al lado
            </p>
          </div>

          {/* Desktop divider */}
          <div className="da-divider" aria-hidden="true">
            <div className="da-divider__line" />
            <div className="da-divider__badge">o</div>
            <div className="da-divider__line" />
          </div>

          {/* Register panel */}
          <div
            onMouseEnter={() => !locked && setActive('register')}
            onMouseLeave={() => setActive(null)}
            className={`da-panel da-panel--register ${mobileTab === 'register' ? 'da-panel--mobile-visible' : 'da-panel--mobile-hidden'}`}
            style={{
              transform: isActive('register') ? 'scale(1.03) translateY(-4px)' : 'scale(0.98)',
              opacity: isActive('register') ? 1 : active === null ? 0.7 : 0.45,
              filter: isActive('register') ? 'none' : 'grayscale(30%)',
              zIndex: isActive('register') ? 10 : 1,
            }}
          >
            <div className="da-card-header">
              <div className="da-card-header__icon">✨</div>
              <h2 className="da-card-header__title">Crear cuenta</h2>
            </div>

            <form onSubmit={handleRegister}
                  className={`da-form ${locked ? 'da-form--locked' : ''}`}
                  onClick={e => e.stopPropagation()}>
              <div className="da-field">
                <label className="da-label-static">Nombre a mostrar</label>
                <input className="da-input" value={regName}
                       onChange={e => setRegName(e.target.value)} ref={nameRef} disabled={locked} placeholder="Tu apodo" />
              </div>
              <div className="da-field">
                <label className="da-label-static">Correo</label>
                <input className="da-input" type="email" value={regEmail}
                       onChange={e => setRegEmail(e.target.value)} disabled={locked} required placeholder="tu@correo.com" />
              </div>
              <div className="da-field">
                <label className="da-label-static">Contraseña (mín. 6)</label>
                <input className="da-input" type="password" value={regPassword}
                       onChange={e => setRegPassword(e.target.value)} disabled={locked} required placeholder="••••••••" />
              </div>
              <button className="da-btn" type="submit" disabled={locked}>
                <span>Crear cuenta</span>
                <svg className="da-btn__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </form>

            <p className="da-hint da-hint--desktop">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/>
              </svg>
              ¿Ya tienes cuenta? Inicia sesión al lado
            </p>
          </div>
        </div>

      </div>

      {eggError && (
        <div className="da-egg-overlay">
          <div className="da-egg-backdrop" />
          <div className="da-egg-content">
            <div className="da-egg-icon">{eggEmoji}</div>
            <div className="da-egg-text">{eggError}</div>
            <div className="da-egg-sub">Este nombre es exclusivo de un administrador.</div>
          </div>
          <div className="da-egg-scanlines" />
        </div>
      )}

      <style>{`
        /* ============================================================
           DUAL AUTH — Split View + Glassmorphism
           ============================================================ */
        .da-page {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          overflow: hidden;
          background:
            radial-gradient(ellipse at 20% 50%, rgba(var(--accent-main-rgb), 0.05) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 50%, rgba(var(--accent-secondary-rgb), 0.05) 0%, transparent 50%);
        }

        /* --- Animated gradient orbs --- */
        .da-orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.3;
          pointer-events: none;
          animation: da-orbFloat 20s ease-in-out infinite;
        }
        .da-orb--1 {
          width: 400px;
          height: 400px;
          background: var(--accent-main);
          top: -10%;
          left: -5%;
          animation-delay: 0s;
        }
        .da-orb--2 {
          width: 350px;
          height: 350px;
          background: var(--accent-secondary);
          bottom: -10%;
          right: -5%;
          animation-delay: -7s;
        }
        .da-orb--3 {
          width: 250px;
          height: 250px;
          background: var(--accent-main);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation-delay: -14s;
          opacity: 0.15;
        }
        @keyframes da-orbFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(30px, -40px) scale(1.05); }
          50% { transform: translate(-20px, 20px) scale(0.95); }
          75% { transform: translate(40px, 30px) scale(1.03); }
        }

        /* --- Floating particles --- */
        .da-particles {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }
        .da-particle {
          position: absolute;
          bottom: -10px;
          background: var(--accent-main);
          border-radius: 50%;
          animation: da-particleRise linear infinite;
        }
        @keyframes da-particleRise {
          0% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0;
          }
          10% {
            opacity: 0.3;
          }
          50% {
            transform: translateY(-50vh) translateX(30px) scale(0.8);
          }
          90% {
            opacity: 0.1;
          }
          100% {
            transform: translateY(-100vh) translateX(-20px) scale(0.5);
            opacity: 0;
          }
        }

        /* --- Container --- */
        .da-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          width: 100%;
          max-width: 64rem;
          position: relative;
          z-index: 1;
        }

        /* --- Welcome header --- */
        .da-welcome {
          text-align: center;
          margin-bottom: 0.5rem;
        }
        .da-welcome__icon {
          font-size: 2.5rem;
          margin-bottom: 0.25rem;
          filter: drop-shadow(0 2px 8px rgba(var(--accent-main-rgb), 0.3));
        }
        .da-welcome__title {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 2.2rem;
          font-weight: 800;
          color: var(--text-main);
          letter-spacing: -0.02em;
          margin: 0;
        }
        .da-welcome__tagline {
          font-size: 1rem;
          color: var(--text-muted);
          margin-top: 0.25rem;
        }

        /* --- Mobile tabs --- */
        .da-mobile-tabs {
          display: none;
          width: 100%;
          gap: 0.5rem;
          background: rgba(var(--accent-main-rgb), 0.06);
          border-radius: 14px;
          padding: 0.35rem;
        }
        .da-mobile-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0.7rem 0.5rem;
          border: none;
          border-radius: 10px;
          background: transparent;
          color: var(--text-muted);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .da-mobile-tab--active {
          background: rgba(255, 255, 255, 0.85);
          color: var(--text-main);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }
        .dark .da-mobile-tab--active {
          background: rgba(255, 255, 255, 0.1);
        }
        .da-mobile-tab__icon {
          font-size: 1rem;
        }

        /* --- Panels container --- */
        .da-panels {
          display: flex;
          align-items: stretch;
          justify-content: center;
          gap: 0;
          width: 100%;
        }

        /* --- Panel (card) --- */
        .da-panel {
          flex: 1;
          max-width: 50%;
          padding: 2rem 2.25rem;
          border-radius: 20px;
          background: rgba(var(--accent-main-rgb), 0.03);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(var(--accent-main-rgb), 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05),
                      0 2px 8px rgba(0, 0, 0, 0.03),
                      inset 0 1px 0 rgba(255, 255, 255, 0.1);
          transition: transform 0.5s cubic-bezier(0.23, 1, 0.32, 1),
                      opacity 0.5s ease,
                      filter 0.5s ease,
                      background 0.5s ease,
                      box-shadow 0.5s ease,
                      border-color 0.5s ease;
          cursor: default;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .da-panel--login {
          border-radius: 20px 0 0 20px;
          border-right: none;
        }
        .da-panel--register {
          border-radius: 0 20px 20px 0;
          border-left: 1px solid rgba(var(--accent-main-rgb), 0.1);
        }
        .da-panel::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          background: linear-gradient(135deg, var(--accent-main), var(--accent-secondary));
          opacity: 0;
          transition: opacity 0.5s ease;
          z-index: -1;
          filter: blur(12px);
        }
        .da-panel:hover::before {
          opacity: 0.15;
        }
        .dark .da-panel {
          background: rgba(255, 255, 255, 0.02);
          border-color: rgba(255, 255, 255, 0.05);
        }
        .dark .da-panel--register {
          border-left-color: rgba(255, 255, 255, 0.05);
        }

        /* --- Card header --- */
        .da-card-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.75rem;
          padding-bottom: 1.25rem;
          border-bottom: 1px solid rgba(var(--accent-main-rgb), 0.08);
        }
        .da-card-header__icon {
          font-size: 1.6rem;
          width: 3rem;
          height: 3rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: rgba(var(--accent-main-rgb), 0.08);
          flex-shrink: 0;
          transition: transform 0.3s ease;
        }
        .da-panel:hover .da-card-header__icon {
          transform: scale(1.08) rotate(-5deg);
        }
        .da-card-header__title {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
          color: var(--text-main);
        }

        /* --- Form --- */
        .da-form {
          display: flex;
          flex-direction: column;
          gap: 1.3rem;
          flex: 1;
        }
        .da-form--locked {
          pointer-events: none;
          user-select: none;
          opacity: 0.6;
        }

        /* --- Static label --- */
        .da-label-static {
          display: block;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 0.35rem;
          transition: color 0.3s ease;
        }
        .da-field:focus-within .da-label-static {
          color: var(--accent-main);
        }

        /* --- Input --- */
        .da-input {
          width: 100%;
          padding: 0.75rem 0.85rem;
          border: 1.5px solid var(--border-subtle);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.5);
          color: var(--text-main);
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
        }
        .dark .da-input {
          background: rgba(0, 0, 0, 0.2);
        }
        .da-input:focus {
          border-color: var(--accent-main);
          box-shadow: 0 0 0 3px rgba(var(--accent-main-rgb), 0.18);
        }
        .da-input::placeholder {
          color: var(--text-muted);
          opacity: 0.5;
        }

        /* --- Button --- */
        .da-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.85rem 1.5rem;
          margin-top: 0.5rem;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--accent-main), var(--accent-main-ink));
          color: var(--bg-base);
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
          box-shadow: 0 4px 16px rgba(var(--accent-main-rgb), 0.3);
        }
        .da-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(var(--accent-main-rgb), 0.4);
          filter: brightness(1.08);
        }
        .da-btn:active:not(:disabled) {
          transform: translateY(0) scale(0.98);
        }
        .da-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .da-btn__arrow {
          width: 18px;
          height: 18px;
          transition: transform 0.3s ease;
        }
        .da-btn:hover:not(:disabled) .da-btn__arrow {
          transform: translateX(4px);
        }
        .da-btn--small {
          padding: 0.5rem 1rem;
          font-size: 0.8rem;
          border-radius: 8px;
        }

        /* --- Hint text --- */
        .da-hint {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          margin-top: 1.2rem;
          font-size: 0.8rem;
          color: var(--text-muted);
          opacity: 0.7;
          transition: opacity 0.3s ease;
        }
        .da-hint:hover {
          opacity: 1;
        }
        .da-hint--desktop {
          display: flex;
        }

        /* --- Divider between panels (desktop) --- */
        .da-divider {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 2rem 0;
          flex-shrink: 0;
        }
        .da-divider__line {
          width: 1px;
          flex: 1;
          background: linear-gradient(to bottom, transparent, rgba(var(--accent-main-rgb), 0.2), transparent);
        }
        .da-divider__badge {
          width: 2.2rem;
          height: 2.2rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-muted);
          background: rgba(var(--accent-main-rgb), 0.08);
          border: 1px solid rgba(var(--accent-main-rgb), 0.15);
          flex-shrink: 0;
        }

        /* --- Banned message --- */
        .da-banned {
          margin-top: 1rem;
          padding: 0.75rem;
          border-radius: 10px;
          border-left: 3px solid #ef4444;
          background: rgba(239, 68, 68, 0.08);
          font-size: 0.85rem;
        }
        .da-banned__title {
          font-weight: 600;
          font-size: 0.9rem;
        }
        .da-banned__reason {
          font-size: 0.8rem;
          opacity: 0.8;
          margin-top: 0.2rem;
        }
        .da-banned__appeal {
          margin-top: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .da-textarea {
          width: 100%;
          min-height: 60px;
          padding: 0.5rem;
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.5);
          color: var(--text-main);
          font-size: 0.8rem;
          resize: vertical;
          outline: none;
        }
        .da-textarea:focus {
          border-color: var(--accent-main);
          box-shadow: 0 0 0 3px rgba(var(--accent-main-rgb), 0.15);
        }

        /* --- Easter egg overlay --- */
        .da-egg-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: da-eggFadeIn 0.4s ease-out;
        }
        .da-egg-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .da-egg-content {
          position: relative;
          z-index: 2;
          text-align: center;
          padding: 3rem 4rem;
          border-radius: 20px;
          background: linear-gradient(135deg, var(--bg-surface), rgba(var(--accent-secondary-rgb), 0.1));
          border: 2px solid var(--accent-secondary);
          box-shadow: 0 0 60px rgba(var(--accent-secondary-rgb), 0.4),
                      0 0 120px rgba(var(--accent-secondary-rgb), 0.15),
                      inset 0 0 40px rgba(var(--accent-secondary-rgb), 0.05);
          animation: da-eggPulseStrong 1.5s ease-in-out infinite alternate;
          max-width: 28rem;
        }
        .da-egg-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          animation: da-eggBounce 0.6s cubic-bezier(.34,1.56,.64,1) both;
          filter: drop-shadow(0 0 20px rgba(var(--accent-secondary-rgb), 0.5));
        }
        .da-egg-text {
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--accent-secondary);
          margin-bottom: 0.5rem;
          letter-spacing: 0.02em;
        }
        .da-egg-sub {
          font-size: 0.85rem;
          color: var(--text-muted);
          opacity: 0.8;
        }
        .da-egg-scanlines {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.03) 2px,
            rgba(0, 0, 0, 0.03) 4px
          );
          opacity: 0.5;
        }
        @keyframes da-eggFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes da-eggPulseStrong {
          0% { box-shadow: 0 0 60px rgba(var(--accent-secondary-rgb), 0.4), 0 0 120px rgba(var(--accent-secondary-rgb), 0.15); }
          100% { box-shadow: 0 0 80px rgba(var(--accent-secondary-rgb), 0.6), 0 0 160px rgba(var(--accent-secondary-rgb), 0.25); }
        }
        @keyframes da-eggBounce {
          0% { transform: scale(0) rotate(-20deg); }
          60% { transform: scale(1.2) rotate(5deg); }
          100% { transform: scale(1) rotate(0deg); }
        }

        /* --- Easter egg: dim both panels when active --- */
        .da-page--egg-active .da-panel {
          filter: grayscale(60%) brightness(0.6) !important;
          opacity: 0.3 !important;
        }

        /* --- Responsive: mobile (stacked) --- */
        @media (max-width: 768px) {
          .da-container {
            max-width: 28rem;
          }
          .da-mobile-tabs {
            display: flex;
          }
          .da-panels {
            flex-direction: column;
            gap: 0;
          }
          .da-panel {
            max-width: 100%;
            border-radius: 20px;
            padding: 1.75rem 1.5rem;
          }
          .da-panel--login {
            border-radius: 20px 20px 0 0;
            border-right: 1px solid rgba(var(--accent-main-rgb), 0.1);
            border-bottom: none;
          }
          .da-panel--register {
            border-radius: 0 0 20px 20px;
            border-left: 1px solid rgba(var(--accent-main-rgb), 0.1);
            border-top: 1px solid rgba(var(--accent-main-rgb), 0.08);
          }
          .da-panel--mobile-hidden {
            display: none;
          }
          .da-divider {
            display: none;
          }
          .da-hint--desktop {
            display: none;
          }
          .da-welcome__title {
            font-size: 1.8rem;
          }
          .da-orb--1 { width: 250px; height: 250px; }
          .da-orb--2 { width: 200px; height: 200px; }
          .da-orb--3 { display: none; }
        }
      `}</style>
    </div>
  );
}

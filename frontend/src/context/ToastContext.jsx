import { createContext, useContext, useState, useCallback } from 'react';

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((kind, msg, ttl = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, kind, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), ttl);
  }, []);

  const api = {
    ok:    (m, ttl) => push('ok', m, ttl),
    error: (m, ttl) => push('err', m, ttl),
    info:  (m, ttl) => push('info', m, ttl)
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id}
               className={
                 t.kind === 'ok'    ? 'toast-ok' :
                 t.kind === 'err'   ? 'toast-err' :
                                      'toast-info'
               }
               style={{ position: 'static' }}>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

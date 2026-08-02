import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setServerDown } from '../api/client.js';

const ServerStatusCtx = createContext(null);

const POLL_MS = 10000;

export function ServerStatusProvider({ children }) {
  const [dbDown, setDbDown] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  const check = useCallback(async () => {
    try {
      const res = await fetch('/api/salud', { headers: { 'abypass-tunnel-reminder': 'true' } });
      const json = await res.json().catch(() => ({}));
      const down = !json.ok || json.db === 'down';
      setDbDown(down);
      setLastChecked(new Date());
      setServerDown(down);
    } catch {
      setDbDown(true);
      setLastChecked(new Date());
      setServerDown(true);
    }
  }, []);

  useEffect(() => {
    check();
    const timer = setInterval(check, POLL_MS);
    return () => clearInterval(timer);
  }, [check]);

  return (
    <ServerStatusCtx.Provider value={{ dbDown, lastChecked }}>
      {children}
    </ServerStatusCtx.Provider>
  );
}

export const useServerStatus = () => useContext(ServerStatusCtx);

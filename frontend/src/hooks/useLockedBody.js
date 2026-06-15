import { useEffect } from 'react';

export function useLockedBody(locked) {
  useEffect(() => {
    document.body.classList.toggle('egg-locked', locked);
    return () => document.body.classList.remove('egg-locked');
  }, [locked]);
}

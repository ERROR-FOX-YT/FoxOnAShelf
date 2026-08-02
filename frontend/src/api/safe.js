import { apiBase } from './client';

export function safeUrl(url) {
  if (!url) return '';
  try {
    const base = (url.startsWith('/') && apiBase()) || window.location.origin;
    const u = new URL(url, base);
    const protocol = u.protocol.toLowerCase();
    if (['http:', 'https:', 'ftp:', 'data:', 'blob:'].includes(protocol)) return u.href;
    return '';
  } catch { return ''; }
}

export function safeUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url, window.location.origin);
    const protocol = u.protocol.toLowerCase();
    if (['http:', 'https:', 'ftp:', 'data:', 'blob:'].includes(protocol)) return u.href;
    return '';
  } catch { return ''; }
}

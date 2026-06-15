export const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export function imgUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (API_BASE && path.startsWith('/')) return API_BASE + path;
  return path;
}

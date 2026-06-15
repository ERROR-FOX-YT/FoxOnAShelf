import { api } from './client.js';

export async function listUserImages() {
  const r = await api.get('/api/user-images');
  if (r && r.__error) return [];
  return r.images || [];
}

export async function uploadUserImage(file, customName) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('custom_name', customName);
  const r = await api.form('/api/user-images', fd);
  if (r && r.__error) return null;
  return r.image || null;
}

export async function updateUserImage(id, body) {
  const r = await api.put('/api/user-images/' + id, body);
  return !(r && r.__error);
}

export async function deleteUserImage(id) {
  const r = await api.del('/api/user-images/' + id);
  return !(r && r.__error);
}

export function resolveImageUrl(authorId, name) {
  return '/api/user-images/resolve/' + encodeURIComponent(authorId) + '/' + encodeURIComponent(name);
}

export async function listBookImages(bookId) {
  const r = await api.get('/api/books/' + bookId + '/images');
  if (r && r.__error) return [];
  return r.images || [];
}

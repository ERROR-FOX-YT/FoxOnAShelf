import { api } from './client.js';

export async function listUserImages() {
  const r = await api.get('/api/imagenes-usuario');
  if (r && r.__error) return [];
  return r.imagenes || [];
}

export async function uploadUserImage(file, nombre_personalizado) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('nombre_personalizado', nombre_personalizado);
  const r = await api.form('/api/imagenes-usuario', fd);
  if (r && r.__error) return null;
  return r.image || null;
}

export async function updateUserImage(id, body) {
  const r = await api.put('/api/imagenes-usuario/' + id, body);
  return !(r && r.__error);
}

export async function deleteUserImage(id) {
  const r = await api.del('/api/imagenes-usuario/' + id);
  return !(r && r.__error);
}

export async function listBookImages(bookId) {
  const r = await api.get('/api/libros/' + bookId + '/imagenes');
  if (r && r.__error) return [];
  return r.imagenes || [];
}
